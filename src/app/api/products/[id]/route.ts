import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    console.log(`[GET_PRODUCT_DETAIL] Đang lấy chi tiết cho sản phẩm ID: ${id}`);

    const product = await prismadb.product.findFirst({
      where: { id },
      include: { images: true, variants: true, stockBalances: true },
    });

    if (!product) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });

    // Ép link ảnh thật và làm phẳng dữ liệu để App dễ nhận
    const imgUrl = product.images?.[0]?.url || product.image || "https://picsum.photos/400/300";
    
    // TRẢ VỀ TRỰC TIẾP ĐỐI TƯỢNG (Mở hộp)
    return NextResponse.json({
      ...product,
      image: imgUrl,
      inStock: product.stockBalances?.some(s => s.qty > 0) ?? false,
      priceVnd: product.priceVnd || (product.variants?.[0]?.priceVnd) || 0,
    });

  } catch (error: any) {
    console.error("GET_PRODUCT_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Giữ lại PATCH và DELETE nguyên bản nhưng bỏ yêu cầu Context nghiêm ngặt để Debug dễ hơn
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await ctx.params;
      const data = await req.json();
      const updated = await prismadb.product.update({
        where: { id },
        data: { ...data, images: undefined, variants: undefined }, // Tạm thời tối giản
      });
      return NextResponse.json(updated);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    await prismadb.image.deleteMany({ where: { productId: id } });
    await prismadb.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}