import { NextResponse } from "next/server";
import { processTicket } from "@/lib/ticket-processor";

export async function POST(req: Request) {
  try {
    const { companyId, employeeId, ticketText, isPlayground } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const result = await processTicket(companyId, employeeId, ticketText, {
      saveToDb: !isPlayground, // Do NOT save to DB if called from Playground
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing ticket:", error);
    return NextResponse.json(
      { error: "Internal error processing IT ticket" },
      { status: 500 }
    );
  }
}
