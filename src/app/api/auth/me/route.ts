import prismadb from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(req: Request) {
  try {
    // 1. Lấy token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập (Thiếu Token)" }, { status: 401 });
    }

    // 2. Giải mã Token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Cấu hình Server lỗi (JWT_SECRET)" }, { status: 500 });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(
        token, 
        new TextEncoder().encode(secret),
        { algorithms: ["HS256"] }
      );
      userId = payload.sub as string;
    } catch (jwtErr: any) {
      return NextResponse.json({ error: "Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." }, { status: 401 });
    }

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return NextResponse.json({ error: "Mã người dùng không hợp lệ" }, { status: 401 });
    }

    // 3. Truy vấn thông tin từ Database
    const user = await prismadb.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        avatar: true, 
        phone: true, 
        bio: true,
        createdAt: true,
        lastLoginAt: true
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại trên hệ thống" }, { status: 404 });
    }

    // 4. Đặc cách quyền Admin cho demo
    const cleanEmail = user.email?.toLowerCase();
    if (cleanEmail === "admin@seedbiz.com" || cleanEmail === "admin@seedsbiz.com") {
      (user as any).role = "ADMIN";
    }

    return NextResponse.json({ 
      user: {
        ...user,
        image: user.avatar // ✅ Đồng bộ image cho Front-end
      } 
    });


  } catch (globalErr: any) {
    console.error("[PROFILE_API_CRITICAL_ERROR]", globalErr);
    return NextResponse.json({ 
      error: "Lỗi hệ thống khi tải hồ sơ: " + (globalErr.message || "Lỗi không xác định") 
    }, { status: 500 });
  }
}

