import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/app/api/_auth";

export const dynamic = "force-dynamic";

// 1. Định nghĩa Interface để TypeScript hiểu cấu trúc dữ liệu từ Prisma
interface ProductVariantWithProduct {
    id: string;
    sku: string;
    name: string | null;
    size: string | null;
    color: string | null;
    productId: string | null;
    product: {
        id: string;
        nameVi: string | null;
        nameEn: string | null;
    } | null;
}

export async function GET(req: Request) {
    try {
        // 2. Kiểm tra quyền hạn và lấy orgId
        const { orgId } = await requireApiContext(req);

        // 3. Xử lý Query Parameters
        const url = new URL(req.url);
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const parsedTake = parseInt(url.searchParams.get("take") || "50", 10);
        const take = isNaN(parsedTake) ? 50 : Math.min(parsedTake, 200);

        // 4. Truy vấn Database
        // Ép kiểu rows về Interface đã định nghĩa để map() không bị lỗi (v)
        const rows = await prismadb.productVariant.findMany({
            where: {
                orgId,
                ...(q ? {
                    OR: [
                        { sku: { contains: q, mode: "insensitive" } },
                        { name: { contains: q, mode: "insensitive" } },
                        { product: { nameVi: { contains: q, mode: "insensitive" } } },
                        { product: { nameEn: { contains: q, mode: "insensitive" } } },
                    ]
                } : {}),
            },
            orderBy: { createdAt: "desc" },
            take,
            select: {
                id: true,
                sku: true,
                name: true,
                size: true,
                color: true,
                productId: true,
                product: {
                    select: {
                        id: true,
                        nameVi: true,
                        nameEn: true,
                    },
                },
            },
        }) as unknown as ProductVariantWithProduct[];

        // 5. Transform dữ liệu trả về cho Frontend
        const items = rows.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name ?? null,
            size: v.size ?? null,
            color: v.color ?? null,
            productId: v.productId ?? null,
            // Ưu tiên lấy tên tiếng Việt, nếu không có thì lấy tiếng Anh
            productName: v.product?.nameVi || v.product?.nameEn || "Không có tên",
        }));

        return NextResponse.json({ data: items }, { status: 200 });

    } catch (error: any) {
        // 6. Xử lý lỗi hệ thống hoặc lỗi xác thực
        console.error("Lỗi API /inventory/skus:", error);

        const errorMessage = error instanceof Error ? error.message : "Lỗi hệ thống không xác định";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}