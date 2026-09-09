import { db } from "../lib/db";
import { companies } from "../lib/db/schema";
import { generateWidgetPublicKey } from "../lib/company";
import { eq, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding widget_public_key column if not exists and backfilling missing keys...");

  try {
    // Raw SQL alter table to ensure column exists
    await db.execute(
      sql`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "widget_public_key" text;`
    );

    // Fetch all companies lacking widget_public_key
    const allCompanies = await db.select().from(companies);

    let updatedCount = 0;
    for (const comp of allCompanies) {
      if (!comp.widgetPublicKey) {
        const wpk = generateWidgetPublicKey();
        await db
          .update(companies)
          .set({ widgetPublicKey: wpk })
          .where(eq(companies.id, comp.id));
        console.log(`Updated company ${comp.id} (${comp.name}) with widget_public_key: ${wpk}`);
        updatedCount++;
      }
    }

    // Now set NOT NULL and UNIQUE constraint
    try {
      await db.execute(
        sql`ALTER TABLE "companies" ALTER COLUMN "widget_public_key" SET NOT NULL;`
      );
      await db.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS "companies_widget_public_key_unique" ON "companies" ("widget_public_key");`
      );
    } catch (err: any) {
      console.log("Constraint note:", err.message);
    }

    console.log(`Successfully backfilled ${updatedCount} companies.`);
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
}

main();
