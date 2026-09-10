import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";
import { FALLBACK_GLOBAL_CATEGORIES, FALLBACK_GLOBAL_PRIORITIES } from "../categories";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  console.log("🌱 Seeding database with global defaults & IT helpdesk data...");
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  // 1. Enable pgvector extension and create/alter tables if they do not exist
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log("✅ Enabled pgvector extension in PostgreSQL.");

    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        hmac_secret TEXT NOT NULL,
        onboarding_status TEXT NOT NULL DEFAULT 'pending_docs',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ticket_categories (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        auto_resolvable BOOLEAN NOT NULL DEFAULT FALSE,
        default_routing_team TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ticket_priorities (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT NOT NULL,
        rank INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS docs_pages (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        page_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        last_crawled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS docs_content (
        id TEXT PRIMARY KEY,
        docs_page_id TEXT NOT NULL REFERENCES docs_pages(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        section_title TEXT,
        content_text TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS docs_embeddings (
        id TEXT PRIMARY KEY,
        docs_content_id TEXT NOT NULL REFERENCES docs_content(id) ON DELETE CASCADE,
        company_id TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding vector(768) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL DEFAULT 'emp_guest',
        ticket_text TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0,
        suggested_resolution TEXT,
        source_references JSONB DEFAULT '[]'::jsonb,
        auto_resolve_eligible BOOLEAN NOT NULL DEFAULT FALSE,
        needs_manual_review BOOLEAN NOT NULL DEFAULT TRUE,
        status TEXT NOT NULL DEFAULT 'pending',
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        routing_team TEXT,
        resolved_by TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ticket_resolution_history (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        resolution TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Add normalized_url column to docs_pages if missing
    try {
      await sql`ALTER TABLE docs_pages ADD COLUMN IF NOT EXISTS normalized_url TEXT;`;
    } catch (e) {
      console.warn("Could not alter docs_pages for normalized_url:", e);
    }

    // Drop legacy end_user_id column constraint if present from previous module
    try {
      await sql`ALTER TABLE tickets ALTER COLUMN end_user_id DROP NOT NULL;`;
      await sql`ALTER TABLE tickets DROP COLUMN IF EXISTS end_user_id;`;
    } catch {}

    // Alter tables in case they were created in an older migration without new columns
    try {
      await sql`ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS default_routing_team TEXT;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS employee_id TEXT NOT NULL DEFAULT 'emp_guest';`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS confidence REAL NOT NULL DEFAULT 0;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS suggested_resolution TEXT;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source_references JSONB DEFAULT '[]'::jsonb;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS auto_resolve_eligible BOOLEAN NOT NULL DEFAULT FALSE;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN NOT NULL DEFAULT TRUE;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS routing_team TEXT;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_by TEXT;`;
      await sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;`;
    } catch {}

    console.log("✅ Verified and updated PostgreSQL database table columns.");
  } catch (extErr) {
    console.warn("⚠️ Warning initializing database tables DDL:", extErr);
  }

  // 2. Seed Global Default Categories (company_id = NULL)
  console.log("🌱 Seeding global default categories...");
  for (const cat of FALLBACK_GLOBAL_CATEGORIES) {
    await db
      .insert(schema.ticketCategories)
      .values(cat)
      .onConflictDoUpdate({
        target: schema.ticketCategories.id,
        set: {
          name: cat.name,
          description: cat.description,
          autoResolvable: cat.autoResolvable,
          defaultRoutingTeam: cat.defaultRoutingTeam,
        },
      });
  }
  console.log("✅ Seeded 5 global default categories.");

  // 3. Seed Global Default Priorities (company_id = NULL)
  console.log("🌱 Seeding global default priorities...");
  for (const prio of FALLBACK_GLOBAL_PRIORITIES) {
    await db
      .insert(schema.ticketPriorities)
      .values(prio)
      .onConflictDoUpdate({
        target: schema.ticketPriorities.id,
        set: {
          name: prio.name,
          rank: prio.rank,
        },
      });
  }
  console.log("✅ Seeded 3 global default priorities.");

  console.log("🎉 Database seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Database seeding failed:", err);
  process.exit(1);
});
