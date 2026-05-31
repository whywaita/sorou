// OGP 画像のサイズ（Twitter/Facebook 推奨の 1.91:1）
const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;

// ブランドカラー
const BRAND = "#059669";
const CARD_BG = "#f0fdf4";
const CARD_BORDER = "#d1fae5";
const TEXT_PRIMARY = "#334155";
const TEXT_MUTED = "#64748b";

const SITE_NAME = "sorou";
const TAGLINE = "シンプルな日程調整ツール";

// 画像に焼き込むイベント名の最大文字数（超過分は省略記号で切り詰める）
const MAX_NAME_LENGTH = 60;

// 使用するフォントウェイト（Noto Sans JP）
const FONT_WEIGHT_REGULAR = 400;
const FONT_WEIGHT_BOLD = 700;
const FONT_FAMILY = "Noto Sans JP";

// カレンダー + チェックマークのアイコン（favicon と同系統のデザイン）
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
  <rect x="8" y="16" width="72" height="64" rx="8" fill="none" stroke="${BRAND}" stroke-width="5"/>
  <line x1="8" y1="36" x2="80" y2="36" stroke="${BRAND}" stroke-width="5"/>
  <line x1="28" y1="8" x2="28" y2="24" stroke="${BRAND}" stroke-width="5" stroke-linecap="round"/>
  <line x1="60" y1="8" x2="60" y2="24" stroke="${BRAND}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="44" cy="58" r="16" fill="${BRAND}"/>
  <path d="M36 58 L42 64 L52 52" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function iconDataUri(): string {
  return `data:image/svg+xml;base64,${btoa(ICON_SVG)}`;
}

function truncate(s: string): string {
  if (s.length <= MAX_NAME_LENGTH) return s;
  return `${s.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * OGP 画像用の HTML を組み立てる。satori が解釈できる CSS サブセット
 * （複数子要素を持つ要素には display:flex が必須）に従う。
 * eventName を省略するとデフォルト（サイト名＋タグライン）画像になる。
 */
export function buildOgpHtml(eventName?: string): string {
  const name = eventName ? escapeHtml(truncate(eventName)) : "";
  const nameBlock = name
    ? `<div style="display:flex;font-size:44px;font-weight:700;color:${TEXT_PRIMARY};margin-top:36px;line-height:1.3;">${name}</div>`
    : "";

  return `<div style="display:flex;flex-direction:column;width:${OGP_WIDTH}px;height:${OGP_HEIGHT}px;background:#ffffff;font-family:'${FONT_FAMILY}';">
  <div style="display:flex;height:12px;background:${BRAND};"></div>
  <div style="display:flex;flex:1;align-items:center;justify-content:center;padding:64px;">
    <div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;width:100%;height:100%;background:${CARD_BG};border:2px solid ${CARD_BORDER};border-radius:24px;padding:64px 72px;">
      <div style="display:flex;align-items:center;">
        <img width="88" height="88" src="${iconDataUri()}" />
        <div style="display:flex;font-size:72px;font-weight:700;color:${BRAND};margin-left:28px;">${SITE_NAME}</div>
      </div>
      ${nameBlock}
      <div style="display:flex;font-size:26px;font-weight:400;color:${TEXT_MUTED};margin-top:20px;">${TAGLINE}</div>
    </div>
  </div>
</div>`;
}

/** 画像に描画されうる全グリフを集約してフォント subset の取得に使う。 */
function glyphText(eventName?: string): string {
  return `${SITE_NAME}${TAGLINE}${eventName ? truncate(eventName) : ""}`;
}

/**
 * イベント名（省略時はデフォルト）から OGP 用 PNG を生成して Response を返す。
 * 日本語フォントは Google Fonts から必要なグリフのみ subset 取得する。
 */
export async function renderOgpImage(eventName?: string): Promise<Response> {
  // workers-og は WASM (satori/resvg) を含むため、画像生成時のみ遅延ロードする。
  // これにより HTML 組み立てロジックやルーティングを WASM なしでテストできる。
  const { ImageResponse, loadGoogleFont } = await import("workers-og");

  const text = glyphText(eventName);
  const [regular, bold] = await Promise.all([
    loadGoogleFont({ family: FONT_FAMILY, weight: FONT_WEIGHT_REGULAR, text }),
    loadGoogleFont({ family: FONT_FAMILY, weight: FONT_WEIGHT_BOLD, text }),
  ]);

  return new ImageResponse(buildOgpHtml(eventName), {
    width: OGP_WIDTH,
    height: OGP_HEIGHT,
    format: "png",
    fonts: [
      {
        name: FONT_FAMILY,
        data: regular,
        weight: FONT_WEIGHT_REGULAR,
        style: "normal",
      },
      {
        name: FONT_FAMILY,
        data: bold,
        weight: FONT_WEIGHT_BOLD,
        style: "normal",
      },
    ],
  });
}
