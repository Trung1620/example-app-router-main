import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);

    const expense = await prismadb.expense.findFirst({
      where: { id, orgId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { title, category, amount, expenseDate, paymentMethod, receiptImage, note } = body;

    await prismadb.expense.updateMany({
      where: { id, orgId },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(paymentMethod && { paymentMethod }),
        ...(receiptImage !== undefined && { receiptImage }),
        ...(note !== undefined && { note }),
      },
    });

    const updated = await prismadb.expense.findFirst({
      where: { id, orgId }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { orgId } = await requireApiContext(req);
    await prismadb.expense.deleteMany({
      where: { id, orgId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

