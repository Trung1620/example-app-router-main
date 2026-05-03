import { NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const products = await prismadb.product.findMany({
      select: {
        nameVi: true,
        images: true
      }
    });

    return NextResponse.json({
      products: products
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
