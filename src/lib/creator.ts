import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

const COOKIE_NAME = "sorou_creator";
// 1 year — long-lived because it's the only way to link a browser to created events
const MAX_AGE = 365 * 86400;

/** Generate a random 256-bit hex token for event creation ownership. */
export function generateCreatorToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hash (hex). */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * On event creation: generate a new token if the browser doesn't have one,
 * set it as a cookie, and return the SHA-256 hash to store in the DB.
 */
export async function getOrCreateCreatorTokenHash(
  c: Context,
): Promise<{ hash: string; token: string }> {
  let token = getCookie(c, COOKIE_NAME);
  if (!token) {
    token = generateCreatorToken();
  }
  const hash = await sha256(token);
  setCreatorCookie(c, token);
  return { hash, token };
}

/** Set (or refresh) the creator cookie. */
function setCreatorCookie(c: Context, token: string): void {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Check if the current browser is the creator of a given event. */
export async function isCreator(
  c: Context,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return false;
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return false;
  const hash = await sha256(token);
  return hash === storedHash;
}
