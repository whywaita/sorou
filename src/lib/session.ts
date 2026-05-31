import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 86400; // 24 hours

let _adminPassword = "";

export function setAdminPassword(pw: string): void {
  _adminPassword = pw;
}

export function getAdminPassword(): string | undefined {
  return _adminPassword.trim() || undefined;
}

export function isAdminEnabled(): boolean {
  return !!getAdminPassword();
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = getAdminPassword();
  if (!expected) return false;
  const hash = await sha256(expected);
  return password === expected || (await sha256(password)) === hash;
}

export function setSessionCookie(c: Context): void {
  const password = getAdminPassword();
  if (!password) return;
  sha256(password).then((hash) => {
    setCookie(c, COOKIE_NAME, hash, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: MAX_AGE,
      path: "/",
    });
  });
}

export async function isAdmin(c: Context): Promise<boolean> {
  if (!isAdminEnabled()) return false;
  const cookie = getCookie(c, COOKIE_NAME);
  if (!cookie) return false;
  const password = getAdminPassword()!;
  const expectedHash = await sha256(password);
  return cookie === expectedHash;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
