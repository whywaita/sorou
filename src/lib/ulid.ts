// Simple ULID generator for Cloudflare Workers (no crypto.getRandomValues needed in Workers)
// Based on the ULID spec: https://github.com/ulid/spec

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford's Base32

function encodeTime(now: number): string {
  let str = "";
  for (let i = 9; i >= 0; i--) {
    str = ENCODING.charAt(now % 32) + str;
    now = Math.floor(now / 32);
  }
  return str;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let str = "";
  for (let i = 0; i < 16; i++) {
    str += ENCODING.charAt(bytes[i] % 32);
  }
  return str;
}

export function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}
