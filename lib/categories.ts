import { db } from "./db";
import { ticketCategories, ticketPriorities, type TicketCategory, type TicketPriority } from "./db/schema";
import { eq, isNull, or, and, asc } from "drizzle-orm";
import crypto from "crypto";

// Fallback global default categories in case DB is un-seeded or unreachable
export const FALLBACK_GLOBAL_CATEGORIES: TicketCategory[] = [
  {
    id: "cat_global_password_reset",
    companyId: null,
    name: "Password Reset",
    description: "Account lockout, password recovery, or Okta MFA credential resets.",
    autoResolvable: true,
    defaultRoutingTeam: "IT Access Team",
    createdAt: new Date(),
  },
  {
    id: "cat_global_access_request",
    companyId: null,
    name: "Access Request",
    description: "Permissions for software tools, S3 buckets, internal repos, or VPN.",
    autoResolvable: false,
    defaultRoutingTeam: "IT Access Team",
    createdAt: new Date(),
  },
  {
    id: "cat_global_software_issue",
    companyId: null,
    name: "Software Issue",
    description: "Bugs, installation errors, crashes, or software license keys.",
    autoResolvable: false,
    defaultRoutingTeam: "Software Support Team",
    createdAt: new Date(),
  },
  {
    id: "cat_global_hardware_fault",
    companyId: null,
    name: "Hardware Fault",
    description: "Laptop screen issues, battery replacement, keyboard failure, or peripherals.",
    autoResolvable: false,
    defaultRoutingTeam: "Hardware Support Team",
    createdAt: new Date(),
  },
  {
    id: "cat_global_general_it_query",
    companyId: null,
    name: "General IT Query",
    description: "Mandatory fallback bucket for general IT inquiries or unclassified questions.",
    autoResolvable: false,
    defaultRoutingTeam: "General IT Team",
    createdAt: new Date(),
  },
];

export const FALLBACK_GLOBAL_PRIORITIES: TicketPriority[] = [
  {
    id: "prio_global_low",
    companyId: null,
    name: "Low",
    rank: 1,
    createdAt: new Date(),
  },
  {
    id: "prio_global_medium",
    companyId: null,
    name: "Medium",
    rank: 2,
    createdAt: new Date(),
  },
  {
    id: "prio_global_high",
    companyId: null,
    name: "High",
    rank: 3,
    createdAt: new Date(),
  },
];

/**
 * Returns the UNION of global defaults (company_id IS NULL) plus that company's custom rows.
 */
export async function getCategoriesForCompany(companyId: string): Promise<TicketCategory[]> {
  try {
    const rows = await db
      .select()
      .from(ticketCategories)
      .where(or(isNull(ticketCategories.companyId), eq(ticketCategories.companyId, companyId)));

    const categoryMap = new Map<string, TicketCategory>();
    // First populate with global fallbacks
    for (const cat of FALLBACK_GLOBAL_CATEGORIES) {
      categoryMap.set(cat.name.toLowerCase(), cat);
    }
    // Then override / add company-specific categories from DB
    if (rows && rows.length > 0) {
      for (const r of rows) {
        categoryMap.set(r.name.toLowerCase(), r);
      }
    }
    return Array.from(categoryMap.values());
  } catch (error) {
    console.error("Error fetching categories for company:", error);
    return FALLBACK_GLOBAL_CATEGORIES;
  }
}

/**
 * Returns the UNION of global default priorities (company_id IS NULL) plus custom company priorities.
 */
export async function getPrioritiesForCompany(companyId: string): Promise<TicketPriority[]> {
  try {
    const rows = await db
      .select()
      .from(ticketPriorities)
      .where(or(isNull(ticketPriorities.companyId), eq(ticketPriorities.companyId, companyId)))
      .orderBy(asc(ticketPriorities.rank));

    if (rows && rows.length > 0) {
      return rows;
    }
    return FALLBACK_GLOBAL_PRIORITIES;
  } catch (error) {
    console.error("Error fetching priorities for company:", error);
    return FALLBACK_GLOBAL_PRIORITIES;
  }
}

export async function addCustomCategory(
  companyId: string,
  name: string,
  description?: string,
  autoResolvable: boolean = false,
  defaultRoutingTeam?: string
): Promise<TicketCategory> {
  const id = `cat_custom_${crypto.randomBytes(8).toString("hex")}`;
  const [newCat] = await db
    .insert(ticketCategories)
    .values({
      id,
      companyId,
      name: name.trim(),
      description: description ? description.trim() : null,
      autoResolvable,
      defaultRoutingTeam: defaultRoutingTeam ? defaultRoutingTeam.trim() : null,
    })
    .returning();

  return newCat;
}

export async function addCustomPriority(
  companyId: string,
  name: string,
  rank: number
): Promise<TicketPriority> {
  const id = `prio_custom_${crypto.randomBytes(8).toString("hex")}`;
  const [newPrio] = await db
    .insert(ticketPriorities)
    .values({
      id,
      companyId,
      name: name.trim(),
      rank,
    })
    .returning();

  return newPrio;
}

export async function deleteCategory(id: string, companyId: string): Promise<boolean> {
  const catList = await db
    .select()
    .from(ticketCategories)
    .where(eq(ticketCategories.id, id))
    .limit(1);

  if (!catList || catList.length === 0) return false;
  const target = catList[0];

  // Block deletion of global defaults (companyId === null) or "General IT Query"
  if (target.companyId === null || target.name.toLowerCase() === "general it query") {
    throw new Error("Cannot delete global default categories or the mandatory General IT Query category.");
  }

  if (target.companyId !== companyId) {
    throw new Error("Unauthorized to delete this custom category.");
  }

  await db.delete(ticketCategories).where(eq(ticketCategories.id, id));
  return true;
}

export async function deletePriority(id: string, companyId: string): Promise<boolean> {
  const prioList = await db
    .select()
    .from(ticketPriorities)
    .where(eq(ticketPriorities.id, id))
    .limit(1);

  if (!prioList || prioList.length === 0) return false;
  const target = prioList[0];

  if (target.companyId === null) {
    throw new Error("Cannot delete global default priorities.");
  }

  if (target.companyId !== companyId) {
    throw new Error("Unauthorized to delete this custom priority.");
  }

  await db.delete(ticketPriorities).where(eq(ticketPriorities.id, id));
  return true;
}
