import { Layout } from "./layout";

export function TopPage(props: {
  errors?: Record<string, string[]>;
  values?: { name?: string; memo?: string; dates?: string };
}) {
  const e = props.errors ?? {};
  const v = props.values ?? {};

  return (
    <Layout title="新しいイベントを作成">
      <h1 class="text-2xl font-bold mb-6">新しいイベントを作成</h1>
      <form
        method="post"
        action="/events"
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
            value={v.name ?? ""}
            maxlength={100}
            class={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 ${
              e.name ? "border-red-400" : "border-slate-300"
            }`}
            placeholder="飲み会の日程調整"
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
            value={v.memo ?? ""}
            maxlength={500}
            class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="お店は決まり次第連絡します"
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
            class={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 ${
              e.dates ? "border-red-400" : "border-slate-300"
            }`}
            placeholder={"6/15(月) 19:00-\n6/16(火) 19:00-\n6/17(水) 19:00-"}
          >
            {v.dates ?? ""}
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
          イベントを作成
        </button>
      </form>
    </Layout>
  );
}
