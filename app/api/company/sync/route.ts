import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { orgId, userId } = await auth();
    const user = await currentUser();

    const effectiveOrgId = orgId || `org_personal_${userId || "demo"}`;
    const orgName = user?.primaryEmailAddress?.emailAddress
      ? `${user.firstName || "Company"}'s Workspace`
      : "Default Organization";

    const { company, isNew } = await getOrCreateCompany(
      effectiveOrgId,
      orgName,
      userId || "user_demo"
    );

    return NextResponse.json({ company, isNew });
  } catch (error) {
    console.error("Error syncing company:", error);
    // Return fallback company for safe client preview
    return NextResponse.json({
      company: {
        id: "org_demo_workspace",
        name: "Demo Workspace",
        createdBy: "user_demo",
        apiKey: "sk_live_demo_1234567890abcdef",
        hmacSecret: "hmac_sec_demo_1234567890abcdef",
        onboardingStatus: "pending_docs",
        createdAt: new Date(),
      },
      isNew: false,
    });
  }
}

export async function POST(req: Request) {
  try {
    const { orgId, orgName } = await req.json();
    const { userId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const { company, isNew } = await getOrCreateCompany(
      orgId,
      orgName || "My Company",
      userId || "user_demo"
    );

    return NextResponse.json({ company, isNew });
  } catch (error) {
    console.error("Error syncing company:", error);
    return NextResponse.json(
      { error: "Failed to sync company" },
      { status: 500 }
    );
  }
}
