import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Tìm và xóa các sản phẩm bị lỗi ảnh trống [""] hoặc mảng rỗng []
    // Việc này giúp dọn dẹp các sản phẩm bị tạo thừa do bấm nút "Đồng bộ" nhiều lần
    const productsToDelete = await prismadb.product.findMany({
      where: {
        OR: [
          { images: { isEmpty: true } },
          { images: { equals: [] } },
          { images: { has: "" } }
        ]
      }
    });

    for (const p of productsToDelete) {
      await prismadb.product.delete({
        where: { id: p.id }
      });
    }

    // 2. Lấy lại danh sách sản phẩm sạch để kiểm tra
    const cleanProducts = await prismadb.product.findMany({
      select: {
        nameVi: true,
        images: true
      }
    });

    return NextResponse.json({
      message: `Đã dọn dẹp xong! Đã xóa ${productsToDelete.length} sản phẩm lỗi.`,
      totalRemaining: cleanProducts.length,
      products: cleanProducts
    });

  } catch (error: any) {
    console.error("[CLEAN_DB_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
