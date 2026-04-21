import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth";
import { getOrgIdForApiOrThrow } from "@/app/api/_org";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    const debt = await prismadb.debt.findFirst({
      where: { id, orgId },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json({ debt });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch debt" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    const body = await req.json();

    const debt = await prismadb.debt.update({
      where: { id, orgId },
      data: {
        paidAmount: body.paidAmount !== undefined ? parseFloat(body.paidAmount) : undefined,
        status: body.status,
        note: body.note,
      },
    });

    return NextResponse.json({ debt });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update debt" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getApiAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await getOrgIdForApiOrThrow(req, auth.userId);

    await prismadb.debt.delete({
      where: { id, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete debt" }, { status: 500 });
  }
}
