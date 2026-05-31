import { Layout } from "./layout";

export function AdminLoginPage(props: { error?: string }) {
  return (
    <Layout title="管理画面">
      <h1 class="text-2xl font-bold mb-6">🔒 管理画面</h1>
      <form
        method="post"
        action="/admin/login"
        class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 max-w-sm mx-auto"
      >
        {props.error && (
          <p class="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded p-2">
            {props.error}
          </p>
        )}
        <div class="mb-4">
          <label
            for="password"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            パスワード
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="管理パスワード"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-md transition text-sm"
        >
          ログイン
        </button>
      </form>
    </Layout>
  );
}

export function AdminEventList(props: {
  events: {
    id: string;
    name: string;
    memo: string;
    createdAt: string;
    candidateCount: number;
    responseCount: number;
  }[];
  query?: string;
}) {
  return (
    <Layout title="管理画面">
      <h1 class="text-2xl font-bold mb-6">🔒 管理画面</h1>

      {/* Search */}
      <form method="get" action="/admin" class="mb-6">
        <div class="flex gap-2">
          <input
            type="text"
            name="q"
            value={props.query ?? ""}
            class="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="イベント名で検索..."
          />
          <button
            type="submit"
            class="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-md text-sm transition"
          >
            🔍
          </button>
          {props.query && (
            <a
              href="/admin"
              class="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              クリア
            </a>
          )}
        </div>
      </form>

      {/* Event Table */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        {props.events.length === 0 ? (
          <p class="p-6 text-slate-400 text-center">
            {props.query ? "該当するイベントがありません" : "イベントがありません"}
          </p>
        ) : (
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="px-4 py-3 text-left font-medium text-slate-600">
                  イベント名
                </th>
                <th class="px-4 py-3 text-center font-medium text-slate-600">
                  作成日時
                </th>
                <th class="px-4 py-3 text-center font-medium text-slate-600">
                  回答
                </th>
                <th class="px-4 py-3 text-center font-medium text-slate-600" />
              </tr>
            </thead>
            <tbody>
              {props.events.map((ev) => (
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="px-4 py-3">
                    <a
                      href={`/e/${ev.id}`}
                      class="text-brand hover:underline font-medium"
                    >
                      {escapeHtml(ev.name)}
                    </a>
                  </td>
                  <td class="px-4 py-3 text-center text-slate-500 text-xs">
                    {formatDate(ev.createdAt)}
                  </td>
                  <td class="px-4 py-3 text-center text-slate-500 text-xs">
                    {ev.responseCount}/{ev.candidateCount}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <form
                      method="post"
                      action={`/admin/events/${ev.id}/delete`}
                      onsubmit="return confirm('このイベントを削除しますか？')"
                    >
                      <button
                        type="submit"
                        class="text-red-500 hover:text-red-700 text-xs font-medium hover:underline"
                      >
                        ✕ 削除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p class="text-slate-400 text-xs mt-4">
        全 {props.events.length} 件
        {props.query && (
          <span>
            {" "}
            （検索: "{escapeHtml(props.query)}"）
          </span>
        )}
      </p>
    </Layout>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const h = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${m}/${day} ${h}:${min}`;
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
