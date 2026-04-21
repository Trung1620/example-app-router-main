import { getUserIdFromJWT as _getUserIdFromJWT } from "@/libs/auth_jwt";

export async function getUserIdFromJWT(req: Request) {
  const auth =
    req.headers.get("authorization") ||
    req.headers.get("x-auth-token") ||
    "";
  const token = auth.replace("Bearer ", "").trim();
  return _getUserIdFromJWT(token);
}
