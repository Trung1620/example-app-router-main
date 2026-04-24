import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Đang khởi tạo hệ thống dữ liệu toàn diện cho Kho Mây Tre...");

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
  const warehouse = await prisma.warehouse.upsert({
    where: { orgId_code: { orgId: org.id, code: "KHO_CHINH" } },
    update: {},
    create: {
      orgId: org.id,
      name: "Kho Chính",
      code: "KHO_CHINH",
    },
  });

  // 4. SAMPLE SUPPLIERS
  console.log("🤝 Đang nạp Nhà cung cấp...");
  const supplier = await prisma.supplier.upsert({
    where: { code: "NCC_MAY_TRE" },
    update: {},
    create: {
      orgId: org.id,
      code: "NCC_MAY_TRE",
      name: "Vật Liệu Mây Tre Phương Nam",
      phone: "0912345678",
      address: "Chương Mỹ, Hà Nội",
    }
  });

  // 5. SAMPLE MATERIALS
  console.log("🌾 Đang nạp Nguyên vật liệu...");
  const materials = [
    { name: "Mây song loại 1", sku: "MAT-MAY-01", unit: "kg", price: 50000, stock: 500 },
    { name: "Nan tre 2mm", sku: "MAT-TRE-02", unit: "mét", price: 2000, stock: 1000 },
    { name: "Sơn bóng PU", sku: "MAT-SON-03", unit: "lít", price: 120000, stock: 50 },
  ];

  for (const m of materials) {
    await prisma.material.upsert({
      where: { sku: m.sku },
      update: { orgId: org.id, name: m.name, unit: m.unit, price: m.price, stock: m.stock, supplierId: supplier.id },
      create: { orgId: org.id, sku: m.sku, name: m.name, unit: m.unit, price: m.price, stock: m.stock, supplierId: supplier.id }
    });
  }

  // 6. SAMPLE ARTISANS
  console.log("👨‍🎨 Đang nạp Nghệ nhân...");
  const artisans = [
    { code: "THO-001", name: "Nguyễn Văn A", phone: "0987654321", skills: "Đan giỏ, Làm đèn", dailyWage: 250000 },
    { code: "THO-002", name: "Trần Thị B", phone: "0987654322", skills: "Sơn PU, Hoàn thiện", dailyWage: 220000 },
  ];

  for (const a of artisans) {
    await prisma.artisan.upsert({
      where: { code: a.code },
      update: { orgId: org.id, name: a.name, phone: a.phone, skills: a.skills, dailyWage: a.dailyWage, status: "ACTIVE" },
      create: { orgId: org.id, ...a, status: "ACTIVE" }
    });
  }

  // 7. SAMPLE CUSTOMERS
  console.log("👥 Đang nạp Khách hàng...");
  const customers = [
    { code: "KH-001", name: "Cửa hàng Lưu niệm Hội An", phone: "0235123456", address: "Trần Phú, Hội An" },
    { code: "KH-002", name: "Công ty Quà tặng BizGift", phone: "0287654321", address: "Quận 1, TP.HCM" },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { orgId: org.id, name: c.name, phone: c.phone, address: c.address },
      create: { orgId: org.id, ...c }
    });
  }

  // 8. SAMPLE PRODUCTS
  console.log("📦 Đang nạp 16 sản phẩm...");
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
      update: { orgId: org.id, nameVi: p.nameVi, priceVnd: p.priceVnd, images: [p.img], status: "ACTIVE", unit: "cái" },
      create: { orgId: org.id, nameVi: p.nameVi, sku: p.sku, priceVnd: p.priceVnd, images: [p.img], status: "ACTIVE", unit: "cái" }
    });
  }

  console.log("✅ ĐÃ NẠP TOÀN BỘ DỮ LIỆU MẪU");
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
