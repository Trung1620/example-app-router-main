import prismadb from "@/libs/prismadb";
import { cookies } from "next/headers";

/**
 * Kiểm tra chuỗi có phải là MongoDB ObjectId hợp lệ không
 */
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function getOrgIdForApiOrThrow(req: Request, userId: string) {
    try {
        // 1. Lấy orgId từ header (Bắt buộc cho App Mobile)
        let orgId = req.headers.get("x-org-id") || req.headers.get("X-Org-Id");

        // 2. Kiểm tra tính hợp lệ của userId (Tránh crash Prisma MongoDB)
        if (!userId || !isValidObjectId(userId)) {
            throw new Error("Invalid or missing userId");
        }

        // 3. KIỂM TRA QUYỀN ADMIN TỐI CAO (BYPASS SỚM NHẤT)
        // Lấy thông tin user để check email/role
        const user = await prismadb.user.findUnique({ 
            where: { id: userId }, 
            select: { email: true, role: true } 
        }).catch(() => null);

        const email = user?.email?.toLowerCase();
        const isGlobalAdmin = email === "admin@seedbiz.com" || email === "admin@seedsbiz.com" || user?.role === "ADMIN";

        if (isGlobalAdmin) {
            // Nếu là Admin, dùng orgId từ header nếu có, nếu không thì lấy đại một cái (vì admin xem được hết)
            return { orgId: orgId || "admin-bypass-org", member: { id: "admin-bypass", role: "ADMIN" } };
        }

        // 4. KIỂM TRA THÔNG TIN XƯỞNG (CHO USER THƯỜNG)
        if (!orgId) {
            throw new Error("Missing x-org-id header");
        }

        if (!isValidObjectId(orgId)) {
            throw new Error("Invalid orgId format");
        }

        const member = await prismadb.orgMember.findUnique({
            where: { orgId_userId: { orgId, userId } },
        }).catch((err: any) => {
            console.error("DB_ORG_MEMBER_ERROR", err);
            return null;
        });

        
        if (!member) throw new Error("Not a member of this organization");
        
        const m = member as any;
        if (m.status && m.status !== "ACTIVE") {
            throw new Error("Tài khoản đang chờ duyệt hoặc bị khóa");
        }

        return { orgId, member };
    } catch (error: any) {
        console.error("[GET_ORG_ERROR]", error.message);
        throw error; // Ném tiếp để route catch và trả về 500/403 kèm message
    }
}

