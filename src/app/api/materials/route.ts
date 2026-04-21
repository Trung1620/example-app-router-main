import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const materials = await prismadb.material.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { name, unit, sku, price, stock, image, supplierName, supplierId, minStock, location } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: "name and unit are required" }, { status: 400 });
    }

    const material = await prismadb.material.create({
      data: { 
        orgId, name, unit, sku, 
        price: parseFloat(price || 0), 
        stock: parseFloat(stock || 0),
        minStock: parseFloat(minStock || 0),
        supplierName: supplierName || null,
        supplierId: supplierId || null,
        location: location || null,
        image 
      },
    });
    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
