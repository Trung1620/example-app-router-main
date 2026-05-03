import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Lấy tất cả sản phẩm để xử lý trong Javascript (tránh lỗi query trực tiếp vào DB)
    const allProducts = await prismadb.product.findMany();

    // 2. Tìm một sản phẩm bất kỳ đã có OrgId hợp lệ (không phải rỗng)
    const validProduct = allProducts.find(p => p.orgId && p.orgId.length > 5);

    if (!validProduct) {
      return NextResponse.json({ error: "Không tìm thấy xưởng nào. Hãy tạo mới 1 sản phẩm trên App trước." });
    }

    const targetOrgId = validProduct.orgId;

    const cloudinaryUrls = [
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796703/seedsbiz/products/123969957078958096612.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796706/seedsbiz/products/123969957078958096613.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796708/seedsbiz/products/123969957078958096614.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796709/seedsbiz/products/13338849589349705986.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796711/seedsbiz/products/14016065314708280233.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796712/seedsbiz/products/14016065314708280234.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796713/seedsbiz/products/14016065314708280235.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796715/seedsbiz/products/339168384110010825210.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796716/seedsbiz/products/339168384110010825211.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796717/seedsbiz/products/33916838411001082527.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796718/seedsbiz/products/33916838411001082528.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796718/seedsbiz/products/33916838411001082529.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796720/seedsbiz/products/345364453073535520115.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796721/seedsbiz/products/345364453073535520116.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796722/seedsbiz/products/370399603083268577117.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796723/seedsbiz/products/370399603083268577118.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796724/seedsbiz/products/370399603083268577119.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796725/seedsbiz/products/370399603083268577120.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796726/seedsbiz/products/370399603083268577121.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796727/seedsbiz/products/370399603083268577122.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796728/seedsbiz/products/5338872726882766911.jpg",
      "https://res.cloudinary.com/dgvlkztox/image/upload/v1777796729/seedsbiz/products/5338872726882766912.jpg"
    ];

    // 3. Cập nhật tất cả sản phẩm về chung OrgId này
    let updateCount = 0;
    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      const imageUrl = cloudinaryUrls[i % cloudinaryUrls.length];
      
      await prismadb.product.update({
        where: { id: p.id },
        data: { 
          orgId: targetOrgId,
          images: (p.images && p.images.length > 0 && p.images[0].startsWith("http")) ? p.images : [imageUrl]
        }
      });
      updateCount++;
    }

    return NextResponse.json({
      message: `Đã dọn dẹp và gom ${updateCount} sản phẩm về xưởng của bạn!`,
      orgId: targetOrgId
    });
  } catch (error: any) {
    console.error("[SYNC_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
