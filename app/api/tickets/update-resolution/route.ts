import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketResolutionHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    let userId: string | null = null;
    try {
      const authObj = await auth();
      userId = authObj?.userId || null;
    } catch {
      userId = null;
    }

    const { ticketId, resolution, notes } = await req.json();

    if (!ticketId || typeof ticketId !== "string" || !ticketId.trim()) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    if (!resolution || typeof resolution !== "string" || !resolution.trim()) {
      return NextResponse.json(
        { error: "Resolution text is required" },
        { status: 400 }
      );
    }

    const cleanResolution = resolution.trim();

    // Check if ticket exists
    const ticketRows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticketRows || ticketRows.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Find highest version in history
    const existingHistory = await db
      .select()
      .from(ticketResolutionHistory)
      .where(eq(ticketResolutionHistory.ticketId, ticketId))
      .orderBy(desc(ticketResolutionHistory.version))
      .limit(1);

    const nextVersion = existingHistory.length > 0 ? existingHistory[0].version + 1 : 1;
    const adminIdentifier = userId || "Admin User";

    // Insert new version into history
    const [historyEntry] = await db
      .insert(ticketResolutionHistory)
      .values({
        id: `hist_${crypto.randomBytes(10).toString("hex")}`,
        ticketId,
        version: nextVersion,
        resolution: cleanResolution,
        updatedBy: adminIdentifier,
        notes: notes || "Updated solution from admin dashboard",
      })
      .returning();

    // Update suggestedResolution in main ticket table
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        suggestedResolution: cleanResolution,
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      historyEntry,
    });
  } catch (error: any) {
    console.error("Error updating ticket resolution:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update ticket resolution" },
      { status: 500 }
    );
  }
}
