import prismadb from "@/libs/prismadb";
import { cookies } from "next/headers";

/**
 * Kiểm tra chuỗi có phải là MongoDB ObjectId hợp lệ không
 */
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function getOrgIdForApiOrThrow(req: Request, userId: string) {
    // Ưu tiên lấy từ header (Dành cho App Mobile)
    let orgId = req.headers.get("x-org-id");

    // Nếu không có, lấy từ cookie (Dành cho Web)
    if (!orgId) {
        const c = await cookies().catch(() => null);
        orgId = c?.get("active_org_id")?.value || null;
    }

    // Kiểm tra tính hợp lệ của ID trước khi truy vấn Database
    if (!orgId) {
        throw new Error("Missing orgId");
    }

    if (!isValidObjectId(orgId)) {
        throw new Error("Invalid orgId format");
    }

    // Tài khoản Admin hệ thống được phép truy cập mọi Org
    const user = await prismadb.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email === "admin@seedsbiz.com") {
        return { orgId, member: { id: "admin-bypass", role: "ADMIN" } };
    }

    const member = await prismadb.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId } },
        select: { id: true, role: true },
    });
    
    if (!member) throw new Error("Not a member of this organization");

    return { orgId, member };
}