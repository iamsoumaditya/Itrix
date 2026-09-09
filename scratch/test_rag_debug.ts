import { db } from "../lib/db";
import { docsPages, docsContent, docsEmbeddings } from "../lib/db/schema";
import { crawlDocsPage } from "../lib/crawler";
import { processTicket } from "../lib/ticket-processor";
import { generateEmbedding, parseVector } from "../lib/embeddings";
import { eq, sql } from "drizzle-orm";

process.env.DEBUG_MODE = "true";
process.env.DEBUG = "true";

async function main() {
  console.log("=========================================");
  console.log("   CORRECTED RAG RETRIEVAL TEST SUITE   ");
  console.log("=========================================\n");

  const companyId = "org_3Ix0swVH5OUJYuUHSjbBLEvkFov";
  const testDocsUrl = "https://en.wikipedia.org/wiki/Password_reset";

  // Check if page is already indexed
  const existingPages = await db.select().from(docsPages).where(eq(docsPages.companyId, companyId));
  if (existingPages.length === 0) {
    const pageId = `doc_pwd_reset_test_${Date.now()}`;
    await db.insert(docsPages).values({
      id: pageId,
      companyId,
      url: testDocsUrl,
      status: "queued",
    });
    console.log(`Crawling docs page ID: ${pageId} (${testDocsUrl}) with real Gemini API embeddings...`);
    const crawlRes = await crawlDocsPage(pageId, companyId, testDocsUrl);
    console.log("Crawl result:", crawlRes);
  } else {
    console.log(`Using existing ${existingPages.length} indexed pages for company ${companyId}.`);
  }

  // Step B: Run test query
  const testQuery = "I can't log into my laptop, it says my password expired.";
  console.log(`\n--- Running ProcessTicket / RetrieveRelevantDocs for query: "${testQuery}" ---`);

  const ticketResult = await processTicket(companyId, "emp_test_user", testQuery, { saveToDb: false });

  console.log("\n=========================================");
  console.log("  CORRECTED RAG DEBUGGER STEPS 1-5 REPORT ");
  console.log("=========================================\n");

  const ragDebug = (ticketResult.debugDetails as any)?.ragDebug;

  if (ragDebug) {
    console.log("STEP 1: Query Embedding Vector Dimension:");
    console.log(`  Length/Dimension: ${ragDebug.queryVectorDimension} (non-zero: ${ragDebug.queryVectorDimension > 0})\n`);

    console.log("STEP 2: Total docs_embeddings Rows in DB for Company:");
    console.log(`  company_id: "${companyId}" -> Total embeddings in DB: ${ragDebug.totalCompanyEmbeddingsCount}\n`);

    console.log("STEP 3: Top 10 Candidate Chunks BEFORE Threshold Filter (Sorted Descending by True Similarity / Ascending by Distance):");
    console.log(JSON.stringify(ragDebug.rawCandidateChunks.slice(0, 10), null, 2) + "\n");

    console.log("STEP 4: Chunks KEPT vs DISCARDED After Threshold Filter:");
    console.log(`  Current Similarity Threshold: ${ragDebug.filteringDetails.thresholdValue}`);
    console.log(`  Kept Chunks Count: ${ragDebug.filteringDetails.keptChunks.length}`);
    console.log(`  Discarded Chunks Count: ${ragDebug.filteringDetails.discardedChunks.length}`);
    console.log("  Top Kept Chunks:");
    console.log(JSON.stringify(ragDebug.filteringDetails.keptChunks.slice(0, 5), null, 2) + "\n");

    console.log("STEP 5: Final Top Array Returned by retrieveRelevantDocs:");
    console.log(JSON.stringify(ragDebug.finalReturnedArray, null, 2) + "\n");
  } else {
    console.warn("⚠️ No ragDebug details produced in ticket result!");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in RAG debugger script:", err);
  process.exit(1);
});
