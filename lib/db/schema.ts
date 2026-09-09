import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";

// Custom pgvector column type for PostgreSQL (768 dimensions for Gemini text-embedding-004)
export const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string | number[]): number[] {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        // Fallback for raw vector string format "[0.1,0.2,...]"
        return value
          .replace(/[\[\]]/g, "")
          .split(",")
          .map(Number);
      }
    }
    return value;
  },
});

export const companies = pgTable("companies", {
  id: text("id").primaryKey(), // Clerk organization ID, e.g. org_...
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(), // Clerk user ID
  apiKey: text("api_key").notNull().unique(),
  hmacSecret: text("hmac_secret").notNull(),
  widgetPublicKey: text("widget_public_key").notNull().unique(),
  onboardingStatus: text("onboarding_status").notNull().default("pending_docs"), // "pending_docs" | "completed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketCategories = pgTable("ticket_categories", {
  id: text("id").primaryKey(),
  companyId: text("company_id"), // NULL = global default, non-null = custom company category
  name: text("name").notNull(),
  description: text("description"),
  autoResolvable: boolean("auto_resolvable").notNull().default(false),
  defaultRoutingTeam: text("default_routing_team"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketPriorities = pgTable("ticket_priorities", {
  id: text("id").primaryKey(),
  companyId: text("company_id"), // NULL = global default, non-null = custom company priority
  name: text("name").notNull(),
  rank: integer("rank").notNull(), // Sort order: Low=1, Medium=2, High=3
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const docsPages = pgTable("docs_pages", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url"),
  status: text("status").notNull().default("queued"), // "queued" | "crawling" | "extracting" | "embedding" | "indexed" | "failed"
  pageCount: integer("page_count").notNull().default(0),
  errorMessage: text("error_message"),
  lastCrawledAt: timestamp("last_crawled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const docsContent = pgTable("docs_content", {
  id: text("id").primaryKey(),
  docsPageId: text("docs_page_id")
    .notNull()
    .references(() => docsPages.id, { onDelete: "cascade" }),
  pageUrl: text("page_url").notNull(),
  sectionTitle: text("section_title"),
  contentText: text("content_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const docsEmbeddings = pgTable("docs_embeddings", {
  id: text("id").primaryKey(),
  docsContentId: text("docs_content_id")
    .notNull()
    .references(() => docsContent.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull(),
  chunkText: text("chunk_text").notNull(),
  embedding: pgVector("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull(),
  ticketText: text("ticket_text").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  confidence: real("confidence").notNull().default(0),
  suggestedResolution: text("suggested_resolution"),
  sourceReferences: jsonb("source_references")
    .$type<Array<{ page_url: string; section_title?: string }>>()
    .default([]),
  autoResolveEligible: boolean("auto_resolve_eligible").notNull().default(false),
  needsManualReview: boolean("needs_manual_review").notNull().default(true),
  status: text("status").notNull().default("pending"), // "auto_resolved" | "needs_review" | "pending"
  resolved: boolean("resolved").notNull().default(false),
  routingTeam: text("routing_team"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketResolutionHistory = pgTable("ticket_resolution_history", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  resolution: text("resolution").notNull(),
  updatedBy: text("updated_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type TicketCategory = typeof ticketCategories.$inferSelect;
export type NewTicketCategory = typeof ticketCategories.$inferInsert;
export type TicketPriority = typeof ticketPriorities.$inferSelect;
export type NewTicketPriority = typeof ticketPriorities.$inferInsert;
export type DocsPage = typeof docsPages.$inferSelect;
export type NewDocsPage = typeof docsPages.$inferInsert;
export type DocsContent = typeof docsContent.$inferSelect;
export type NewDocsContent = typeof docsContent.$inferInsert;
export type DocsEmbedding = typeof docsEmbeddings.$inferSelect;
export type NewDocsEmbedding = typeof docsEmbeddings.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketResolutionHistory = typeof ticketResolutionHistory.$inferSelect;
export type NewTicketResolutionHistory = typeof ticketResolutionHistory.$inferInsert;
