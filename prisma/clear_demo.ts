import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Đang dọn dẹp dữ liệu mẫu...");

  const demoOrgCode = "hanoi_branch";
  const existingOrg = await prisma.org.findUnique({ where: { code: demoOrgCode } });

  if (existingOrg) {
    const orgId = existingOrg.id;
    console.log(`Tìm thấy cơ sở: ${existingOrg.name}. Đang xóa toàn bộ dữ liệu...`);
    
    // Vì chúng ta đã đặt Cascade Delete trong Schema, nên xóa Org sẽ xóa hết con.
    // Nhưng để chắc chắn, chúng ta xóa thủ công các dữ liệu chính.
    await prisma.stockBalance.deleteMany({ where: { orgId } });
    await prisma.productVariant.deleteMany({ where: { orgId } });
    await prisma.product.deleteMany({ where: { orgId } });
    await prisma.quote.deleteMany({ where: { orgId } });
    await prisma.customer.deleteMany({ where: { orgId } });
    await prisma.warehouse.deleteMany({ where: { orgId } });
    await prisma.orgMember.deleteMany({ where: { orgId } });
    await prisma.org.delete({ where: { id: orgId } });

    console.log("✅ Đã dọn dẹp sạch sẽ dữ liệu mẫu!");
  } else {
    console.log("ℹ️ Không tìm thấy dữ liệu mẫu (Có thể bạn đã xóa trước đó).");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
