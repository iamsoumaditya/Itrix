import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docsPages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { pageId } = await req.json();

    if (!pageId) {
      return NextResponse.json(
        { error: "pageId is required" },
        { status: 400 }
      );
    }

    await db.delete(docsPages).where(eq(docsPages.id, pageId));

    return NextResponse.json({ success: true, deletedId: pageId });
  } catch (error) {
    console.error("Error deleting doc page:", error);
    return NextResponse.json(
      { error: "Failed to delete doc page" },
      { status: 500 }
    );
  }
}
