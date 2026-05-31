import { html } from "hono/html";

interface LayoutProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  canonicalPath?: string;
  children: unknown;
}

const SITE_NAME = "sorou";
const BASE_URL = "https://sorou.qh.nu";
const DEFAULT_DESCRIPTION = "認証不要のシンプルな日程調整ツール。イベントを作成してURLを共有するだけで、参加者の出欠を収集・可視化できます。";
const DEFAULT_OG_IMAGE = `${BASE_URL}/ogp.svg`;

export const Layout = (props: LayoutProps) => {
  const desc = props.description ?? DEFAULT_DESCRIPTION;
  const ogImage = props.ogImage ?? DEFAULT_OG_IMAGE;
  const ogType = props.ogType ?? "website";
  const canonical = props.canonicalPath ? `${BASE_URL}${props.canonicalPath}` : BASE_URL;
  const titleFull = `${props.title} — ${SITE_NAME}`;

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
        <meta property="og:url" content="${canonical}" />
        <meta property="og:image" content="${ogImage}" />
        <meta property="og:site_name" content="${SITE_NAME}" />
        <meta property="og:locale" content="ja_JP" />

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${titleFull}" />
        <meta name="twitter:description" content="${desc}" />
        <meta name="twitter:image" content="${ogImage}" />

        <!-- Canonical URL -->
        <link rel="canonical" href="${canonical}" />

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
        <footer class="text-center text-slate-400 text-sm py-6">
          sorou — シンプルな日程調整ツール
        </footer>
      </body>
    </html>`;
};
