/* scripts/backfill-product-variants.ts */
import prismadb from "@/libs/prismadb";

/**
 * Mục tiêu:
 * - Với mỗi Product (orgId) chưa có ProductVariant => tạo 1 variant mặc định
 * - SKU unique theo @@unique([orgId, sku])
 *
 * SKU đề xuất: TB-<last6ProductId>-01 (đủ ngắn, dễ nhìn)
 */

function makeBaseSku(productId: string) {
    const tail = String(productId).slice(-6).toUpperCase();
    return `TB-${tail}`;
}

async function main() {
    // Nếu bạn muốn giới hạn 1 org cụ thể:
    // const ONLY_ORG_ID = process.env.ORG_ID?.trim() || "";
    const ONLY_ORG_ID = "6969e32cb823742ce1784664";

    const products = await prismadb.product.findMany({
        where: ONLY_ORG_ID ? ({ orgId: ONLY_ORG_ID } as any) : ({ orgId: { not: null } } as any),
        select: { id: true, orgId: true, nameVi: true, nameEn: true, size: true },
        orderBy: { createdAt: "desc" },
    });

    let created = 0;
    let skippedHasVariant = 0;
    let skippedNoOrg = 0;

    for (const p of products) {
        if (!p.orgId) {
            skippedNoOrg++;
            continue;
        }

        const orgId = String(p.orgId);
        const productId = String(p.id);

        const count = await prismadb.productVariant.count({
            where: { orgId, productId } as any,
        });

        if (count > 0) {
            skippedHasVariant++;
            continue;
        }

        // SKU unique trong org
        const base = makeBaseSku(productId);
        let sku = `${base}-01`;
        let i = 1;

        while (true) {
            const existed = await prismadb.productVariant.findFirst({
                where: { orgId, sku } as any,
                select: { id: true },
            });
            if (!existed) break;

            i += 1;
            sku = `${base}-${String(i).padStart(2, "0")}`;
            if (i > 99) throw new Error(`Too many SKU conflicts for productId=${productId}`);
        }

        await prismadb.productVariant.create({
            data: {
                orgId,
                productId,
                sku,
                name: "Default",
                size: p.size ?? null,
                // color: null,
                // priceVnd: null,
            } as any,
        });

        created++;
        if (created % 50 === 0) {
            console.log(`[progress] created=${created}`);
        }
    }

    console.log("✅ DONE");
    console.log({ created, skippedHasVariant, skippedNoOrg, totalProducts: products.length });
}

main()
    .catch((e) => {
        console.error("❌ FAILED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prismadb.$disconnect();
    });