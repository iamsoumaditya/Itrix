import { NextResponse } from "next/server";
import { db } from "./db";
import { companies, type Company } from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * In-memory sliding window rate limiter scoped per server instance.
 * KNOWN LIMITATION: This in-memory store is not safe across multi-instance / serverless clusters.
 * For production multi-node clusters, replace this with a distributed store like Redis (e.g. Upstash).
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60; // 60 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count += 1;
  return true;
}

export interface AuthSuccess {
  company: Company;
  keyType: "full_api_key" | "widget_public_key";
  errorResponse?: undefined;
}

export interface AuthError {
  company?: undefined;
  keyType?: undefined;
  errorResponse: NextResponse;
}

export type AuthResult = AuthSuccess | AuthError;

/**
 * Middleware validator for all public /api/v1/* routes.
 * Validates Bearer <api_key> or Bearer <widget_public_key>, enforces rate limiting, and returns company context + keyType.
 */
export async function validateApiRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  const key = authHeader.substring(7).trim();
  if (!key) {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  // Enforce Rate Limiting per key in-memory before hitting the database
  const allowed = checkRateLimit(key);
  if (!allowed) {
    return {
      errorResponse: NextResponse.json(
        { error: "Rate limit exceeded, please slow down" },
        { status: 429 }
      ),
    };
  }

  // First look up as full private API key
  const fullKeyCompany = await db
    .select()
    .from(companies)
    .where(eq(companies.apiKey, key))
    .limit(1);

  if (fullKeyCompany && fullKeyCompany.length > 0) {
    return { company: fullKeyCompany[0], keyType: "full_api_key" };
  }

  // Next look up as public widget key
  const widgetKeyCompany = await db
    .select()
    .from(companies)
    .where(eq(companies.widgetPublicKey, key))
    .limit(1);

  if (widgetKeyCompany && widgetKeyCompany.length > 0) {
    return { company: widgetKeyCompany[0], keyType: "widget_public_key" };
  }

  return {
    errorResponse: NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    ),
  };
}

/**
 * Timing-safe HMAC identity signature verification for ticket creation.
 * Recomputes HMAC-SHA256 of `${employeeId}:${employeeEmail}` using company's hmac_secret.
 */
export async function verifyEmployeeSignature(
  companyId: string,
  employeeId: string,
  employeeEmail: string,
  providedSignature: string
): Promise<boolean> {
  if (!providedSignature || typeof providedSignature !== "string") {
    return false;
  }

  const companyRows = await db
    .select({ hmacSecret: companies.hmacSecret })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!companyRows || companyRows.length === 0) {
    return false;
  }

  const { hmacSecret } = companyRows[0];
  const dataToSign = `${employeeId.trim()}:${employeeEmail.trim()}`;

  const expectedSignature = crypto
    .createHmac("sha256", hmacSecret)
    .update(dataToSign)
    .digest("hex");

  try {
    const a = Buffer.from(expectedSignature, "utf8");
    const b = Buffer.from(providedSignature.trim(), "utf8");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
