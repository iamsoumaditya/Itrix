import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docsPages, docsContent, docsEmbeddings } from "@/lib/db/schema";
import { crawlDocsPage } from "@/lib/crawler";
import { normalizeUrl } from "@/lib/url-utils";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, url, pageId: existingPageId, action } = body;

    if (!companyId || (!url && !existingPageId)) {
      return NextResponse.json(
        { error: "companyId and url (or pageId) are required" },
        { status: 400 }
      );
    }

    const isRecrawlAction = action === "recrawl" || Boolean(existingPageId);

    // CASE B: Explicit Re-crawl of an existing docs_pages entry
    if (isRecrawlAction) {
      let existingPage = null;

      if (existingPageId) {
        const rows = await db
          .select()
          .from(docsPages)
          .where(and(eq(docsPages.id, existingPageId), eq(docsPages.companyId, companyId)));
        existingPage = rows[0] || null;
      } else if (url) {
        const normalized = normalizeUrl(url);
        const rows = await db
          .select()
          .from(docsPages)
          .where(and(eq(docsPages.companyId, companyId), eq(docsPages.normalizedUrl, normalized)));
        existingPage = rows[0] || null;
      }

      if (!existingPage) {
        return NextResponse.json(
          { error: "Documentation page not found for re-crawl." },
          { status: 404 }
        );
      }

      const targetPageId = existingPage.id;
      const targetUrl = existingPage.url;

      // 1. DELETE associated docs_content and docs_embeddings rows before re-crawl
      try {
        const oldContentRows = await db
          .select({ id: docsContent.id })
          .from(docsContent)
          .where(eq(docsContent.docsPageId, targetPageId));

        for (const cnt of oldContentRows) {
          await db
            .delete(docsEmbeddings)
            .where(eq(docsEmbeddings.docsContentId, cnt.id));
        }
        await db
          .delete(docsContent)
          .where(eq(docsContent.docsPageId, targetPageId));
      } catch (cleanErr) {
        console.warn("Warning clearing old content/embeddings during re-crawl:", cleanErr);
      }

      // 2. Reset status back to queued and clear error_message
      await db
        .update(docsPages)
        .set({
          status: "queued",
          errorMessage: null,
        })
        .where(eq(docsPages.id, targetPageId));

      // 3. Initiate background crawl pipeline
      crawlDocsPage(targetPageId, companyId, targetUrl).catch((err) => {
        console.error(`Background crawl error for page ${targetPageId}:`, err);
      });

      return NextResponse.json({
        success: true,
        isRecrawl: true,
        pageId: targetPageId,
        status: "queued",
        message: "Re-crawl started successfully.",
      });
    }

    // CASE A & New URL addition:
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const normalized = normalizeUrl(formattedUrl);

    // Duplicate Check: Check if a docs_pages row already exists for (company_id, normalized_url)
    const existingDuplicates = await db
      .select()
      .from(docsPages)
      .where(and(eq(docsPages.companyId, companyId), eq(docsPages.normalizedUrl, normalized)));

    if (existingDuplicates.length > 0) {
      const existing = existingDuplicates[0];
      return NextResponse.json({
        isDuplicate: true,
        message: "This URL has already been added.",
        existingPage: existing,
        status: existing.status,
        errorMessage: existing.errorMessage,
      });
    }

    // Insert new docs_pages row with status = "queued"
    const newPageId = `doc_${crypto.randomBytes(12).toString("hex")}`;
    await db.insert(docsPages).values({
      id: newPageId,
      companyId,
      url: formattedUrl,
      normalizedUrl: normalized,
      status: "queued",
      pageCount: 0,
      errorMessage: null,
    });

    // Initiate background crawl job
    crawlDocsPage(newPageId, companyId, formattedUrl).catch((err) => {
      console.error(`Background crawl error for new page ${newPageId}:`, err);
    });

    return NextResponse.json({
      success: true,
      pageId: newPageId,
      status: "queued",
      message: "Documentation URL queued for processing.",
    });
  } catch (error: any) {
    console.error("Error in docs crawl API endpoint:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error initiating crawl job" },
      { status: 500 }
    );
  }
}
