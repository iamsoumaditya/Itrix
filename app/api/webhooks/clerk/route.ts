import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { generateApiKey, generateHmacSecret, generateWidgetPublicKey } from "@/lib/company";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET in environment variables.");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Get headers for Svix signature verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 }
    );
  }

  // Get raw body text (MUST use req.text() for Svix signature verification!)
  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying Clerk webhook:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (!evt) {
    return NextResponse.json(
      { error: "Webhook verification yielded empty event" },
      { status: 400 }
    );
  }

  const eventType = evt.type;

  if (eventType === "organization.created") {
    const orgData = evt.data as { id: string; name?: string; created_by?: string };
    const id = orgData.id;
    const name = orgData.name;
    const created_by = orgData.created_by;

    try {
      const apiKey = generateApiKey();
      const hmacSecret = generateHmacSecret();
      const widgetPublicKey = generateWidgetPublicKey();

      await db
        .insert(companies)
        .values({
          id,
          name: name || "Unnamed Organization",
          createdBy: created_by || "user_unknown",
          apiKey,
          hmacSecret,
          widgetPublicKey,
          onboardingStatus: "pending_docs",
        })
        .onConflictDoNothing();

      console.log(`✅ Company created via Clerk webhook: ${id} (${name})`);
    } catch (dbError) {
      console.error("Error creating company row in DB from webhook:", dbError);
      return NextResponse.json(
        { error: "Database insertion failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
