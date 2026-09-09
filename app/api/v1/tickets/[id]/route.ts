import { NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { tickets, ticketResolutionHistory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/tickets/:id
 * Fetch a single ticket by ID, scoped strictly to the authenticated company_id in the SQL query.
 * Returns 404 if missing or owned by another company (prevents leaking existence of other companies' data).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiRequest(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { company, keyType } = auth;

    if (keyType === "widget_public_key") {
      return NextResponse.json(
        { error: "Widget public key is not authorized for direct ticket inspection by ID" },
        { status: 403 }
      );
    }

    const { id: ticketId } = await params;

    if (!ticketId || typeof ticketId !== "string" || !ticketId.trim()) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Query ticket strictly scoped to both ticket.id AND company.id
    const rows = await db
      .select({
        id: tickets.id,
        companyId: tickets.companyId,
        employeeId: tickets.employeeId,
        ticketText: tickets.ticketText,
        category: tickets.category,
        priority: tickets.priority,
        confidence: tickets.confidence,
        suggestedResolution: tickets.suggestedResolution,
        sourceReferences: tickets.sourceReferences,
        autoResolveEligible: tickets.autoResolveEligible,
        needsManualReview: tickets.needsManualReview,
        status: tickets.status,
        resolved: tickets.resolved,
        routingTeam: tickets.routingTeam,
        resolvedBy: tickets.resolvedBy,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(and(eq(tickets.id, ticketId.trim()), eq(tickets.companyId, company.id)))
      .limit(1);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = rows[0];

    // Fetch resolution history for ticket
    const historyRows = await db
      .select({
        version: ticketResolutionHistory.version,
        resolution: ticketResolutionHistory.resolution,
        updatedBy: ticketResolutionHistory.updatedBy,
        notes: ticketResolutionHistory.notes,
        createdAt: ticketResolutionHistory.createdAt,
      })
      .from(ticketResolutionHistory)
      .where(eq(ticketResolutionHistory.ticketId, ticket.id));

    return NextResponse.json({
      ...ticket,
      resolutionHistory: historyRows,
    });
  } catch (error) {
    console.error("[API v1 GET /tickets/:id Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching the ticket." },
      { status: 500 }
    );
  }
}
