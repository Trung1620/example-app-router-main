import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Đang khởi tạo hệ thống trắng...");

  const passwordAdmin = "123456"; // [MẬT KHẨU ĐĂNG NHẬP MẶC ĐỊNH]
  const hashed = await bcrypt.hash(passwordAdmin, 10);

  // --------------------------------------------------------------------------
  // 1. TÀO KHOẢN QUẢN TRỊ (Admin)
  // --------------------------------------------------------------------------
  const user = await prisma.user.upsert({
    where: { email: "admin@seedsbiz.com" }, // ← [NHẬP EMAIL ADMIN TẠI ĐÂY]
    update: {
      hashedPassword: hashed,
    },
    create: {
      email: "admin@seedsbiz.com",          // ← [NHẬP LẠI EMAIL ADMIN]
      name: "Admin",                        // ← [NHẬP TÊN HIỂN THỊ CỦA BẠN]
      role: "ADMIN",                        // Quyền quản trị (Đừng sửa dòng này)
      hashedPassword: hashed,
    },
  });

  // --------------------------------------------------------------------------
  // 2. CƠ SỞ KINH DOANH (Organization)
  // --------------------------------------------------------------------------
  const org = await prisma.org.upsert({
    where: { code: "hanoi_branch" },        // ← [NHẬP MÃ CƠ SỞ - VIẾT LIỀN KHÔNG DẤU, VD: chinhanh1]
    update: {},
    create: {
      name: "Cơ sở Của Tôi",                // ← [NHẬP TÊN CỬA HÀNG/DOANH NGHIỆP]
      code: "hanoi_branch",                 // ← [NHẬP LẠI MÃ CƠ SỞ GIỐNG DÒNG TRÊN]
    },
  });

  // Kết nối bạn vào cơ sở với vai trò Chủ sở hữu (Owner)
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    update: {},
    create: {
      orgId: org.id,                       // (Tự động lấy ID cơ sở)
      userId: user.id,                     // (Tự động lấy ID admin)
      role: "OWNER",                       // Vai trò chủ sở hữu (Đừng sửa)
    },
  });

  // --------------------------------------------------------------------------
  // 3. KHO HÀNG (Warehouse)
  // --------------------------------------------------------------------------
  const warehouse = await prisma.warehouse.upsert({
    where: {
      orgId_code: {
        orgId: org.id,
        code: "KHO_CHINH",                 // ← [NHẬP MÃ KHO - VD: KHO_A]
      },
    },
    update: {},
    create: {
      orgId: org.id,                       // Thuộc về cơ sở trên
      name: "Kho Chính",                   // ← [NHẬP TÊN KHO - VD: Kho Tổng Quận 1]
      code: "KHO_CHINH",                   // ← [NHẬP LẠI MÃ KHO]
    },
  });

  // --------------------------------------------------------------------------
  // 4. CÀI ĐẶT WEBSITE (Site Settings)
  // --------------------------------------------------------------------------
  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site" }                  // Khởi tạo bảng cài đặt web (Bắt buộc)
  });

  console.log("-------------------------------------------");
  console.log("✅ HỆ THỐNG ĐÃ SẴN SÀNG");
  console.log("- Bạn đã có thể đăng nhập vào Web và App.");
  console.log("- Dữ liệu đang hoàn toàn trống để bạn tự thêm mới.");
  console.log("-------------------------------------------");
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
