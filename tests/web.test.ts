import { describe, it, expect } from "vitest";
import app from "../src/index";

// 全クエリで空結果を返す最小 D1 モック（loadEvent が null を返す状況を再現）
function mockEmptyD1(): D1Database {
  const stmt = {
    bind: () => stmt,
    all: async () => ({ results: [], success: true, meta: {} }),
    first: async () => null,
    run: async () => ({ results: [], success: true, meta: {} }),
    raw: async () => [],
  };
  return {
    prepare: () => stmt,
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

const env = { DB: mockEmptyD1(), ADMIN_PASSWORD: "" };

describe("GET /e/:id（存在しないイベント）", () => {
  it("HTTP 404 を返す", async () => {
    const res = await app.request("/e/nonexistent", {}, env);
    expect(res.status).toBe(404);
  });

  it("404 ページの HTML を返す", async () => {
    const res = await app.request("/e/nonexistent", {}, env);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("ページが見つかりません");
  });
});

describe("POST /e/:id/responses（存在しないイベント）", () => {
  it("HTTP 404 を返す", async () => {
    const res = await app.request(
      "/e/nonexistent/responses",
      { method: "POST", body: new URLSearchParams({ participant_name: "x" }) },
      env,
    );
    expect(res.status).toBe(404);
  });
});
