export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import prismadb from "@/libs/prismadb";
import { getApiAuth } from "@/app/api/_auth";

export async function POST(req: Request) {
  try {
    // 🔐 Auth
    const auth = await getApiAuth(req);

    if (!auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🍪 Lấy orgId từ cookie
    const cookieStore = await cookies();
    const orgId = cookieStore.get("active_org_id")?.value;

    if (!orgId) {
      return NextResponse.json(
        { error: "No active organization selected" },
        { status: 400 }
      );
    }

    // 📦 Parse body
    const body = await req.json();

    const {
      nameVi,
      nameEn,
      descriptionVi,
      descriptionEn,
      priceVnd,
      priceUsd,
      size,
      brand,
      category,
      inStock,
      images,
    } = body;

    // ⚠️ Validate cơ bản
    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "Images are required" },
        { status: 400 }
      );
    }

    // 🔐 Check user có thuộc org không
    const member = await prismadb.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: auth.userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    // ✅ Create product
    const product = await prismadb.product.create({
      data: {
        orgId, // 🔥 QUAN TRỌNG

        nameVi,
        nameEn,
        descriptionVi,
        descriptionEn,
        priceVnd,
        priceUsd,
        size,
        brand,
        category,
        inStock,

        images: {
          create: images.map((img: any) => ({
            color: img.color,
            colorCode: img.colorCode,
            image: img.image,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(product);
  } 
  
  catch (error) {
    console.error("PRODUCT_CREATE_ERROR", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}