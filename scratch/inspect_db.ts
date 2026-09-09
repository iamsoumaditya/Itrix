import { db } from "../lib/db";
import { docsPages, docsContent, docsEmbeddings, companies } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateEmbedding, parseVector } from "../lib/embeddings";

async function inspect() {
  console.log("=== DB DIAGNOSTICS ===");

  // Check 1: Check companies
  const companyRows = await db.select().from(companies);
  console.log(`Companies in DB: ${companyRows.length}`);
  for (const c of companyRows) {
    console.log(`- Company ID: ${c.id}, Name: ${c.name}`);
  }

  // Check 2: Check docsPages and docsEmbeddings count per company
  const pageRows = await db.select().from(docsPages);
  console.log(`\nDocsPages in DB: ${pageRows.length}`);
  for (const p of pageRows) {
    console.log(`- Page ID: ${p.id}, Company ID: ${p.companyId}, URL: ${p.url}, Status: ${p.status}, Count: ${p.pageCount}`);
  }

  const embedRows = await db.select().from(docsEmbeddings);
  console.log(`\nTotal docs_embeddings rows in DB across ALL companies: ${embedRows.length}`);

  // Count per company
  const companyCounts: Record<string, number> = {};
  for (const e of embedRows) {
    companyCounts[e.companyId] = (companyCounts[e.companyId] || 0) + 1;
  }
  console.log("docs_embeddings count per company:", JSON.stringify(companyCounts, null, 2));

  // Check 3: Dimension check of stored vector in DB
  if (embedRows.length > 0) {
    const sample = embedRows[0];
    const parsed = parseVector(sample.embedding);
    console.log(`\nSample stored embedding ID: ${sample.id}`);
    console.log(`Sample stored embedding companyId: ${sample.companyId}`);
    console.log(`Sample stored embedding vector length: ${parsed.length}`);
  }

  // Check 4: Check pgvector column data type in DB catalog via raw SQL query
  try {
    const columnInfo = await db.execute(
      sql`SELECT column_name, data_type, udt_name 
          FROM information_schema.columns 
          WHERE table_name = 'docs_embeddings' AND column_name = 'embedding'`
    );
    console.log("\nDB Catalog column info for docs_embeddings.embedding:");
    console.log(columnInfo.rows || columnInfo);
  } catch (err) {
    console.warn("Could not query DB catalog info:", err);
  }

  // Check 5: Embedding model vector dimension test
  const testVec = await generateEmbedding("I can't log into my laptop, it says my password expired.");
  console.log(`\nGenerated query embedding dimension: ${testVec.length}`);

  process.exit(0);
}

inspect().catch((err) => {
  console.error("Inspect error:", err);
  process.exit(1);
});
