import { headers } from "next/headers";
import { decryptSecret, encryptSecret } from "./lib/google-oauth";

export const KIYOTA_EMAIL = "da1206ri@gmail.com";
export const KIYOTA_SESSION_COOKIE = "kiyota_google_session";

function cookieFromHeader(value: string, name: string) {
  const pair = value.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

export async function createAuthorizedSession(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== KIYOTA_EMAIL) throw new Error("このGoogleアカウントでは利用できません");
  return encryptSecret(JSON.stringify({ email: normalizedEmail, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
}

export async function getAuthorizedGoogleEmail() {
  try {
    const requestHeaders = await headers();
    const encrypted = cookieFromHeader(requestHeaders.get("cookie") ?? "", KIYOTA_SESSION_COOKIE);
    if (!encrypted) return null;
    const session = JSON.parse(await decryptSecret(encrypted)) as { email?: string; expiresAt?: number };
    if (session.email?.trim().toLowerCase() !== KIYOTA_EMAIL || !session.expiresAt || session.expiresAt <= Date.now()) return null;
    return KIYOTA_EMAIL;
  } catch {
    return null;
  }
}

export async function requireAuthorizedApiUser() {
  if (!await getAuthorizedGoogleEmail()) return Response.json({ error: "Googleログインが必要です" }, { status: 401 });
  return null;
}
