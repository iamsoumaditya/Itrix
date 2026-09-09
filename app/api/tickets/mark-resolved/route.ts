import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    let userId: string | null = null;
    try {
      const authObj = await auth();
      userId = authObj?.userId || null;
    } catch {
      userId = null;
    }

    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const [updatedTicket] = await db
      .update(tickets)
      .set({
        resolved: true,
        status: "auto_resolved",
        needsManualReview: false,
        resolvedBy: userId || "admin_user",
        resolvedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error("Error marking ticket as resolved:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to mark ticket as resolved" },
      { status: 500 }
    );
  }
}
