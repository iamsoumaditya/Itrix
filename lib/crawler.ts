import * as cheerio from "cheerio";
import { db } from "./db";
import { docsPages, docsContent, docsEmbeddings } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { indexDocsContent } from "./embeddings";
import { checkRobotsAllowed } from "./url-utils";

interface CrawlResult {
  success: boolean;
  pageCount: number;
  error?: string;
}

export async function crawlDocsPage(
  pageId: string,
  companyId: string,
  startUrl: string
): Promise<CrawlResult> {
  // Helper to safely fail and update DB row with explicit error_message
  async function markFailed(reason: string): Promise<CrawlResult> {
    console.error(`Crawl failed for page ${pageId} (${startUrl}): ${reason}`);
    
    // Clean up any partially inserted content/embeddings to prevent orphan rows
    try {
      const existingContent = await db
        .select({ id: docsContent.id })
        .from(docsContent)
        .where(eq(docsContent.docsPageId, pageId));

      if (existingContent.length > 0) {
        for (const c of existingContent) {
          await db.delete(docsEmbeddings).where(eq(docsEmbeddings.docsContentId, c.id));
        }
        await db.delete(docsContent).where(eq(docsContent.docsPageId, pageId));
      }
    } catch (cleanErr) {
      console.warn("Error cleaning up partial content during failure handling:", cleanErr);
    }

    await db
      .update(docsPages)
      .set({
        status: "failed",
        errorMessage: reason,
      })
      .where(eq(docsPages.id, pageId));

    return { success: false, pageCount: 0, error: reason };
  }

  try {
    // ===========================================
    // STEP 1: CRAWLING (Fetch & Parse validation)
    // ===========================================
    await db
      .update(docsPages)
      .set({ status: "crawling", errorMessage: null })
      .where(eq(docsPages.id, pageId));

    // Check robots.txt first
    const allowed = await checkRobotsAllowed(startUrl);
    if (!allowed) {
      return await markFailed(
        "This page's robots.txt does not allow crawling. Please use a publicly crawlable docs URL."
      );
    }

    const baseUrlObj = new URL(startUrl);
    const origin = baseUrlObj.origin;
    const visitedUrls = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 1 }];
    const crawledPagesData: { pageUrl: string; sectionTitle: string; contentText: string }[] = [];

    const MAX_PAGES = 15;
    const MAX_DEPTH = 2;

    // Test fetch of the start URL to detect network/HTTP status failures early
    let startRes: Response;
    try {
      startRes = await fetch(startUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SupportTicketTriageBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
    } catch (fetchErr: any) {
      const isRedirectError =
        String(fetchErr?.message || "").toLowerCase().includes("redirect") ||
        String(fetchErr?.cause || "").toLowerCase().includes("redirect");

      if (isRedirectError) {
        return await markFailed(
          "Could not reach this URL. It is behind an authentication portal or redirect loop (e.g. Clerk login)."
        );
      }

      return await markFailed(
        "Could not reach this URL. Please check the link and try again."
      );
    }

    if (!startRes.ok) {
      return await markFailed(
        `This page returned an error (status ${startRes.status}). It may be private, moved, or blocked from crawling.`
      );
    }

    const startContentType = (startRes.headers.get("content-type") || "").toLowerCase();
    if (
      startContentType &&
      !startContentType.includes("text/html") &&
      !startContentType.includes("application/xhtml") &&
      !startContentType.includes("text/plain")
    ) {
      return await markFailed(
        "No readable text content was found on this page. It may be JavaScript-rendered, image-only, or behind a login."
      );
    }

    // ===========================================
    // STEP 2: EXTRACTING (Cleaning & Content validation)
    // ===========================================
    await db
      .update(docsPages)
      .set({ status: "extracting" })
      .where(eq(docsPages.id, pageId));

    while (queue.length > 0 && visitedUrls.size < MAX_PAGES) {
      const current = queue.shift();
      if (!current) break;

      const { url, depth } = current;
      if (visitedUrls.has(url)) continue;
      visitedUrls.add(url);

      try {
        let res: Response;
        if (url === startUrl && startRes) {
          res = startRes;
        } else {
          res = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SupportTicketTriageBot/1.0",
              Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(8000),
          });
        }

        if (!res.ok) continue;

        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        if (
          contentType &&
          !contentType.includes("text/html") &&
          !contentType.includes("application/xhtml") &&
          !contentType.includes("text/plain")
        ) {
          continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Remove unneeded boilerplate elements and raw code blocks
        $(
          "script, style, svg, iframe, nav, footer, header, noscript, code, pre, kbd, samp"
        ).remove();

        const pageTitle =
          $("title").text().trim() ||
          $("h1").first().text().trim() ||
          "Documentation Page";

        // Extract main readable prose text content via block elements
        const container = $("main, article, body").first();
        const blockTexts: string[] = [];
        container.find("h1, h2, h3, h4, h5, h6, p, li, td, th").each((_, el) => {
          const t = $(el)
            .text()
            .replace(/[^\x20-\x7E\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (t.length > 0) {
            blockTexts.push(t);
          }
        });

        let bodyText = blockTexts.join("\n\n");
        if (!bodyText) {
          bodyText = container
            .text()
            .replace(/[^\x20-\x7E\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }

        if (bodyText.length >= 50) {
          crawledPagesData.push({
            pageUrl: url,
            sectionTitle: pageTitle,
            contentText: bodyText.slice(0, 20000), // Cap max length per page
          });
        }

        // Discover internal links if depth < MAX_DEPTH
        if (depth < MAX_DEPTH) {
          $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;
            try {
              const fullUrlObj = new URL(href, url);
              fullUrlObj.hash = ""; // Strip fragment
              const fullUrl = fullUrlObj.toString();

              if (
                fullUrlObj.origin === origin &&
                !visitedUrls.has(fullUrl) &&
                !fullUrl.match(/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js)$/i)
              ) {
                queue.push({ url: fullUrl, depth: depth + 1 });
              }
            } catch {
              // Ignore invalid link URLs
            }
          });
        }
      } catch (err) {
        console.warn(`Warning crawling sub-page ${url}:`, err);
      }
    }

    // Validate extracted text content
    const totalExtractedLength = crawledPagesData.reduce(
      (sum, item) => sum + item.contentText.trim().length,
      0
    );

    if (crawledPagesData.length === 0 || totalExtractedLength < 50) {
      return await markFailed(
        "No readable text content was found on this page. It may be JavaScript-rendered, image-only, or behind a login."
      );
    }

    // ===========================================
    // STEP 3: EMBEDDING (Vector Indexing)
    // ===========================================
    await db
      .update(docsPages)
      .set({ status: "embedding" })
      .where(eq(docsPages.id, pageId));

    const createdContentIds: string[] = [];

    try {
      for (const pageItem of crawledPagesData) {
        const contentId = `cnt_${crypto.randomBytes(12).toString("hex")}`;
        await db.insert(docsContent).values({
          id: contentId,
          docsPageId: pageId,
          pageUrl: pageItem.pageUrl,
          sectionTitle: pageItem.sectionTitle,
          contentText: pageItem.contentText,
        });
        createdContentIds.push(contentId);

        // Generate embeddings and store in docs_embeddings
        await indexDocsContent(contentId, companyId, pageItem.contentText);
      }
    } catch (embedErr: any) {
      return await markFailed(
        "Content was extracted but indexing failed due to an API error. Please try re-crawling."
      );
    }

    // ===========================================
    // FINAL VALIDATION CHECK BEFORE MARKING "INDEXED"
    // ===========================================
    // Under no circumstance should a docs_pages row reach status "indexed" if any failure condition occurred
    if (crawledPagesData.length === 0 || totalExtractedLength < 50) {
      return await markFailed(
        "No readable text content was found on this page. It may be JavaScript-rendered, image-only, or behind a login."
      );
    }

    // Verify content and embeddings exist in DB
    const contentRows = await db
      .select({ id: docsContent.id })
      .from(docsContent)
      .where(eq(docsContent.docsPageId, pageId));

    if (contentRows.length === 0) {
      return await markFailed(
        "Content was extracted but indexing failed due to an API error. Please try re-crawling."
      );
    }

    // ALL steps completed successfully: page fetched AND non-empty text extracted AND embeddings generated and stored
    await db
      .update(docsPages)
      .set({
        status: "indexed",
        pageCount: crawledPagesData.length,
        lastCrawledAt: new Date(),
        errorMessage: null,
      })
      .where(eq(docsPages.id, pageId));

    return { success: true, pageCount: crawledPagesData.length };
  } catch (error: any) {
    return await markFailed(
      error?.message || "An unexpected error occurred during documentation processing."
    );
  }
}
