import { jwtVerify } from "jose";

type AuthReason =
  | "ok"
  | "missing_token"
  | "missing_jwt_secret"
  | "missing_sub"
  | "verify_failed";

export async function getUserIdFromJWT(req: Request) {
  const debug = req.headers.get("x-debug-auth") === "1";

  const auth =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";

  const xAuth =
    req.headers.get("x-auth-token") ||
    req.headers.get("x-access-token") ||
    "";

  // ưu tiên Authorization trước, fallback qua x-auth-token
  let token = "";
  if (/^Bearer\s+/i.test(auth)) token = auth.replace(/^Bearer\s+/i, "").trim();
  else if (xAuth) token = xAuth.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return debug
      ? {
          userId: null,
          reason: "missing_token" as AuthReason,
          hasAuthHeader: !!auth,
          hasXAuthHeader: !!xAuth,
          authHeaderPrefix: auth ? auth.slice(0, 12) : "",
          xAuthPrefix: xAuth ? xAuth.slice(0, 12) : "",
          headerKeys: Array.from(req.headers.keys()),
        }
      : { userId: null, reason: "missing_token" as AuthReason };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { userId: null, reason: "missing_jwt_secret" as AuthReason };
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { clockTolerance: 10 }
    );

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) return { userId: null, reason: "missing_sub" as AuthReason };

    return { userId: sub, reason: "ok" as AuthReason };
  } catch (e: any) {
    return {
      userId: null,
      reason: "verify_failed" as AuthReason,
      detail: e?.name || e?.message || "Unknown",
    };
  }
}
