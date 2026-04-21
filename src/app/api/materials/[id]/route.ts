import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const material = await prismadb.material.findFirst({
      where: { id, orgId },
    });
    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { name, unit, sku, price, stock, image } = body;

    const material = await prismadb.material.updateMany({
      where: { id, orgId },
      data: { 
        ...(name && { name }),
        ...(unit && { unit }),
        ...(sku !== undefined && { sku }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseFloat(stock) }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    await prismadb.material.deleteMany({
      where: { id, orgId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
