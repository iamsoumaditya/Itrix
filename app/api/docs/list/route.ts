import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docsPages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId parameter required" }, { status: 400 });
    }

    const pages = await db
      .select()
      .from(docsPages)
      .where(eq(docsPages.companyId, companyId))
      .orderBy(desc(docsPages.createdAt));

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error fetching docs pages:", error);
    return NextResponse.json({ pages: [] });
  }
}
