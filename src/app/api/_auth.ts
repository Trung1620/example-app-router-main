import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import prismadb from "@/libs/prismadb";
import { getUserIdFromJWT, extractToken } from "@/libs/auth_jwt";
import { getOrgIdForApiOrThrow } from "./_org";

export async function getApiAuth(req: Request) {
  const token = extractToken(req);
  const jwt = await getUserIdFromJWT(token);
  if (jwt.userId) return { userId: jwt.userId, via: "jwt" as const };

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return { userId: null, via: "none" as const };

  const user = await prismadb.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user?.id) return { userId: null, via: "none" as const };

  return { userId: user.id, via: "session" as const };
}

export async function requireApiContext(req: Request) {
  const auth = await getApiAuth(req);
  if (!auth.userId) {
    throw new Error("Unauthorized");
  }

  const { orgId, member } = await getOrgIdForApiOrThrow(req, auth.userId);
  return { userId: auth.userId, orgId, member };
}
