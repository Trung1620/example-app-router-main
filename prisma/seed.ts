import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Đang khởi tạo hệ thống dữ liệu (Bản sửa lỗi cấu trúc ảnh)...");

  const passwordAdmin = "123456";
  const hashed = await bcrypt.hash(passwordAdmin, 10);

  // 1. ADMIN
  const user = await prisma.user.upsert({
    where: { email: "admin@seedsbiz.com" },
    update: { hashedPassword: hashed },
    create: {
      email: "admin@seedsbiz.com",
      name: "Admin",
      role: "ADMIN",
      hashedPassword: hashed,
    },
  });

  // 2. ORG
  const org = await prisma.org.upsert({
    where: { code: "hanoi_branch" },
    update: {},
    create: {
      name: "Kho Mây Tre Hà Nội",
      code: "hanoi_branch",
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // 3. WAREHOUSE
  await prisma.warehouse.upsert({
    where: { orgId_code: { orgId: org.id, code: "KHO_CHINH" } },
    update: {},
    create: {
      orgId: org.id,
      name: "Kho Chính",
      code: "KHO_CHINH",
    },
  });

  // 4. SAMPLE PRODUCTS
  console.log("📦 Đang nạp lại 16 sản phẩm...");
  
  const sampleProducts = [
    { nameVi: "Giỏ quà Tết Xưa - Tre đan thủ công", sku: "TB-TET-01", priceVnd: 450000, img: "assets/Picture_Products/222099207565965340910.jpg" },
    { nameVi: "Hộp tre đựng quà Langfarm", sku: "TB-LF-02", priceVnd: 350000, img: "assets/Picture_Products/222099207565965340911.jpg" },
    { nameVi: "Set quà tặng thảo dược Chúc An", sku: "TB-CA-03", priceVnd: 550000, img: "assets/Picture_Products/222099207565965340913.jpg" },
    { nameVi: "Khay mây tròn cao cấp BL003", sku: "TB-R-04", priceVnd: 400000, img: "assets/Picture_Products/22209920756596534092.jpg" },
    { nameVi: "Giỏ tre túi xách lụa đỏ TX02", sku: "TB-B-05", priceVnd: 500000, img: "assets/Picture_Products/22209920756596534093.jpg" },
    { nameVi: "Rổ tre trang trí hoa thị", sku: "TB-B-06", priceVnd: 150000, img: "assets/Picture_Products/22209920756596534095.jpg" },
    { nameVi: "Đèn lồng tre thủ công Hội An", sku: "TB-L-07", priceVnd: 320000, img: "assets/Picture_Products/22209920756596534097.jpg" },
    { nameVi: "Bộ ấm trà tre ép cao cấp", sku: "TB-T-08", priceVnd: 850000, img: "assets/Picture_Products/22209920756596534098.jpg" },
    { nameVi: "Bình hoa mây đan GCH001", sku: "TB-V-09", priceVnd: 50000, img: "assets/Picture_Products/26505959606523302671.jpg" },
    { nameVi: "Set mẹt tre treo tường họa tiết", sku: "TB-W-10", priceVnd: 600000, img: "assets/Picture_Products/277183524997547323312.jpg" },
    { nameVi: "Hộp tre vuông nhỏ 12x12cm", sku: "TB-H-11", priceVnd: 30000, img: "assets/Picture_Products/27718352499754732334.jpg" },
    { nameVi: "Làn tre quai trúc xuất khẩu", sku: "TB-B-12", priceVnd: 100000, img: "assets/Picture_Products/27718352499754732336.jpg" },
    { nameVi: "Ống cắm bút tre tự nhiên", sku: "TB-O-13", priceVnd: 45000, img: "assets/Picture_Products/27718352499754732339.jpg" },
    { nameVi: "Khay trà tre chữ nhật", sku: "TB-K-14", priceVnd: 180000, img: "assets/Picture_Products/69647783701679762614.jpg" },
    { nameVi: "Lót ly mây đan tròn", sku: "TB-LL-15", priceVnd: 25000, img: "assets/Picture_Products/69647783701679762615.jpg" },
    { nameVi: "Thìa tre thủ công", sku: "TB-T-16", priceVnd: 15000, img: "assets/Picture_Products/69647783701679762616.jpg" },
  ];

  for (const p of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        orgId: org.id,
        nameVi: p.nameVi,
        priceVnd: p.priceVnd,
        images: [p.img],
        status: "ACTIVE"
      },
      create: {
        orgId: org.id,
        nameVi: p.nameVi,
        sku: p.sku,
        priceVnd: p.priceVnd,
        images: [p.img],
        status: "ACTIVE"
      }
    });
  }

  console.log("-------------------------------------------");
  console.log("✅ ĐÃ NẠP THÀNH CÔNG 16 SẢN PHẨM");
  console.log("-------------------------------------------");
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
