import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const { orgId } = await requireApiContext(req as any);
    
    const products = await prismadb.product.findMany({
      where: {
        orgId,
        ...(q ? {
          OR: [
            { nameVi: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } }
          ]
        } : {})
      },
      include: {
        stockBalances: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const items = products.map(p => {
      const imgUrl = p.images?.[0] || "https://picsum.photos/400/300";
      return {
        ...p,
        image: imgUrl,
        images: p.images?.length > 0 ? p.images.map(url => ({ url })) : [{ url: imgUrl }],
        stockCount: p.stockBalances?.reduce((acc: number, curr: any) => acc + (curr.qty || 0), 0) || 0,
      };
    });

    return NextResponse.json({ 
      items: items, 
      products: items 
    });

  } catch (error: any) {
    console.error("CRITICAL_PRODUCTS_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { orgId } = await requireApiContext(req as any);
    const body = await req.json();
    const { 
      nameVi, 
      sku, 
      nameEn, 
      descriptionVi, 
      priceVnd, 
      costPriceVnd, 
      priceUsd, 
      size, 
      brand, 
      category, 
      inStock, 
      status, 
      images, 
      boms 
    } = body;

    const product = await prismadb.product.create({
      data: {
        orgId,
        nameVi,
        sku,
        nameEn,
        descriptionVi,
        priceVnd,
        costPriceVnd,
        priceUsd,
        size,
        brand,
        category,
        inStock,
        status: status || "PUBLISHED",
        images: {
          create: Array.isArray(images) ? images.map((img: any) => ({
            url: img.url,
            colorName: img.colorName || "default",
            colorCode: img.colorCode || "#000000"
          })) : []
        },
        boms: {
          create: Array.isArray(boms) ? boms.map((b: any) => ({
            materialId: b.materialId,
            quantity: parseFloat(b.quantity || 0)
          })) : []
        }
      },
      include: {
        images: true,
        boms: true
      }
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("PRODUCT_POST_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}