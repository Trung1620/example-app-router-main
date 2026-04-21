import prismadb from "@/libs/prismadb";
import { headers, cookies } from "next/headers";

/**
 * ✅ Dùng cho API route.ts (có Request)
 * App sẽ gửi x-org-id, server check user thuộc org đó
 */
export async function getOrgIdOrThrow(req: Request, userId: string) {
  const orgId = req.headers.get("x-org-id");
  if (!orgId) throw new Error("Missing x-org-id");

  const member = await prismadb.orgMember.findUnique({
    where: {
      orgId_userId: { orgId, userId },
    },
    select: { id: true, role: true },
  });

  if (!member) throw new Error("Not a member of this org");
  return { orgId, member };
}

/**
 * ✅ Dùng cho Server Component page.tsx
 */
export async function getOrgIdOrThrowServer() {
  const h = await headers();
  const c = await cookies();

  const orgId =
    h.get("x-org-id") ||
    c.get("active_org_id")?.value ||
    null;

  if (!orgId) {
    throw new Error("Missing orgId (x-org-id or active_org_id cookie).");
  }

  const org = await prismadb.org.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) throw new Error("Org not found");

  return orgId;
}