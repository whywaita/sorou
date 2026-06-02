import { html } from "hono/html";

interface LayoutProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  /** Full URL of the current page (derived from request host header). */
  currentUrl: string;
  /** If true, adds <meta name="robots" content="noindex"> to prevent search engines from indexing the page. */
  noindex?: boolean;
  children: unknown;
}

const SITE_NAME = "sorou";
const DEFAULT_DESCRIPTION =
  "認証不要のシンプルな日程調整ツール。イベントを作成してURLを共有するだけで、参加者の出欠を収集・可視化できます。";

function origin(url: string): string {
  // Extract scheme://host from a full URL
  const m = url.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : url;
}

export const Layout = (props: LayoutProps) => {
  const desc = props.description ?? DEFAULT_DESCRIPTION;
  const ogType = props.ogType ?? "website";
  const titleFull = `${props.title} — ${SITE_NAME}`;

  // If ogImage is a relative path, prepend the origin
  const ogImage = props.ogImage
    ? props.ogImage.startsWith("/")
      ? `${origin(props.currentUrl)}${props.ogImage}`
      : props.ogImage
    : `${origin(props.currentUrl)}/ogp.png`;

  return html`<!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${titleFull}</title>
        <meta name="description" content="${desc}" />

        <!-- Favicon -->
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />

        <!-- OGP -->
        <meta property="og:title" content="${titleFull}" />
        <meta property="og:description" content="${desc}" />
        <meta property="og:type" content="${ogType}" />
        <meta property="og:url" content="${props.currentUrl}" />
        <meta property="og:image" content="${ogImage}" />
        <meta property="og:site_name" content="${SITE_NAME}" />
        <meta property="og:locale" content="ja_JP" />

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${titleFull}" />
        <meta name="twitter:description" content="${desc}" />
        <meta name="twitter:image" content="${ogImage}" />

        <!-- Canonical URL -->
        <link rel="canonical" href="${props.currentUrl}" />

        ${props.noindex
          ? html`<meta name="robots" content="noindex" />`
          : ""}

        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  brand: "#059669",
                  "brand-hover": "#047857",
                },
              },
            },
          };
        </script>
      </head>
      <body class="bg-slate-50 text-slate-800 min-h-screen">
        <header class="bg-white border-b border-slate-200 shadow-sm">
          <div
            class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between"
          >
            <a
              href="/"
              class="text-xl font-bold text-brand hover:text-brand-hover"
              >sorou</a
            >
          </div>
        </header>
        <main class="max-w-3xl mx-auto px-4 py-8">${props.children}</main>
        <footer class="text-center text-slate-400 text-sm py-6 space-y-1">
          <p>sorou — シンプルな日程調整ツール</p>
          <p class="space-x-4">
            <a href="/privacy" class="hover:text-slate-600 underline">
              プライバシーポリシー
            </a>
            <a href="/terms" class="hover:text-slate-600 underline">
              利用規約
            </a>
          </p>
        </footer>
      </body>
    </html>`;
};
