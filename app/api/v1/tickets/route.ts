import { NextResponse } from "next/server";
import { validateApiRequest, verifyEmployeeSignature } from "@/lib/api-auth";
import { processTicket } from "@/lib/ticket-processor";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * OPTIONS /api/v1/tickets
 * CORS Preflight for external widgets and API clients.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * POST /api/v1/tickets
 * Create a new ticket on behalf of an authenticated employee.
 * Requires Bearer <api_key> and valid HMAC-SHA256 signature of `${employeeId}:${employeeEmail}`.
 */
export async function POST(req: Request) {
  try {
    const auth = await validateApiRequest(req);
    if (auth.errorResponse) {
      const res = auth.errorResponse;
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const { company } = auth;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { employeeId, employeeEmail, signature, ticketText } = body || {};

    if (!employeeId || typeof employeeId !== "string" || !employeeId.trim()) {
      return jsonResponse(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    if (!employeeEmail || typeof employeeEmail !== "string" || !employeeEmail.trim()) {
      return jsonResponse(
        { error: "employeeEmail is required" },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== "string" || !signature.trim()) {
      return jsonResponse(
        { error: "signature is required" },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature of employee identity
    const isValidSignature = await verifyEmployeeSignature(
      company.id,
      employeeId,
      employeeEmail,
      signature
    );

    if (!isValidSignature) {
      return jsonResponse(
        { error: "Invalid employee identity signature" },
        { status: 401 }
      );
    }

    // Edge case: Empty or whitespace-only ticket description
    if (!ticketText || typeof ticketText !== "string" || !ticketText.trim()) {
      return jsonResponse(
        { error: "Please provide a ticket description before submitting." },
        { status: 400 }
      );
    }

    // Process ticket using core engine
    const result = await processTicket(company.id, employeeId, ticketText, {
      saveToDb: true,
    });

    const responsePayload = {
      id: result.id,
      category: result.category,
      priority: result.priority,
      confidence: result.confidence,
      suggestedResolution: result.suggestedResolution,
      sourceReferences: result.sourceReferences,
      autoResolveEligible: result.autoResolveEligible,
      resolved: result.resolved,
      status: result.status,
      routingTeam: result.routingTeam,
      createdAt: new Date().toISOString(),
    };

    return jsonResponse(responsePayload, { status: 201 });
  } catch (error) {
    console.error("[API v1 POST /tickets Error]:", error);
    return jsonResponse(
      { error: "An unexpected error occurred while processing the ticket." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/tickets
 * List tickets for the authenticated company, scoped strictly to a single employee.
 * Requires Bearer <api_key> and mandatory employeeId query parameter.
 */
export async function GET(req: Request) {
  try {
    const auth = await validateApiRequest(req);
    if (auth.errorResponse) {
      const res = auth.errorResponse;
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const { company, keyType } = auth;
    const { searchParams } = new URL(req.url);

    const employeeId = searchParams.get("employeeId")?.trim();
    if (!employeeId) {
      return jsonResponse(
        { error: "employeeId query parameter is required" },
        { status: 400 }
      );
    }

    // If request comes from public widget key, enforce HMAC signature verification
    if (keyType === "widget_public_key") {
      const employeeEmail = searchParams.get("employeeEmail")?.trim();
      const signature = searchParams.get("signature")?.trim();

      if (!employeeEmail || !signature) {
        return jsonResponse(
          { error: "employeeEmail and signature parameters are required when using widget public key" },
          { status: 400 }
        );
      }

      const isValidSignature = await verifyEmployeeSignature(
        company.id,
        employeeId,
        employeeEmail,
        signature
      );

      if (!isValidSignature) {
        return jsonResponse(
          { error: "Invalid employee identity signature" },
          { status: 401 }
        );
      }
    }

    const statusFilter = searchParams.get("status")?.trim();
    const fromFilter = searchParams.get("from")?.trim();
    const toFilter = searchParams.get("to")?.trim();

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const rawLimit = isNaN(limitParam) || limitParam < 1 ? 20 : limitParam;
    const limit = Math.min(rawLimit, 100);
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions = [
      eq(tickets.companyId, company.id),
      eq(tickets.employeeId, employeeId),
    ];

    if (statusFilter) {
      conditions.push(eq(tickets.status, statusFilter));
    }

    if (fromFilter) {
      const fromDate = new Date(fromFilter);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(tickets.createdAt, fromDate));
      }
    }

    if (toFilter) {
      const toDate = new Date(toFilter);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(tickets.createdAt, toDate));
      }
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ totalCount: count() })
      .from(tickets)
      .where(whereClause);

    const total = countResult[0]?.totalCount || 0;

    // Fetch paginated tickets
    const data = await db
      .select({
        id: tickets.id,
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
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonResponse({
      data,
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error("[API v1 GET /tickets Error]:", error);
    return jsonResponse(
      { error: "An unexpected error occurred while fetching tickets." },
      { status: 500 }
    );
  }
}
