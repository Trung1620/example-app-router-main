import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    console.log(`[GET_PRODUCT_DETAIL] Đang lấy chi tiết cho sản phẩm ID: ${id}`);

    const product = await prismadb.product.findFirst({
      where: { id },
      include: { variants: true, stockBalances: true, category: true },
    });

    if (!product) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });

    // Ép link ảnh thật và làm phẳng dữ liệu để App dễ nhận
    const imgUrl = (product.images && product.images.length > 0) ? product.images[0] : "https://picsum.photos/400/300";
    
    // TRẢ VỀ TRỰC TIẾP ĐỐI TƯỢNG (Mở hộp)
    return NextResponse.json({
      ...product,
      image: imgUrl,
      inStock: product.stockBalances?.some((s: any) => s.qty > 0) ?? false,
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

      const stockCount = data.stockCount;
      delete data.stockCount;
      delete data.id;
      delete data.category;
      delete data.image;
      delete data.inStock;
      delete data.createdAt;
      delete data.updatedAt;

      if (data.images && Array.isArray(data.images)) {
        data.images = data.images.map((img: any) => typeof img === 'string' ? img : (img.url || ""));
      } else {
        delete data.images;
      }

      const existingProduct = await prismadb.product.findUnique({ where: { id } });
      if (!existingProduct) throw new Error("Không tìm thấy sản phẩm");

      const updated = await prismadb.product.update({
        where: { id },
        data: { ...data, variants: undefined, materialDetails: data.materialDetails || undefined },
      });

      if (typeof stockCount === 'number') {
         const warehouse = await prismadb.warehouse.findFirst({ where: { orgId: existingProduct.orgId } });
         if (warehouse) {
             const existingBalance = await prismadb.stockBalance.findFirst({
                 where: { warehouseId: warehouse.id, productId: id }
             });
             if (existingBalance) {
                 await prismadb.stockBalance.update({
                     where: { id: existingBalance.id },
                     data: { qty: stockCount }
                 });
             } else {
                 await prismadb.stockBalance.create({
                     data: {
                         orgId: existingProduct.orgId,
                         warehouseId: warehouse.id,
                         productId: id,
                         qty: stockCount
                     }
                 });
             }
         }
      }

      return NextResponse.json(updated);
    } catch (e: any) {
      console.error("PATCH PRODUCT ERROR:", e);
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    await prismadb.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}