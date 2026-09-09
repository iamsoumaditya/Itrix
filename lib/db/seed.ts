import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
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

  // 4. Upsert sample demo company
  const demoOrgId = "org_demo_acme_corp";
  const demoUser = "user_demo_admin";

  await db
    .insert(schema.companies)
    .values({
      id: demoOrgId,
      name: "Acme Corp (Internal IT)",
      createdBy: demoUser,
      apiKey: "sk_live_demo_9876543210fedcba",
      hmacSecret: "hmac_sec_demo_1234567890abcdef",
      widgetPublicKey: "wpk_live_demo_1234567890abcdef",
      onboardingStatus: "completed",
    })
    .onConflictDoUpdate({
      target: schema.companies.id,
      set: {
        name: "Acme Corp (Internal IT)",
        onboardingStatus: "completed",
      },
    });

  console.log("✅ Seeded demo company: Acme Corp (Internal IT)");

  // 5. Sample Docs Pages for Internal IT
  const docsData = [
    {
      id: "doc_page_1",
      companyId: demoOrgId,
      url: "https://it-docs.acmecorp.com/vpn-access-guide",
      status: "indexed",
      pageCount: 14,
      lastCrawledAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
    {
      id: "doc_page_2",
      companyId: demoOrgId,
      url: "https://it-docs.acmecorp.com/mfa-reset-procedure",
      status: "indexed",
      pageCount: 8,
      lastCrawledAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
    {
      id: "doc_page_3",
      companyId: demoOrgId,
      url: "https://it-docs.acmecorp.com/hardware-laptop-procurement",
      status: "indexed",
      pageCount: 6,
      lastCrawledAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  ];

  for (const doc of docsData) {
    await db
      .insert(schema.docsPages)
      .values(doc)
      .onConflictDoUpdate({
        target: schema.docsPages.id,
        set: { status: doc.status, pageCount: doc.pageCount },
      });
  }

  // 6. Seed sample IT docs content & vector embeddings
  const sampleDocText =
    "To connect to the internal network remotely, download GlobalProtect VPN client v6.1+, set portal address to vpn.acmecorp.com, and authenticate with Okta SSO credentials. For self-service password reset, go to portal.acmecorp.com/reset. For Okta MFA seed resets, access portal.acmecorp.com/mfa.";

  // Delete existing demo embeddings to ensure fresh vector embeddings are generated
  await db.delete(schema.docsEmbeddings).where(eq(schema.docsEmbeddings.companyId, demoOrgId));

  await db
    .insert(schema.docsContent)
    .values({
      id: "doc_content_1",
      docsPageId: "doc_page_1",
      pageUrl: "https://it-docs.acmecorp.com/vpn-access-guide#global-protect",
      sectionTitle: "GlobalProtect VPN Configuration & Password Reset",
      contentText: sampleDocText,
    })
    .onConflictDoNothing();

  // Index vector embeddings for sample doc content
  const { indexDocsContent } = await import("../embeddings");
  await indexDocsContent("doc_content_1", demoOrgId, sampleDocText);

  // 7. Seed Placeholder Employee IT Tickets
  const sampleTickets = [
    {
      id: "tkt_101",
      companyId: demoOrgId,
      employeeId: "emp_alex_99",
      ticketText:
        "I was locked out of my Okta account after 3 failed password attempts. Need MFA seed reset for my new iPhone 16.",
      category: "Password Reset",
      priority: "High",
      confidence: 0.95,
      suggestedResolution:
        "According to your Okta MFA reset procedure doc, navigate to self-service portal at portal.acmecorp.com/reset to trigger an SMS verification link.",
      sourceReferences: [
        {
          page_url: "https://it-docs.acmecorp.com/mfa-reset-procedure",
          section_title: "Self-Service Okta MFA Reset",
        },
      ],
      autoResolveEligible: true,
      needsManualReview: false,
      status: "auto_resolved",
      resolved: true,
      routingTeam: "IT Access Team",
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: "tkt_102",
      companyId: demoOrgId,
      employeeId: "emp_sarah_42",
      ticketText:
        "How do I request a JetBrains All Products Pack license for our engineering team's new Q3 sprint project?",
      category: "Access Request",
      priority: "Medium",
      confidence: 0.88,
      suggestedResolution:
        "Submit a License Approval request via the internal IT portal under Software Licenses.",
      sourceReferences: [
        {
          page_url: "https://it-docs.acmecorp.com/software-licenses",
          section_title: "Developer License Procurement",
        },
      ],
      autoResolveEligible: false,
      needsManualReview: false,
      status: "needs_review",
      resolved: false,
      routingTeam: "IT Access Team",
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
    },
    {
      id: "tkt_103",
      companyId: demoOrgId,
      employeeId: "emp_dev_marcus",
      ticketText:
        "GlobalProtect VPN connects successfully but internal staging environment endpoints return connection timeout.",
      category: "Software Issue",
      priority: "High",
      confidence: 0.72,
      suggestedResolution:
        "Check your DNS settings in GlobalProtect VPN client preferences and ensure split tunneling routes are active.",
      sourceReferences: [
        {
          page_url: "https://it-docs.acmecorp.com/vpn-access-guide#troubleshooting",
          section_title: "VPN Split Tunneling Routing",
        },
      ],
      autoResolveEligible: false,
      needsManualReview: false,
      status: "needs_review",
      resolved: false,
      routingTeam: "Software Support Team",
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      id: "tkt_104",
      companyId: demoOrgId,
      employeeId: "emp_tech_dave",
      ticketText:
        "My MacBook Pro battery health alert is showing 'Service Recommended'. Keyboard keys 'E' and 'R' are also sticking.",
      category: "Hardware Fault",
      priority: "Medium",
      confidence: 0.91,
      suggestedResolution:
        "Hardware faults require physical inspection. Escalated to IT Service Desk at Building B.",
      sourceReferences: [
        {
          page_url: "https://it-docs.acmecorp.com/hardware-laptop-procurement",
          section_title: "Hardware Repair & Replacement Policy",
        },
      ],
      autoResolveEligible: false,
      needsManualReview: true,
      status: "needs_review",
      resolved: false,
      routingTeam: "Hardware Support Team",
      createdAt: new Date(Date.now() - 1000 * 60 * 360),
    },
  ];

  for (const tkt of sampleTickets) {
    await db
      .insert(schema.tickets)
      .values(tkt)
      .onConflictDoUpdate({
        target: schema.tickets.id,
        set: {
          ticketText: tkt.ticketText,
          category: tkt.category,
          priority: tkt.priority,
          status: tkt.status,
          suggestedResolution: tkt.suggestedResolution,
          resolved: tkt.resolved,
          routingTeam: tkt.routingTeam,
        },
      });
  }

  console.log(`✅ Seeded ${sampleTickets.length} placeholder employee IT tickets!`);
  console.log("🎉 Database seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Database seeding failed:", err);
  process.exit(1);
});
