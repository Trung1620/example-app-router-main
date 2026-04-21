// src/app/api/debug-seed/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Thêm ?orgId=..." }, { status: 400 });

    const warehouse = await prismadb.warehouse.upsert({
      where: { orgId_code: { orgId, code: "KHO-01" } },
      update: {},
      create: { orgId, code: "KHO-01", name: "Kho TrangBamboo", address: "Hà Nội" }
    });

    // DANH SÁCH SẢN PHẨM PHONG CÁCH TRANGBAMBOO KHỚP VỚI ẢNH CỦA BẠN
    const bambooProducts = [
      { name: "Giỏ Tre 2 Tầng Thủ Công", file: "222099207565965340910.jpg", category: "Giỏ Quà", price: 250000 },
      { name: "Làn Tre Quai Trúc Cao Cấp", file: "222099207565965340911.jpg", category: "Làn Tre", price: 185000 },
      { name: "Giỏ Tre Nắp Lồng Chim", file: "222099207565965340913.jpg", category: "Giỏ Decor", price: 320000 },
      { name: "Giỏ Quà Tết Chữ Nhật", file: "22209920756596534092.jpg", category: "Giỏ Quà", price: 150000 },
      { name: "Khay Mây Tròn Đan Kỹ", file: "22209920756596534093.jpg", category: "Khay Mây", price: 210000 },
      { name: "Túi Xách Tre Thời Trang", file: "22209920756596534095.jpg", category: "Túi Xách", price: 450000 },
      { name: "Hộp Trà Tre Khắc Logo", file: "22209920756596534097.jpg", category: "Hộp Quà", price: 120000 },
      { name: "Đĩa Mây Trang Trí", file: "22209920756596534098.jpg", category: "Đồ Decor", price: 95000 },
      { name: "Giỏ Tre Nắp Lồi", file: "26505959606523302671.jpg", category: "Giỏ Quà", price: 175000 },
      { name: "Lồng Đèn Mây Tre", file: "277183524997547323312.jpg", category: "Đèn Decor", price: 280000 },
      { name: "Bộ 3 Khay Mây Xuất Khẩu", file: "27718352499754732334.jpg", category: "Khay Mây", price: 650000 },
      { name: "Làn Tre Đi Lễ", file: "27718352499754732336.jpg", category: "Làn Tre", price: 195000 },
      { name: "Giỏ Picnic Mây Tre", file: "27718352499754732339.jpg", category: "Giỏ Decor", price: 380000 },
      { name: "Đế Lót Ly Mây", file: "69647783701679762614.jpg", category: "Đồ Gia Dụng", price: 45000 },
      { name: "Kệ Trưng Bày Tre", file: "69647783701679762615.jpg", category: "Nội Thất Nhẹ", price: 550000 },
      { name: "Ống Đựng Bút Tre", file: "69647783701679762616.jpg", category: "Văn Phòng Phẩm", price: 65000 }
    ];

    const baseUrl = "http://192.168.1.120:3000";

    for (let i = 0; i < bambooProducts.length; i++) {
        const p = bambooProducts[i];
        const skyName = `TB-${100 + i}`;
        const finalUrl = `${baseUrl}/products/${p.file}`;

        // DỌN DẸP SẠCH THEO SKU
        const existing = await prismadb.product.findMany({ where: { orgId, sku: skyName }, select: { id: true } });
        const ids = existing.map(e => e.id);
        if (ids.length > 0) {
            await prismadb.stockBalance.deleteMany({ where: { productId: { in: ids } } });
            await prismadb.image.deleteMany({ where: { productId: { in: ids } } });
            await prismadb.productVariant.deleteMany({ where: { productId: { in: ids } } });
            await prismadb.product.deleteMany({ where: { id: { in: ids } } });
        }

        // TẠO MỚI SẢN PHẨM THẬT
        const prod = await prismadb.product.create({
            data: {
                orgId,
                sku: skyName,
                nameVi: p.name,
                category: p.category,
                priceVnd: p.price,
                status: "ACTIVE",
                images: { create: { url: finalUrl, colorName: "Mặc định", colorCode: "#B5A48F" } }
            }
        });

        const variant = await prismadb.productVariant.create({
            data: { orgId, productId: prod.id, sku: skyName, name: "Tiêu chuẩn", priceVnd: p.price }
        });

        await prismadb.stockBalance.create({
            data: { orgId, warehouseId: warehouse.id, productId: prod.id, variantId: variant.id, qty: 100 }
        });
    }

    return NextResponse.json({ success: true, message: "Đã nạp 16 sản phẩm định danh TrangBamboo kèm Ảnh Thật thành công!" });

  } catch (error: any) {
    console.error("SEED_TB_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
