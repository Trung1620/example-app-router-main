// src/app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 200);

  const items = await prisma.product.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nameVi: true,
      images: { select: { url: true } }, // ← GIỐNG homepage
      // thumbnailUrl: true, // nếu có, có thể bật
    },
  });

  const mapped = items.map((p) => ({
    id: p.id,
    nameVi: p.nameVi,
    imageUrl: /* ưu tiên thumbnail, sau đó ảnh đầu */ (p as any).thumbnailUrl ?? p.images?.[0]?.url ?? "/placeholder.png",
  }));

  return NextResponse.json(mapped);
}
