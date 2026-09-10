import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "../db";
import { tickets, ticketResolutionHistory, docsPages, type Company } from "../db/schema";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { verifyEmployeeSignature } from "../api-auth";
import { processTicket } from "../ticket-processor";

/**
 * Creates an instance of the ITrix MCP Server loaded with 4 tools:
 * 1. create_ticket
 * 2. get_ticket
 * 3. list_employee_tickets
 * 4. get_docs_index_status
 *
 * Scoped to the authenticated company context.
 */
export function createItrixMcpServer(company: Company) {
  const server = new McpServer({
    name: "ITrix Helpdesk MCP Server",
    version: "1.0.0",
  });

  // Tool 1: create_ticket
  server.tool(
    "create_ticket",
    "Create a new IT support ticket for an employee and get an AI-generated classification and resolution.",
    {
      employeeId: z.string().describe("Unique identifier of the employee raising the ticket"),
      employeeEmail: z.string().describe("Verified email of the employee raising the ticket"),
      signature: z.string().describe("HMAC-SHA256 signature of `${employeeId}:${employeeEmail}` computed on company backend"),
      ticketText: z.string().describe("Full description of the IT support issue or query"),
    },
    async ({ employeeId, employeeEmail, signature, ticketText }) => {
      // Step 1: Verify HMAC signature
      const isValidSignature = await verifyEmployeeSignature(
        company.id,
        employeeId,
        employeeEmail,
        signature
      );

      if (!isValidSignature) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid employee identity signature. The HMAC-SHA256 signature provided for ${employeeId}:${employeeEmail} does not match company HMAC secret.`,
            },
          ],
        };
      }

      // Step 2: Process ticket via core engine
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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(responsePayload, null, 2),
          },
        ],
      };
    }
  );

  // Tool 2: get_ticket
  server.tool(
    "get_ticket",
    "Fetch the status and details of a specific ticket by its ID.",
    {
      ticketId: z.string().describe("Unique ID of the ticket to inspect"),
    },
    async ({ ticketId }) => {
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Ticket with ID "${ticketId}" not found for company ${company.name}.`,
            },
          ],
        };
      }

      const ticket = rows[0];

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

      const payload = {
        ...ticket,
        resolutionHistory: historyRows,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  // Tool 3: list_employee_tickets
  server.tool(
    "list_employee_tickets",
    "List all tickets raised by a specific employee, with optional status and date filtering.",
    {
      employeeId: z.string().describe("Unique ID of the employee"),
      status: z.string().optional().describe("Filter by ticket status (e.g. 'auto_resolved', 'needs_review')"),
      from: z.string().optional().describe("ISO date string for start of range"),
      to: z.string().optional().describe("ISO date string for end of range"),
      page: z.number().optional().describe("Page number for pagination (default: 1)"),
      limit: z.number().optional().describe("Limit per page (default: 20, max: 100)"),
    },
    async ({ employeeId, status, from, to, page = 1, limit = 20 }) => {
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, Math.max(1, limit));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [
        eq(tickets.companyId, company.id),
        eq(tickets.employeeId, employeeId.trim()),
      ];

      if (status) {
        conditions.push(eq(tickets.status, status.trim()));
      }

      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          conditions.push(gte(tickets.createdAt, fromDate));
        }
      }

      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          conditions.push(lte(tickets.createdAt, toDate));
        }
      }

      const whereClause = and(...conditions);

      const countResult = await db
        .select({ totalCount: count() })
        .from(tickets)
        .where(whereClause);

      const total = countResult[0]?.totalCount || 0;

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
        .limit(limitNum)
        .offset(offset);

      const payload = {
        data,
        page: pageNum,
        limit: limitNum,
        total,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  // Tool 4: get_docs_index_status
  server.tool(
    "get_docs_index_status",
    "Check the crawling/indexing status of the company's documentation sources.",
    {},
    async () => {
      const rows = await db
        .select({
          id: docsPages.id,
          url: docsPages.url,
          normalizedUrl: docsPages.normalizedUrl,
          status: docsPages.status,
          pageCount: docsPages.pageCount,
          errorMessage: docsPages.errorMessage,
          lastCrawledAt: docsPages.lastCrawledAt,
          createdAt: docsPages.createdAt,
        })
        .from(docsPages)
        .where(eq(docsPages.companyId, company.id))
        .orderBy(desc(docsPages.createdAt));

      const totalSources = rows.length;
      const indexedCount = rows.filter((r) => r.status === "indexed").length;

      const payload = {
        companyId: company.id,
        companyName: company.name,
        totalSources,
        indexedCount,
        sources: rows,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
