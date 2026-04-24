import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

const COOKIE = "npat_session";

type SessionPayload = {
  p_id: string;
  g_id: string;
  host: "0" | "1";
  v: 1;
};

function getSecret() {
  return new TextEncoder().encode(getServerEnv().SESSION_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as Record<string, unknown>;
    if (p["v"] !== 1 || typeof p["p_id"] !== "string" || typeof p["g_id"] !== "string") {
      return null;
    }
    if (p["host"] !== "0" && p["host"] !== "1") {
      return null;
    }
    return {
      v: 1,
      p_id: p["p_id"] as string,
      g_id: p["g_id"] as string,
      host: p["host"] as "0" | "1",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return verifySession(raw);
}
