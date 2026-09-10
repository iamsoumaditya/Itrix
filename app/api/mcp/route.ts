import { NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/api-auth";
import { createItrixMcpServer } from "@/lib/mcp/server";

/**
 * OPTIONS /api/mcp
 * CORS Preflight for external MCP clients.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * GET /api/mcp
 * Health check & MCP Server metadata endpoint.
 */
export async function GET(req: Request) {
  const auth = await validateApiRequest(req);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  return NextResponse.json({
    status: "ok",
    server: "ITrix Helpdesk MCP Server",
    version: "1.0.0",
    company: {
      id: auth.company.id,
      name: auth.company.name,
    },
    tools: [
      "create_ticket",
      "get_ticket",
      "list_employee_tickets",
      "get_docs_index_status",
    ],
  });
}

/**
 * POST /api/mcp
 * HTTP / SSE Streamable JSON-RPC transport for Model Context Protocol.
 * Requires Bearer <api_key> Authorization header.
 */
export async function POST(req: Request) {
  // Step 1: Validate API key using existing validateApiRequest middleware
  const auth = await validateApiRequest(req);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const { company } = auth;

  // Step 2: Parse incoming MCP JSON-RPC payload
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON" },
      },
      { status: 400 }
    );
  }

  const { jsonrpc, id, method, params } = body || {};

  if (jsonrpc !== "2.0") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Invalid Request: Expected jsonrpc: '2.0'" },
      },
      { status: 400 }
    );
  }

  // Instantiate MCP server for authenticated company
  const mcpServer = createItrixMcpServer(company);

  // Method 1: initialize
  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "ITrix Helpdesk MCP Server",
          version: "1.0.0",
        },
      },
    });
  }

  // Method 2: tools/list
  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "create_ticket",
            description:
              "Create a new IT support ticket for an employee and get an AI-generated classification and resolution.",
            inputSchema: {
              type: "object",
              properties: {
                employeeId: { type: "string", description: "Unique identifier of the employee" },
                employeeEmail: { type: "string", description: "Verified email of the employee" },
                signature: { type: "string", description: "HMAC-SHA256 signature of `${employeeId}:${employeeEmail}`" },
                ticketText: { type: "string", description: "Full description of the IT support issue" },
              },
              required: ["employeeId", "employeeEmail", "signature", "ticketText"],
            },
          },
          {
            name: "get_ticket",
            description: "Fetch the status and details of a specific ticket by its ID.",
            inputSchema: {
              type: "object",
              properties: {
                ticketId: { type: "string", description: "Unique ID of the ticket to inspect" },
              },
              required: ["ticketId"],
            },
          },
          {
            name: "list_employee_tickets",
            description: "List all tickets raised by a specific employee, with optional status and date filtering.",
            inputSchema: {
              type: "object",
              properties: {
                employeeId: { type: "string", description: "Unique ID of the employee" },
                status: { type: "string", description: "Filter by ticket status" },
                from: { type: "string", description: "Start date (ISO)" },
                to: { type: "string", description: "End date (ISO)" },
                page: { type: "number", description: "Page number" },
                limit: { type: "number", description: "Limit per page" },
              },
              required: ["employeeId"],
            },
          },
          {
            name: "get_docs_index_status",
            description: "Check the crawling/indexing status of the company's documentation sources.",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      },
    });
  }

  // Method 3: tools/call
  if (method === "tools/call") {
    const mcpParams = params as { name?: string; arguments?: Record<string, unknown> } | undefined;
    const toolName = mcpParams?.name;
    const toolArgs = mcpParams?.arguments || {};

    try {
      // Access tools registered on McpServer
      type ToolHandler = { handler: (args: unknown) => Promise<unknown> };
      const serverObj = mcpServer as unknown as { _registeredTools?: Record<string, ToolHandler>; tools?: Record<string, ToolHandler> };
      const registeredTools = serverObj._registeredTools || serverObj.tools;

      let toolResult: unknown;

      if (registeredTools && toolName && registeredTools[toolName]) {
        toolResult = await registeredTools[toolName].handler(toolArgs);
      } else {
        // Direct tool handler dispatch fallback
        if (toolName === "create_ticket") {
          toolResult = await serverObj._registeredTools?.create_ticket?.handler(toolArgs);
        } else if (toolName === "get_ticket") {
          toolResult = await serverObj._registeredTools?.get_ticket?.handler(toolArgs);
        } else if (toolName === "list_employee_tickets") {
          toolResult = await serverObj._registeredTools?.list_employee_tickets?.handler(toolArgs);
        } else if (toolName === "get_docs_index_status") {
          toolResult = await serverObj._registeredTools?.get_docs_index_status?.handler(toolArgs);
        }
      }

      if (!toolResult) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method / Tool not found: ${toolName}`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: toolResult,
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      console.error(`[MCP tool/call Error (${toolName})]:`, err);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: `Internal MCP tool execution error: ${errObj?.message || String(err)}`,
            },
          ],
        },
      });
    }
  }

  // Unknown method
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
    { status: 404 }
  );
}
