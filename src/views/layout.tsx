import { html } from "hono/html";

export const Layout = (props: { title: string; children: unknown }) =>
  html`<!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${props.title} — sorou</title>
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
