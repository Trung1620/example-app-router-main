import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const products = await prismadb.product.findMany();
    let updateCount = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      // Nếu sản phẩm không có ảnh, hoặc mảng trống, hoặc chứa dấu rỗng "", hoặc link assets cũ
      const hasNoImage = !p.images || p.images.length === 0 || p.images.includes("") || (p.images[0] && p.images[0].includes("assets/"));
      
      if (hasNoImage) {
        const imageUrl = cloudinaryUrls[i % cloudinaryUrls.length];
        await prismadb.product.update({
          where: { id: p.id },
          data: { 
            images: [imageUrl]
          }
        });
        updateCount++;
      }
    }

    return NextResponse.json({
      message: `Đã cập nhật ảnh thành công cho ${updateCount} sản phẩm!`,
      totalProducts: products.length
    });
  } catch (error: any) {
    console.error("[FIX_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
