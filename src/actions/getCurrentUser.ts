import { getServerSession } from "next-auth";
import { authOptions } from "../../libs/authOptions"; // ✅ Đảm bảo file này export đúng kiểu
import prisma from "../../libs/prismadb";
import { SafeUser } from "@/types";

export default async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.avatar,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? "", // ✅ Null-safe
      emailVerified: user.emailVerified?.toISOString() ?? null,
      orders: [],
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
