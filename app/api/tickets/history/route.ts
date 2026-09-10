import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ticketResolutionHistory } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId")?.trim();

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId query parameter is required" },
        { status: 400 }
      );
    }

    const history = await db
      .select()
      .from(ticketResolutionHistory)
      .where(eq(ticketResolutionHistory.ticketId, ticketId))
      .orderBy(asc(ticketResolutionHistory.version));

    return NextResponse.json({ history });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error fetching resolution history:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch resolution history" },
      { status: 500 }
    );
  }
}
