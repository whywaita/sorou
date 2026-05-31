import { describe, it, expect } from "vitest";
import { buildOgpHtml } from "../src/lib/ogp";

describe("buildOgpHtml", () => {
  it("イベント名を含む HTML を生成する（正常系）", () => {
    const html = buildOgpHtml("whywaita オフ会");
    expect(html).toContain("whywaita オフ会");
    expect(html).toContain("sorou");
    expect(html).toContain("シンプルな日程調整ツール");
  });

  it("HTML 特殊文字をエスケープする（XSS 対策）", () => {
    const html = buildOgpHtml('<script>"&');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&amp;");
  });

  it("最大長を超えるイベント名は省略記号で切り詰める", () => {
    const longName = "あ".repeat(100);
    const html = buildOgpHtml(longName);
    expect(html).toContain("…");
    expect(html).not.toContain("あ".repeat(100));
  });

  it("イベント名を省略するとデフォルト画像（名前ブロックなし）になる", () => {
    const html = buildOgpHtml();
    expect(html).toContain("sorou");
    expect(html).toContain("シンプルな日程調整ツール");
    // 名前用のフォントサイズ 44px ブロックは存在しない
    expect(html).not.toContain("font-size:44px");
  });
});
