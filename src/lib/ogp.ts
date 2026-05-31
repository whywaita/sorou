// OGP 画像のサイズ（Twitter/Facebook 推奨の 1.91:1）
const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;

// ブランドカラー
const BRAND = "#059669";
const TEXT_PRIMARY = "#0f172a";
const TEXT_MUTED = "#64748b";

const SITE_NAME = "sorou";
const TAGLINE = "シンプルな日程調整ツール";

// 画像に焼き込むテキストの最大文字数（超過分は省略記号で切り詰める）
const MAX_TITLE_LENGTH = 50;
const MAX_DESC_LENGTH = 120;

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

export interface OgpContent {
  /** イベント名など、最も大きく表示する見出し。省略時はデフォルト画像になる。 */
  title?: string;
  /** イベントの説明（メモ）など、見出しの下に表示する補足テキスト。 */
  description?: string;
}

function iconDataUri(): string {
  return `data:image/svg+xml;base64,${btoa(ICON_SVG)}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 右下に控えめに表示するブランドフッター（ロゴ + サイト名）
function brandFooter(): string {
  return `<div style="display:flex;align-items:center;justify-content:flex-end;padding:0 64px 48px;">
    <img width="44" height="44" src="${iconDataUri()}" />
    <div style="display:flex;font-size:32px;font-weight:700;color:${BRAND};margin-left:14px;">${SITE_NAME}</div>
  </div>`;
}

/**
 * OGP 画像用の HTML を組み立てる。satori が解釈できる CSS サブセット
 * （複数子要素を持つ要素には display:flex が必須）に従う。
 *
 * title を省略するとデフォルト（ブランドを中央に大きく配置）画像になる。
 * title を指定した場合はタイトルと説明を最も大きく表示し、ブランドは右下に控えめに置く。
 */
export function buildOgpHtml(content?: OgpContent): string {
  const title = content?.title
    ? escapeHtml(truncate(content.title, MAX_TITLE_LENGTH))
    : "";

  // デフォルト画像（トップページ等）: ブランドを中央に大きく配置
  if (!title) {
    return `<div style="display:flex;flex-direction:column;width:${OGP_WIDTH}px;height:${OGP_HEIGHT}px;background:#ffffff;font-family:'${FONT_FAMILY}';">
  <div style="display:flex;height:12px;background:${BRAND};"></div>
  <div style="display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;">
    <div style="display:flex;align-items:center;">
      <img width="96" height="96" src="${iconDataUri()}" />
      <div style="display:flex;font-size:88px;font-weight:700;color:${BRAND};margin-left:28px;">${SITE_NAME}</div>
    </div>
    <div style="display:flex;font-size:34px;font-weight:400;color:${TEXT_MUTED};margin-top:28px;">${escapeHtml(TAGLINE)}</div>
  </div>
</div>`;
  }

  const description = content?.description
    ? escapeHtml(truncate(content.description, MAX_DESC_LENGTH))
    : "";
  const descBlock = description
    ? `<div style="display:flex;font-size:36px;font-weight:400;color:${TEXT_MUTED};margin-top:32px;line-height:1.5;">${description}</div>`
    : "";

  // イベント画像: タイトルと説明を最も大きく、ブランドは右下に控えめに
  return `<div style="display:flex;flex-direction:column;width:${OGP_WIDTH}px;height:${OGP_HEIGHT}px;background:#ffffff;font-family:'${FONT_FAMILY}';">
  <div style="display:flex;height:12px;background:${BRAND};"></div>
  <div style="display:flex;flex:1;flex-direction:column;justify-content:center;padding:0 80px;">
    <div style="display:flex;font-size:68px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.25;">${title}</div>
    ${descBlock}
  </div>
  ${brandFooter()}
</div>`;
}

/** 画像に描画されうる全グリフを集約してフォント subset の取得に使う。 */
function glyphText(content?: OgpContent): string {
  const title = content?.title ? truncate(content.title, MAX_TITLE_LENGTH) : "";
  const description = content?.description
    ? truncate(content.description, MAX_DESC_LENGTH)
    : "";
  return `${SITE_NAME}${TAGLINE}${title}${description}`;
}

/**
 * OGP 用 PNG を生成して Response を返す。
 * 日本語フォントは Google Fonts から必要なグリフのみ subset 取得する。
 */
export async function renderOgpImage(content?: OgpContent): Promise<Response> {
  // workers-og は WASM (satori/resvg) を含むため、画像生成時のみ遅延ロードする。
  // これにより HTML 組み立てロジックやルーティングを WASM なしでテストできる。
  const { ImageResponse, loadGoogleFont } = await import("workers-og");

  const text = glyphText(content);
  const [regular, bold] = await Promise.all([
    loadGoogleFont({ family: FONT_FAMILY, weight: FONT_WEIGHT_REGULAR, text }),
    loadGoogleFont({ family: FONT_FAMILY, weight: FONT_WEIGHT_BOLD, text }),
  ]);

  return new ImageResponse(buildOgpHtml(content), {
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
