import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET");
  return encoder.encode(s);
};

export async function signJwt(payload: { sub: string; email?: string }) {
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, secret(), {
    algorithms: ["HS256"],
  });

  return {
    userId: payload.sub as string,
    email: payload.email as string | undefined,
  };
}

type AuthResult =
  | { userId: string; email?: string }
  | { userId: null; reason: string };

export async function getUserIdFromJWT(token: string): Promise<AuthResult> {
  if (!token) {
    return { userId: null, reason: "missing_token" };
  }

  try {
    const payload = await verifyJwt(token);
    return { userId: payload.userId, email: payload.email };
  } catch (e) {
    return { userId: null, reason: "verify_failed" };
  }
}

export function extractToken(req: Request): string {
  const auth =
    req.headers.get("authorization") ||
    req.headers.get("x-auth-token") ||
    "";
  return auth.replace("Bearer ", "").trim();
}