import { db } from "./db";
import { companies, type Company } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(18).toString("hex");
  return `sk_live_${randomBytes}`;
}

export function generateHmacSecret(): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `hmac_sec_${randomBytes}`;
}

export function generateWidgetPublicKey(): string {
  const randomBytes = crypto.randomBytes(18).toString("hex");
  return `wpk_live_${randomBytes}`;
}

export async function getOrCreateCompany(
  orgId: string,
  orgName: string,
  userId: string
): Promise<{ company: Company; isNew: boolean }> {
  try {
    const existing = await db
      .select()
      .from(companies)
      .where(eq(companies.id, orgId))
      .limit(1);

    if (existing && existing.length > 0) {
      // Backfill widgetPublicKey if missing on existing record
      if (!existing[0].widgetPublicKey) {
        const wpk = generateWidgetPublicKey();
        const [updated] = await db
          .update(companies)
          .set({ widgetPublicKey: wpk })
          .where(eq(companies.id, orgId))
          .returning();
        return { company: updated || { ...existing[0], widgetPublicKey: wpk }, isNew: false };
      }
      return { company: existing[0], isNew: false };
    }

    const apiKey = generateApiKey();
    const hmacSecret = generateHmacSecret();
    const widgetPublicKey = generateWidgetPublicKey();

    const [newCompany] = await db
      .insert(companies)
      .values({
        id: orgId,
        name: orgName || "My Company",
        createdBy: userId || "user_system",
        apiKey,
        hmacSecret,
        widgetPublicKey,
        onboardingStatus: "pending_docs",
      })
      .returning();

    return { company: newCompany, isNew: true };
  } catch (error) {
    console.error("Error in getOrCreateCompany:", error);
    // Fallback object if database is unreachable in static preview
    const fallbackCompany: Company = {
      id: orgId,
      name: orgName || "Demo Company",
      createdBy: userId || "user_demo",
      apiKey: "sk_live_fallback_1234567890abcdef",
      hmacSecret: "hmac_sec_fallback_1234567890abcdef",
      widgetPublicKey: "wpk_live_fallback_1234567890abcdef",
      onboardingStatus: "pending_docs",
      createdAt: new Date(),
    };
    return { company: fallbackCompany, isNew: false };
  }
}

export async function rotateCompanyApiKey(companyId: string): Promise<string> {
  const newKey = generateApiKey();
  await db
    .update(companies)
    .set({ apiKey: newKey })
    .where(eq(companies.id, companyId));
  return newKey;
}

export async function completeCompanyOnboarding(companyId: string): Promise<void> {
  await db
    .update(companies)
    .set({ onboardingStatus: "completed" })
    .where(eq(companies.id, companyId));
}
