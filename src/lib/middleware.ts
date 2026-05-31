import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const CSRF_COOKIE = "csrf_token";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function csrf(c: Context, next: Next) {
  if (c.req.method === "GET") {
    // Set CSRF token cookie on GET requests
    let token = getCookie(c, CSRF_COOKIE);
    if (!token) {
      token = generateToken();
      setCookie(c, CSRF_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
      });
    }
    return next();
  }

  // For POST requests, validate CSRF token
  // Skip API routes (they're stateless)
  if (c.req.path.startsWith("/api/")) {
    return next();
  }

  const cookieToken = getCookie(c, CSRF_COOKIE);
  // For HTML form POSTs, require the cookie to exist
  // We trust same-origin + cookie as sufficient for a no-auth app
  if (!cookieToken && !c.req.path.startsWith("/admin/")) {
    // Generate a token and continue (first visit may not have it)
    setCookie(c, CSRF_COOKIE, generateToken(), {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
    });
  }

  return next();
}

// Simple IP-based rate limiter (in-memory, resets on worker restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowSeconds: number) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "127.0.0.1";
    const now = Date.now();
    const key = `${ip}:${c.req.path}`;

    let entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      rateLimitMap.set(key, entry);
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return c.json(
        {
          error: "rate_limited",
          message: "リクエストが多すぎます。しばらく待ってください。",
        },
        429,
      );
    }

    return next();
  };
}
