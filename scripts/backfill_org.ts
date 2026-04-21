// scripts/backfill_org.ts
// Run:
//   npx prisma generate
//   npx ts-node scripts/backfill_org.ts
//
// Notes:
// - Prisma + MongoDB KHÔNG join được relation trong updateMany,
//   nên QuoteItem/DeliveryItem phải backfill theo cách: lấy parent rồi loop update con.

import { PrismaClient, OrgRole } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_CODE = process.env.ORG_CODE || "trangbamboo";
const ORG_NAME = process.env.ORG_NAME || "TrangBamboo";
const OWNER_EMAIL = process.env.OWNER_EMAIL; // optional

function log(...args: any[]) {
  console.log("[backfill_org]", ...args);
}

async function main() {
  log("start", { ORG_CODE, ORG_NAME, OWNER_EMAIL });

  // ===== 1) Find owner user =====
  let owner = null as null | { id: string; email: string | null };

  if (OWNER_EMAIL) {
    owner = await prisma.user.findFirst({
      where: { email: OWNER_EMAIL },
      select: { id: true, email: true },
    });
  }

  if (!owner) {
    // fallback: pick first admin/user with email
    owner =
      (await prisma.user.findFirst({
        where: { email: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true },
      })) || null;
  }

  if (!owner) {
    throw new Error(
      "Không tìm thấy user owner (cần ít nhất 1 user có email). Hãy set env OWNER_EMAIL hoặc tạo user trước."
    );
  }

  log("owner =", owner);

  // ===== 2) Ensure Org exists =====
  const org = await prisma.org.upsert({
    where: { code: ORG_CODE },
    create: { code: ORG_CODE, name: ORG_NAME },
    update: { name: ORG_NAME },
    select: { id: true, code: true },
  });

  log("org =", org);

  // ===== 3) Ensure OrgMember OWNER exists =====
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: owner.id } },
    create: { orgId: org.id, userId: owner.id, role: OrgRole.OWNER },
    update: { role: OrgRole.OWNER },
    select: { id: true },
  });

  log("ensured OrgMember OWNER");

  const orgId = org.id;

  // ===== 4) Backfill direct tables (orgId field exists on the model) =====
  // Chỉ update record nào orgId == null để an toàn.
  const summary: Record<string, number> = {};

  // Product
  {
    const r = await prisma.product.updateMany({
      where: { orgId: null },
      data: { orgId },
    });
    summary.Product = r.count;
    log("Product: updated", r.count);
  }

  // BlogPost
  {
    const r = await prisma.blogPost.updateMany({
      where: { orgId: null },
      data: { orgId },
    });
    summary.BlogPost = r.count;
    log("BlogPost: updated", r.count);
  }

  // Customer
  {
    const r = await prisma.customer.updateMany({
      where: { orgId: null },
      data: { orgId },
    });
    summary.Customer = r.count;
    log("Customer: updated", r.count);
  }

  // Quote
  {
    const r = await prisma.quote.updateMany({
      where: { orgId: null },
      data: { orgId },
    });
    summary.Quote = r.count;
    log("Quote: updated", r.count);
  }

  // Delivery
  {
    const r = await prisma.delivery.updateMany({
      where: { orgId: null },
      data: { orgId },
    });
    summary.Delivery = r.count;
    log("Delivery: updated", r.count);
  }

  // ===== 5) Backfill QuoteItem (MONGO NOTE: không join relation được trong updateMany) =====
  // Cách đúng: lấy danh sách Quote có orgId, rồi updateMany theo quoteId
  {
    const quotes = await prisma.quote.findMany({
      where: { orgId },
      select: { id: true },
    });

    let updated = 0;
    for (const q of quotes) {
      const r = await prisma.quoteItem.updateMany({
        where: { quoteId: q.id, orgId: null },
        data: { orgId },
      });
      updated += r.count;
    }

    summary.QuoteItem = updated;
    log("QuoteItem: updated", updated);
  }

  // ===== 6) Backfill DeliveryItem (loop theo Delivery) =====
  {
    const deliveries = await prisma.delivery.findMany({
      where: { orgId },
      select: { id: true },
    });

    let updated = 0;
    for (const d of deliveries) {
      const r = await prisma.deliveryItem.updateMany({
        where: { deliveryId: d.id, orgId: null },
        data: { orgId },
      });
      updated += r.count;
    }

    summary.DeliveryItem = updated;
    log("DeliveryItem: updated", updated);
  }

  log("DONE summary =", summary);

  console.log(`
NEXT:
1) Prisma Studio kiểm tra:
   - Quote/Delivery/QuoteItem/DeliveryItem mới tạo phải có orgId != null
   - Filter orgId is null => nên về 0 dần

2) Khi code đã filter theo orgId ổn định:
   - đổi orgId từ optional (?) -> required (bỏ dấu ?)
   - chạy prisma db push lần nữa (xem log index)
`);
}

main()
  .catch((e) => {
    console.error("[backfill_org] ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
