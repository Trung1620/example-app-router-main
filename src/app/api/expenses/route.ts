import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const category = searchParams.get("category");
    const period = searchParams.get("period");

    let dateFilter: any = {};
    if (from && to) {
      dateFilter = {
        expenseDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      };
    } else if (period === "today") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      dateFilter = { expenseDate: { gte: start, lte: end } };
    } else if (period === "month") {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      dateFilter = { expenseDate: { gte: start } };
    }

    const expenses = await prismadb.expense.findMany({
      where: {
        orgId,
        ...dateFilter,
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: { expenseDate: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireApiContext(req);
    const body = await req.json();
    const { title, category, amount, expenseDate, paymentMethod, receiptImage, note } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: "title and amount are required" }, { status: 400 });
    }

    const expense = await prismadb.expense.create({
      data: {
        orgId,
        title,
        category: category || "OTHER",
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod: paymentMethod || "CASH",
        receiptImage: receiptImage || null,
      },
    });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
