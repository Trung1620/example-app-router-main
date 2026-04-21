import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const artisan = await prismadb.artisan.findFirst({
      where: { id, orgId },
    });
    if (!artisan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(artisan);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { name, phone, address, age, role, baseSalary, debt, skills, status, dailyTarget, dailyWage, image } = body;

    const artisan = await prismadb.artisan.updateMany({
      where: { id, orgId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
        ...(age !== undefined && { age: age ? parseInt(age) : null }),
        ...(role !== undefined && { role }),
        ...(skills !== undefined && { skills }),
        ...(status !== undefined && { status }),
        ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) || 0 }),
        ...(dailyWage !== undefined && { dailyWage: parseFloat(dailyWage) || 0 }),
        ...(dailyTarget !== undefined && { dailyTarget: dailyTarget ? parseInt(dailyTarget) : null }),
        ...(debt !== undefined && { debt: parseFloat(debt) || 0 }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json(artisan);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    await prismadb.artisan.deleteMany({
      where: { id, orgId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
