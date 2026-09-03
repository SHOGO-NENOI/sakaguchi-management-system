import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { googleOAuthSettings } from "../../db/schema";

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function encryptionKey() {
  const { env } = await import("cloudflare:workers");
  const encoded = (env as unknown as Record<string, string>).GOOGLE_OAUTH_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Google連携の暗号化キーが設定されていません");
  const raw = base64ToBytes(encoded);
  if (raw.byteLength !== 32) throw new Error("Google連携の暗号化キーが正しくありません");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  if (!value) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  const output = new Uint8Array(iv.length + cipher.byteLength);
  output.set(iv);
  output.set(new Uint8Array(cipher), iv.length);
  return bytesToBase64(output);
}

export async function decryptSecret(value: string) {
  if (!value) return "";
  const input = base64ToBytes(value);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: input.slice(0, 12) }, await encryptionKey(), input.slice(12));
  return new TextDecoder().decode(plain);
}

export async function getGoogleOAuthSettings() {
  const db = await getDb();
  return db.query.googleOAuthSettings.findFirst({ where: eq(googleOAuthSettings.id, 1) });
}

export function oauthRedirectUri(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/google/callback`;
}

export function oauthCookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const pair = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}
