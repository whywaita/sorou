import type { Event } from "../types";
import { Layout } from "./layout";

export function EditEventPage(props: {
  event: Event;
  currentUrl: string;
  shareUrl: string;
  errors?: Record<string, string[]>;
  values?: { name?: string; memo?: string; dates?: string };
  /** Admin mode: form POST targets the admin routes instead of the creator routes. */
  isAdmin?: boolean;
}) {
  const { event: ev, errors: e = {}, values: v = {}, isAdmin = false } = props;
  const editAction = isAdmin
    ? `/admin/events/${ev.id}/edit`
    : `/e?id=${ev.id}&action=edit`;
  const deleteAction = isAdmin
    ? `/admin/events/${ev.id}/delete`
    : `/e?id=${ev.id}&action=delete`;
  const backUrl = isAdmin ? "/admin" : `/e?id=${ev.id}`;
  const backLabel = isAdmin ? "← 管理画面に戻る" : "← イベントページに戻る";
  // Build default dates string from current candidates
  const defaultDates = ev.candidates.map((c) => c.date).join("\n");

  return (
    <Layout
      title={`${ev.name} を編集`}
      description={`${ev.name} のイベント情報を編集`}
      currentUrl={props.currentUrl}
    >
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">イベントを編集</h1>
        <a
          href={backUrl}
          class="text-sm text-slate-500 hover:text-brand underline"
        >
          {backLabel}
        </a>
      </div>

      <form
        method="post"
        action={editAction}
        class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5"
      >
        {/* Name */}
        <div>
          <label
            for="name"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            イベント名 <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={v.name ?? ev.name}
            maxlength={100}
            class={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 ${
              e.name ? "border-red-400" : "border-slate-300"
            }`}
          />
          {e.name && <p class="text-red-500 text-xs mt-1">{e.name[0]}</p>}
        </div>

        {/* Memo */}
        <div>
          <label
            for="memo"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            メモ
          </label>
          <input
            type="text"
            id="memo"
            name="memo"
            value={v.memo ?? ev.memo}
            maxlength={500}
            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* Dates */}
        <div>
          <label
            for="dates"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            候補日時 <span class="text-red-500">*</span>
          </label>
          <textarea
            id="dates"
            name="dates"
            rows={5}
            maxlength={3500}
            class={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono ${
              e.dates ? "border-red-400" : "border-slate-300"
            }`}
          >
            {v.dates ?? defaultDates}
          </textarea>
          {e.dates && <p class="text-red-500 text-xs mt-1">{e.dates[0]}</p>}
          <p class="text-slate-400 text-xs mt-1">
            1行に1つの候補日時を入力してください（最大30候補）
          </p>
        </div>

        <button
          type="submit"
          class="w-full bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-md transition text-sm"
        >
          変更を保存
        </button>
      </form>

      {/* Delete section */}
      <div class="mt-8 bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h2 class="text-lg font-bold text-red-600 mb-2">危険な操作</h2>
        <p class="text-sm text-slate-500 mb-4">
          このイベントを削除すると、すべての候補日・回答データが完全に消去され、元に戻せません。
        </p>
        <form
          method="post"
          action={deleteAction}
          onsubmit="return confirm('本当にこのイベントを削除しますか？この操作は取り消せません。')"
        >
          <button
            type="submit"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition text-sm"
          >
            このイベントを削除する
          </button>
        </form>
      </div>
    </Layout>
  );
}
