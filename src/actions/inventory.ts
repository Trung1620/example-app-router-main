"use server";

import prismadb from "@/libs/prismadb";
import { getOrgIdOrThrowServer } from "@/libs/getOrgId";
import getCurrentUser from "@/actions/getCurrentUser";

export async function getStockBalanceByWarehouse(warehouseId: string) {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error("Unauthorized");

    const orgId = await getOrgIdOrThrowServer();

    const member = await prismadb.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: user.id } },
        select: { id: true },
    });
    if (!member) throw new Error("Not a member of this org");

    const wh = await prismadb.warehouse.findFirst({
        where: { id: warehouseId, orgId } as any,
        select: { id: true },
    });
    if (!wh) throw new Error("Warehouse not found");

    const rows = await prismadb.stockBalance.findMany({
        where: { orgId, warehouseId } as any,
        orderBy: { updatedAt: "desc" },
        include: {
            warehouse: true,
            product: { include: { images: true } },
            variant: true,
        },
    });

    return rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        variantId: r.variantId,
        qty: r.qty,
        updatedAt: r.updatedAt.toISOString(),
        product: r.product
            ? {
                id: r.product.id,
                nameVi: r.product.nameVi,
                nameEn: r.product.nameEn,
                brand: r.product.brand,
                category: r.product.category,
                priceVnd: r.product.priceVnd,
                imageUrl: r.product.images?.[0]?.url || null,
            }
            : null,
        variant: r.variant
            ? {
                id: r.variant.id,
                sku: r.variant.sku,
                name: r.variant.name,
                size: r.variant.size,
                color: r.variant.color,
                priceVnd: r.variant.priceVnd,
            }
            : null,
        warehouse: { id: r.warehouse.id, name: r.warehouse.name },
    }));
}