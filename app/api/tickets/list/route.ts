import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") || "org_demo_acme_corp";
  const statusFilter = searchParams.get("status");
  const resolvedFilter = searchParams.get("resolved"); // "all" | "resolved" | "unresolved"
  const searchEmployee = searchParams.get("searchEmployee") || searchParams.get("searchUser");

  try {
    let conditions = [eq(tickets.companyId, companyId)];

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(tickets.status, statusFilter));
    }

    if (resolvedFilter === "resolved") {
      conditions.push(eq(tickets.resolved, true));
    } else if (resolvedFilter === "unresolved") {
      conditions.push(eq(tickets.resolved, false));
    }

    if (searchEmployee) {
      conditions.push(ilike(tickets.employeeId, `%${searchEmployee}%`));
    }

    const ticketList = await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt));

    return NextResponse.json({ tickets: ticketList });
  } catch (error) {
    console.error("Error fetching IT tickets:", error);
    return NextResponse.json({ tickets: [] });
  }
}

