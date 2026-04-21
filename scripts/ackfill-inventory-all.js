/* scripts/backfill-inventory-all.js */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = "6969e32cb823742ce1784664";

function slugify(s) {
    return String(s || "")
        .trim()
        .toLowerCase()
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || `wh-${Date.now()}`;
}

async function ensureWarehouseOrgIdAndCode() {
    const rows = await prisma.warehouse.findMany({
        select: { id: true, orgId: true, name: true, code: true },
        orderBy: { createdAt: "asc" },
    });

    // build used codes within ORG_ID
    const used = new Set();
    for (const w of rows) {
        if (w.orgId === ORG_ID && w.code) used.add(w.code);
    }

    let updated = 0;

    for (const w of rows) {
        // set orgId if missing
        const needOrg = !w.orgId;
        // set code if missing OR duplicate inside org
        let code = w.code ? String(w.code) : "";
        if (!code) code = slugify(w.name);
        let base = code;
        let i = 1;
        while (used.has(code)) {
            code = `${base}-${i++}`;
        }

        const needCode = !w.code || (w.orgId === ORG_ID && code !== w.code);

        if (needOrg || needCode) {
            await prisma.warehouse.update({
                where: { id: w.id },
                data: {
                    orgId: needOrg ? ORG_ID : undefined,
                    code: needCode ? code : undefined,
                },
            });
            used.add(code);
            updated++;
        }
    }

    console.log("✅ Warehouses updated:", updated);
}

async function backfillBalancesMovesByWarehouseOrg() {
    // lấy map warehouseId -> orgId
    const warehouses = await prisma.warehouse.findMany({
        select: { id: true, orgId: true },
    });
    const whMap = new Map(
        warehouses
            .filter((w) => w.orgId)
            .map((w) => [String(w.id), String(w.orgId)])
    );

    // 1) StockBalance: fill orgId theo warehouseId
    const balances = await prisma.stockBalance.findMany({
        select: { id: true, orgId: true, warehouseId: true },
    });

    let balUpdated = 0;
    for (const b of balances) {
        if (b.orgId) continue;
        const wid = b.warehouseId ? String(b.warehouseId) : "";
        const oid = wid ? whMap.get(wid) : null;
        if (!oid) continue;

        await prisma.stockBalance.update({
            where: { id: b.id },
            data: { orgId: oid },
        });
        balUpdated++;
    }
    console.log("✅ StockBalance orgId filled:", balUpdated);

    // 2) StockMove: fill orgId theo warehouseId (nếu thiếu)
    const moves = await prisma.stockMove.findMany({
        select: { id: true, orgId: true, warehouseId: true },
    });

    let moveUpdated = 0;
    for (const m of moves) {
        if (m.orgId) continue;
        const wid = m.warehouseId ? String(m.warehouseId) : "";
        const oid = wid ? whMap.get(wid) : null;
        if (!oid) continue;

        await prisma.stockMove.update({
            where: { id: m.id },
            data: { orgId: oid },
        });
        moveUpdated++;
    }
    console.log("✅ StockMove orgId filled:", moveUpdated);

    // 3) StockMoveItem: fill orgId theo stockMove.orgId
    const moveItems = await prisma.stockMoveItem.findMany({
        select: { id: true, orgId: true, stockMoveId: true },
    });

    // map moveId -> orgId (sau backfill moves)
    const moves2 = await prisma.stockMove.findMany({
        select: { id: true, orgId: true },
    });
    const moveMap = new Map(
        moves2.filter((m) => m.orgId).map((m) => [String(m.id), String(m.orgId)])
    );

    let itemUpdated = 0;
    for (const it of moveItems) {
        if (it.orgId) continue;
        const mid = String(it.stockMoveId);
        const oid = moveMap.get(mid);
        if (!oid) continue;

        await prisma.stockMoveItem.update({
            where: { id: it.id },
            data: { orgId: oid },
        });
        itemUpdated++;
    }
    console.log("✅ StockMoveItem orgId filled:", itemUpdated);
}

async function main() {
    console.log("🔄 Backfill inventory + orgId");
    console.log("ORG_ID:", ORG_ID);

    await ensureWarehouseOrgIdAndCode();
    await backfillBalancesMovesByWarehouseOrg();

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
