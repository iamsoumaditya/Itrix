import { NextResponse } from "next/server";

/**
 * GET /api/v1/health
 * Simple unauthenticated endpoint returning { status: "ok" } for uptime monitoring.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
