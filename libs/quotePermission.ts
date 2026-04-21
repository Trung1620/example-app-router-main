import prismadb from "@/libs/prismadb";
import type { OrgRole, Permission } from "@prisma/client";

type RequireQuotePermissionParams = {
  orgId: string;
  userId: string;
  allowRoles?: OrgRole[];
  allowPermissions?: Permission[];
};

export async function requireQuotePermission({
  orgId,
  userId,
  allowRoles = ["OWNER", "ADMIN"],
  allowPermissions = [],
}: RequireQuotePermissionParams) {
  const member = await prismadb.orgMember.findUnique({
    where: {
      orgId_userId: { orgId, userId },
    },
    select: {
      id: true,
      role: true,
      permissions: {
        select: {
          permission: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error("Not a member of this org");
  }

  // ✅ 1. Check role trước
  if (allowRoles.length > 0 && allowRoles.includes(member.role)) {
    return member;
  }

  // ✅ 2. Check permission
  if (allowPermissions.length > 0) {
    const ownedPermissions = new Set(
      member.permissions.map((p) => p.permission)
    );

    const hasPermission = allowPermissions.some((p) =>
      ownedPermissions.has(p)
    );

    if (hasPermission) {
      return member;
    }
  }

  // ❌ 3. Fail
  throw new Error(
    `Permission denied (role=${member.role}, orgId=${orgId})`
  );
}