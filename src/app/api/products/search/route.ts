import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const orgId = searchParams.get("orgId");

    if (!q) return NextResponse.json({ items: [] });

    console.log(`[SEARCH_API] Đang tìm kiếm từ khóa: "${q}"`);

    const items = await prismadb.product.findMany({
      where: {
        // PHÁ RÀO: Tìm kiếm trên toàn bộ database để bạn thấy dữ liệu nạp
        OR: [
          { nameVi: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        images: { take: 1 },
        variants: true,
      },
    });

    return NextResponse.json({
      items: items.map((p) => {
        const imgUrl = p.images?.[0]?.url || p.image || "https://picsum.photos/400/300";
        return {
          ...p,
          id: p.id,
          nameVi: p.nameVi || p.nameEn || "(Chưa có tên)",
          sku: p.sku || "N/A",
          image: imgUrl, // Ép tên trường là 'image' để App nhận diện được
          thumb: imgUrl, // Giữ thêm 'thumb' để dự phòng
          priceVnd: p.priceVnd || 0,
          category: p.category || null,
        };
      }),
    });
  } catch (e: any) {
    console.error("SEARCH_ERROR", e);
    return NextResponse.json({ error: e.message, items: [] }, { status: 500 });
  }
}