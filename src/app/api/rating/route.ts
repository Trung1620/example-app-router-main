// src/app/api/rating/route.ts
import getCurrentUser from "@/actions/getCurrentUser";
import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const comment = String(body?.comment ?? "").trim();
  const rating = Number(body?.rating ?? 0);
  const productId = String(body?.product?.id ?? body?.productId ?? "").trim();

  // userId: ưu tiên currentUser.id để tránh client giả mạo
  const userId = String(currentUser.id);

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ error: "Missing comment" }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating <= 0) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  // 1) Check đã từng review sản phẩm này chưa
  const existed = await prismadb.review.findFirst({
    where: { productId, userId } as any,
    select: { id: true },
  });

  if (existed) {
    return NextResponse.json(
      { error: "Already reviewed" },
      { status: 409 }
    );
  }

  // 2) Check đã mua và đơn đã delivered chưa
  // (đỡ phụ thuộc currentUser.orders có include hay không)
  const deliveredOrder = await prismadb.order.findFirst({
    where: {
      userId,
      deliveryStatus: "delivered",
      products: {
        some: { id: productId },
      },
    } as any,
    select: { id: true },
  });

  if (!deliveredOrder) {
    return NextResponse.json(
      { error: "You can only review after delivery" },
      { status: 403 }
    );
  }

  // 3) Create review
  const review = await prismadb.review.create({
    data: {
      comment,
      rating,
      productId,
      userId,
    } as any,
  });

  return NextResponse.json(review, { status: 201 });
}
