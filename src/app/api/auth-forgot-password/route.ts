import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/libs/prismadb";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email là bắt buộc" }, { status: 400 });
    }

    const user = await prismadb.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Vì lý do bảo mật, chúng ta vẫn báo thành công để tránh bị dò quét Email
      return NextResponse.json({ message: "Nếu email tồn tại, một mã khôi phục sẽ được gửi đến bạn." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 giờ sau

    await prismadb.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TRONG THỰC TẾ: Gửi email ở đây
    console.log(`[FORGOT_PASSWORD] Reset token for ${email}: ${resetToken}`);

    return NextResponse.json({ 
      message: "Yêu cầu khôi phục mật khẩu đã được gửi.",
      // Chỉ trả về token ở môi trường dev để test
      token: process.env.NODE_ENV === "development" ? resetToken : undefined 
    });
  } catch (err) {
    console.error("[FORGOT_PASSWORD_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
