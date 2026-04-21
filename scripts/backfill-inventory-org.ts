import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ORG_ID = "6969e32cb823742ce1784664";

// slugify đơn giản
function slugify(s: string) {
    return String(s || "")
        .trim()
        .toLowerCase()
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || `wh-${Date.now()}`;
}

async function backfillWarehouses(orgId: string) {
    // đọc tất cả warehouse để build map + code unique
    const rows = await prisma.warehouse.findMany({
        select: { id: true, name: true, code: true, orgId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
    });

    // set code đã dùng trong org hiện tại
    const used = new Set<string>();
    for (const w of rows) {
        if (w.orgId === orgId && w.code) used.add(w.code);
    }

    let updated = 0;

    for (const w of rows) {
        const needOrg = !w.orgId; // null/undefined
        const needCode = !w.code || !String(w.code).trim();

        // chỉ set orgId cho những record chưa có orgId (an toàn SaaS)
        if (!needOrg && !needCode) continue;

        // tạo code unique nếu thiếu
        let base = slugify(w.code || w.name || "warehouse");
        let code = base;
        let i = 1;
        while (used.has(code)) code = `${base}-${i++}`;
        used.add(code);

        await prisma.warehouse.update({
            where: { id: w.id },
            data: {
                orgId: needOrg ? orgId : undefined,
                code: needCode ? code : undefined,
            } as any,
        });

        updated++;
    }

    return updated;
}

async function buildWarehouseOrgMap() {
    const warehouses = await prisma.warehouse.findMany({
        select: { id: true, orgId: true },
    });

    const map = new Map<string, string>();
    for (const w of warehouses) {
        if (w.orgId) map.set(String(w.id), String(w.orgId));
    }
    return map;
}

/**
 * Prisma Mongo: optional field có thể "missing" chứ không phải null.
 * -> dùng OR: [{orgId: null},{orgId: {isSet:false}}]
 */
function whereOrgMissing() {
    return {
        OR: [{ orgId: null }, { orgId: { isSet: false } }],
    } as any;
}

async function backfillStockBalances(whMap: Map<string, string>) {
    const rows = await prisma.stockBalance.findMany({
        where: whereOrgMissing(),
        select: { id: true, orgId: true, warehouseId: true },
    });

    let updated = 0;

    for (const r of rows) {
        const wid = r.warehouseId ? String(r.warehouseId) : "";
        const orgId = wid ? whMap.get(wid) : null;

        // nếu record mồ côi (không có warehouseId) thì skip
        if (!orgId) continue;

        await prisma.stockBalance.update({
            where: { id: r.id },
            data: { orgId },
        } as any);

        updated++;
    }

    return updated;
}

async function backfillStockMoves(whMap: Map<string, string>) {
    const rows = await prisma.stockMove.findMany({
        where: whereOrgMissing(),
        select: { id: true, orgId: true, warehouseId: true },
    });

    let updated = 0;

    for (const r of rows) {
        const wid = r.warehouseId ? String(r.warehouseId) : "";
        const orgId = wid ? whMap.get(wid) : null;
        if (!orgId) continue;

        await prisma.stockMove.update({
            where: { id: r.id },
            data: { orgId },
        } as any);

        updated++;
    }

    return updated;
}

async function backfillStockMoveItemsFromMove() {
    // build map moveId -> orgId
    const moves = await prisma.stockMove.findMany({
        select: { id: true, orgId: true },
    });

    const moveMap = new Map<string, string>();
    for (const m of moves) {
        if (m.orgId) moveMap.set(String(m.id), String(m.orgId));
    }

    const items = await prisma.stockMoveItem.findMany({
        where: whereOrgMissing(),
        select: { id: true, stockMoveId: true },
    });

    let updated = 0;

    for (const it of items) {
        const mid = String(it.stockMoveId);
        const orgId = moveMap.get(mid);
        if (!orgId) continue;

        await prisma.stockMoveItem.update({
            where: { id: it.id },
            data: { orgId },
        } as any);

        updated++;
    }

    return updated;
}

async function main() {
    console.log("🔄 Backfill inventory orgId + warehouse.code");
    console.log("ORG_ID:", ORG_ID);

    const whUpdated = await backfillWarehouses(ORG_ID);
    console.log("✅ Warehouses updated:", whUpdated);

    const whMap = await buildWarehouseOrgMap();

    const balUpdated = await backfillStockBalances(whMap);
    console.log("✅ StockBalance orgId filled:", balUpdated);

    const moveUpdated = await backfillStockMoves(whMap);
    console.log("✅ StockMove orgId filled:", moveUpdated);

    const itemUpdated = await backfillStockMoveItemsFromMove();
    console.log("✅ StockMoveItem orgId filled:", itemUpdated);

    console.log("🎉 Done");
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
