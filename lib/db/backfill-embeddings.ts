import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";
import { indexDocsContent } from "../embeddings";
import { eq, notInArray } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

async function backfillEmbeddings() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  console.log("⚡ Starting RAG embedding backfill process...");
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  // 1. Fetch all docs_content joined with docs_pages to get company_id
  const allDocsContent = await db
    .select({
      id: schema.docsContent.id,
      pageUrl: schema.docsContent.pageUrl,
      sectionTitle: schema.docsContent.sectionTitle,
      contentText: schema.docsContent.contentText,
      companyId: schema.docsPages.companyId,
    })
    .from(schema.docsContent)
    .innerJoin(schema.docsPages, eq(schema.docsContent.docsPageId, schema.docsPages.id));

  console.log(`🔍 Found ${allDocsContent.length} docs_content rows to inspect.`);

  let totalChunksCreated = 0;

  for (const doc of allDocsContent) {
    // Check if already embedded
    const existing = await db
      .select({ id: schema.docsEmbeddings.id })
      .from(schema.docsEmbeddings)
      .where(eq(schema.docsEmbeddings.docsContentId, doc.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏩ Skipping docs_content #${doc.id} (already embedded)`);
      continue;
    }

    console.log(`⚙️ Chunking & embedding docs_content #${doc.id} (${doc.pageUrl})...`);
    const count = await indexDocsContent(doc.id, doc.companyId, doc.contentText);
    totalChunksCreated += count;
    console.log(`   -> Created ${count} vector embedding chunks for #${doc.id}`);
  }

  console.log(`🎉 Backfill completed! Created ${totalChunksCreated} total embedding vector chunks.`);
}

backfillEmbeddings().catch((err) => {
  console.error("❌ Embedding backfill failed:", err);
  process.exit(1);
});
