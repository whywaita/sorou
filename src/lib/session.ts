import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

const COOKIE_NAME = "admin_session";
const MODE_COOKIE_NAME = "admin_mode_active";
const MAX_AGE = 86400; // 24 hours
const MODE_MAX_AGE = 3600; // 1 hour for admin mode (auto-expire)

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

/**
 * Admin mode — a temporary opt-in flag separate from the admin session.
 * Inspired by: "管理者に「なる」ボタンを作った" (id:onk)
 * Having an admin session means you CAN be admin; admin mode means you ARE
 * currently operating as one.  Permission checks require both.
 */

/** Activate admin mode (sets a short-lived cookie). */
export function setAdminModeCookie(c: Context): void {
  setCookie(c, MODE_COOKIE_NAME, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: MODE_MAX_AGE,
    path: "/",
  });
}

/** Deactivate admin mode (clear the cookie). */
export function clearAdminModeCookie(c: Context): void {
  setCookie(c, MODE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 0,
    path: "/",
  });
}

/** Check if admin mode is currently active. */
export function isAdminModeActive(c: Context): boolean {
  return getCookie(c, MODE_COOKIE_NAME) === "1";
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
