import { describe, it, expect } from "vitest";
import { buildOgpHtml } from "../src/lib/ogp";

describe("buildOgpHtml", () => {
  it("イベントタイトルと説明を含む HTML を生成する（正常系）", () => {
    const html = buildOgpHtml({
      title: "whywaita オフ会",
      description: "渋谷で開催します",
    });
    expect(html).toContain("whywaita オフ会");
    expect(html).toContain("渋谷で開催します");
    // ブランドは右下フッターに控えめに表示される
    expect(html).toContain("sorou");
  });

  it("説明を省略してもタイトルのみで生成できる", () => {
    const html = buildOgpHtml({ title: "懇親会" });
    expect(html).toContain("懇親会");
    expect(html).toContain("sorou");
  });

  it("HTML 特殊文字をエスケープする（XSS 対策）", () => {
    const html = buildOgpHtml({ title: '<script>"&', description: "<b>x" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&amp;");
  });

  it("最大長を超えるタイトルは省略記号で切り詰める", () => {
    const longTitle = "あ".repeat(100);
    const html = buildOgpHtml({ title: longTitle });
    expect(html).toContain("…");
    expect(html).not.toContain("あ".repeat(100));
  });

  it("title を省略するとデフォルト画像（ブランド中央配置）になる", () => {
    const html = buildOgpHtml();
    expect(html).toContain("sorou");
    expect(html).toContain("シンプルな日程調整ツール");
    // イベント用タイトル（68px）ブロックは存在しない
    expect(html).not.toContain("font-size:68px");
    // デフォルトのブランドロゴ（88px）が中央に表示される
    expect(html).toContain("font-size:88px");
  });
});
