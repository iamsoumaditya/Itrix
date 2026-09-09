import { NextResponse } from "next/server";
import {
  getCategoriesForCompany,
  getPrioritiesForCompany,
  addCustomCategory,
  addCustomPriority,
  deleteCategory,
  deletePriority,
} from "@/lib/categories";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId") || "org_demo_acme_corp";

    const categories = await getCategoriesForCompany(companyId);
    const priorities = await getPrioritiesForCompany(companyId);

    return NextResponse.json({ categories, priorities });
  } catch (error) {
    console.error("Error fetching categories & priorities:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { type, companyId, name, description, autoResolvable, defaultRoutingTeam, rank } = await req.json();

    if (!companyId || !name) {
      return NextResponse.json(
        { error: "companyId and name are required" },
        { status: 400 }
      );
    }

    if (type === "priority") {
      const newPrio = await addCustomPriority(companyId, name, Number(rank) || 2);
      return NextResponse.json({ success: true, priority: newPrio });
    }

    // Default to adding custom category
    const newCat = await addCustomCategory(
      companyId,
      name,
      description,
      Boolean(autoResolvable),
      defaultRoutingTeam
    );
    return NextResponse.json({ success: true, category: newCat });
  } catch (error: any) {
    console.error("Error adding custom category/priority:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add category" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { type, id, companyId } = await req.json();

    if (!id || !companyId) {
      return NextResponse.json(
        { error: "id and companyId are required" },
        { status: 400 }
      );
    }

    if (type === "priority") {
      await deletePriority(id, companyId);
      return NextResponse.json({ success: true });
    }

    await deleteCategory(id, companyId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category/priority:", error);
    return NextResponse.json(
      { error: error?.message || "Cannot delete item" },
      { status: 400 }
    );
  }
}
