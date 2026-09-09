import { NextResponse } from "next/server";
import { completeCompanyOnboarding } from "@/lib/company";

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    await completeCompanyOnboarding(companyId);

    return NextResponse.json({ success: true, onboardingStatus: "completed" });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding status" },
      { status: 500 }
    );
  }
}
