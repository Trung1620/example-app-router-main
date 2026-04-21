import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { orgId } = await requireApiContext(req as any);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const categories = await prismadb.category.findMany({
      where: {
        orgId,
        ...(type ? { type: type as any } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("CATEGORIES_GET_ERROR", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { orgId } = await requireApiContext(req as any);
    const body = await req.json();
    const { name, type, description, parentID } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const category = await prismadb.category.create({
      data: {
        orgId,
        name,
        type: type || "PRODUCT",
        description,
        parentID
      }
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("CATEGORIES_POST_ERROR", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
