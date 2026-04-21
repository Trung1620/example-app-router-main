import { getOrgIdOrThrowServer } from "@/libs/getOrgId";
import getCurrentUser from "@/actions/getCurrentUser";
import prismadb from "@/libs/prismadb";
import { Permission } from "@prisma/client";

export type OrgMemberWithPerms = {
  id: string;
  role: any;
  permissions: { permission: Permission }[];
};

export async function requireMemberWithPerms(): Promise<{
  orgId: string;
  userId: string;
  member: OrgMemberWithPerms;
}> {
  const user = await getCurrentUser(); // nếu hàm này dùng cookies() / headers() thì ok
  if (!user?.id) throw new Error("Unauthorized");

  const orgId = await getOrgIdOrThrowServer(); // ✅ dùng bản server

  const member = await prismadb.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
    include: { permissions: { select: { permission: true } } },
  });

  if (!member) throw new Error("Not a member of this org");
  return { orgId, userId: user.id, member };
}