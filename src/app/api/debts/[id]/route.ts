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

    const oldDebt = await prismadb.debt.findFirst({
      where: { id, orgId },
    });

    if (!oldDebt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const newPaidAmount = body.paidAmount !== undefined ? parseFloat(body.paidAmount) : oldDebt.paidAmount;
    const paidDelta = newPaidAmount - oldDebt.paidAmount;

    const debt = await prismadb.debt.update({
      where: { id, orgId },
      data: {
        paidAmount: newPaidAmount,
        status: body.status,
        note: body.note,
      },
    });

    // Tự động tạo Phiếu chi nếu đây là khoản nợ PHẢI TRẢ và có phát sinh thanh toán mới
    if (paidDelta > 0 && oldDebt.type === "PAYABLE") {
      const expenseModel = (prismadb as any).expense || (prismadb as any).Expense;
      if (expenseModel) {
        let cat = "OTHER";
        if (oldDebt.referenceType === "ARTISAN") cat = "SALARY";
        if (oldDebt.referenceType === "SUPPLIER") cat = "EQUIPMENT";

        await expenseModel.create({
          data: {
            orgId,
            title: `Thanh toán công nợ: ${oldDebt.note || oldDebt.referenceType}`,
            amount: paidDelta,
            category: cat,
            paymentMethod: "CASH",
            expenseDate: new Date(),
            note: `Tự động tạo từ việc thanh toán công nợ ${oldDebt.id}`
          }
        });
      }
    }

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
