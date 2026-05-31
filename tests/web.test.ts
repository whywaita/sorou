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

describe("GET /（トップページ・カレンダー入力補助 F-30）", () => {
  it("デフォルト開始時刻フィールド（既定 19:00）を表示する", async () => {
    const res = await app.request("/", {}, env);
    const body = await res.text();
    expect(body).toContain("デフォルト開始時刻");
    expect(body).toContain('id="default-time"');
    expect(body).toContain('value="19:00"');
  });

  it("カレンダーのコンテナと候補日 textarea を表示する", async () => {
    const res = await app.request("/", {}, env);
    const body = await res.text();
    expect(body).toContain('id="calendar"');
    expect(body).toContain('id="dates"');
  });

  it("日付クリックで textarea に挿入するクライアント JS を埋め込む", async () => {
    const res = await app.request("/", {}, env);
    const body = await res.text();
    // 曜日ラベルと挿入フォーマットの一部がスクリプトに含まれる
    expect(body).toContain("月");
    expect(body).toContain("renderCalendar");
  });
});

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
