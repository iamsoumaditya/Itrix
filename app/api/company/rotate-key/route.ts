import { NextResponse } from "next/server";
import { rotateCompanyApiKey } from "@/lib/company";

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const newApiKey = await rotateCompanyApiKey(companyId);

    return NextResponse.json({ success: true, apiKey: newApiKey });
  } catch (error) {
    console.error("Error rotating API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
