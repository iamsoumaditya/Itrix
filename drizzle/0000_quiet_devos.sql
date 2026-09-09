CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"api_key" text NOT NULL,
	"hmac_secret" text NOT NULL,
	"onboarding_status" text DEFAULT 'pending_docs' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "docs_content" (
	"id" text PRIMARY KEY NOT NULL,
	"docs_page_id" text NOT NULL,
	"page_url" text NOT NULL,
	"section_title" text,
	"content_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"last_crawled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"end_user_id" text NOT NULL,
	"ticket_text" text NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "docs_content" ADD CONSTRAINT "docs_content_docs_page_id_docs_pages_id_fk" FOREIGN KEY ("docs_page_id") REFERENCES "public"."docs_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs_pages" ADD CONSTRAINT "docs_pages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;