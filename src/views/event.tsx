import type { Event } from "../types";
import { Layout } from "./layout";

export function EventPage(props: {
  event: Event;
  shareUrl: string;
  errors?: Record<string, string[]>;
  edit?: { name: string; comment: string; statuses: Record<number, string> };
}) {
  const { event: ev, shareUrl, errors: e = {}, edit } = props;
  const responses = ev.responses ?? [];
  const latestCounts = computeCounts(ev.candidates, responses);

  return (
    <Layout title={ev.name}>
      <h1 class="text-2xl font-bold mb-1">📅 {escapeHtml(ev.name)}</h1>
      {ev.memo && <p class="text-slate-500 text-sm mb-6">{escapeHtml(ev.memo)}</p>}

      {/* Schedule Table */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto mb-8">
        {ev.candidates.length === 0 ? (
          <p class="p-6 text-slate-400 text-center">候補日がありません</p>
        ) : (
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">
                  候補日
                </th>
                {responses.map((r) => (
                  <th
                    class="px-4 py-3 text-center font-medium text-slate-600 whitespace-nowrap"
                  >
                    <a
                      href={`/e/${ev.id}?edit=${encodeURIComponent(r.participantName)}#response-form`}
                      class="hover:text-brand hover:underline"
                    >
                      {escapeHtml(r.participantName)}
                    </a>
                  </th>
                ))}
                <th class="px-4 py-3 text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                  計
                </th>
              </tr>
            </thead>
            <tbody>
              {ev.candidates.map((c, ci) => {
                const count = latestCounts[c.id] ?? { yes: 0, maybe: 0, no: 0 };
                const isBest =
                  bestCandidateIds(ev.candidates, responses).has(c.id);
                return (
                  <tr class={`border-b border-slate-100 ${isBest ? "bg-emerald-50" : ""}`}>
                    <td class="px-4 py-3 font-medium whitespace-nowrap">
                      {escapeHtml(c.date)}
                      {isBest && (
                        <span class="ml-2 text-xs text-emerald-600">👑</span>
                      )}
                    </td>
                    {responses.map((r) => {
                      const st = r.statuses.find(
                        (s) => s.candidateId === c.id
                      );
                      return (
                        <td class="px-4 py-3 text-center">
                          <span
                            class={`inline-block w-6 h-6 rounded-full text-xs font-bold leading-6 ${
                              st?.status === "〇"
                                ? "bg-emerald-100 text-emerald-700"
                                : st?.status === "△"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {st?.status ?? "×"}
                          </span>
                        </td>
                      );
                    })}
                    <td class="px-4 py-3 text-center text-xs text-slate-500">
                      {count.yes > 0 && (
                        <span class="mr-1">{count.yes}〇</span>
                      )}
                      {count.maybe > 0 && (
                        <span class="mr-1">{count.maybe}△</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Response Form */}
      <div
        id="response-form"
        class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6"
      >
        <h2 class="text-lg font-bold mb-4">
          {edit
            ? `${escapeHtml(edit.name)} さんの回答を編集`
            : "📝 出欠を回答する"}
        </h2>
        <form method="post" action={`/e/${ev.id}/responses`} class="space-y-4">
          <div>
            <label
              for="participant_name"
              class="block text-sm font-medium text-slate-700 mb-1"
            >
              お名前 <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="participant_name"
              name="participant_name"
              value={edit?.name ?? ""}
              maxlength={50}
              class={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                e.participant_name ? "border-red-400" : "border-slate-300"
              }`}
              placeholder="あなたの名前"
            />
            {e.participant_name && (
              <p class="text-red-500 text-xs mt-1">{e.participant_name[0]}</p>
            )}
          </div>

          <div>
            <label
              for="comment"
              class="block text-sm font-medium text-slate-700 mb-1"
            >
              コメント
            </label>
            <input
              type="text"
              id="comment"
              name="comment"
              value={edit?.comment ?? ""}
              maxlength={200}
              class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="遅れるかも（任意）"
            />
          </div>

          {ev.candidates.map((c, i) => (
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium w-40 shrink-0">
                {escapeHtml(c.date)}
              </span>
              <div class="flex gap-4">
                {(["〇", "△", "×"] as const).map((s) => {
                  const checked =
                    edit?.statuses[c.id] === s ||
                    (!edit && s === "×") ||
                    false;
                  const colors = {
                    "〇": "border-emerald-400 text-emerald-700",
                    "△": "border-amber-400 text-amber-700",
                    "×": "border-slate-300 text-slate-500",
                  };
                  return (
                    <label
                      class={`flex items-center gap-1 text-sm cursor-pointer ${colors[s]}`}
                    >
                      <input
                        type="radio"
                        name={`status_${i}`}
                        value={s}
                        checked={checked}
                        class="accent-brand"
                      />
                      {s === "〇" ? "参加" : s === "△" ? "微妙" : "不参加"}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="submit"
            class="w-full bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-md transition text-sm"
          >
            {edit ? "回答を更新する" : "回答する"}
          </button>
        </form>
      </div>

      {/* Share URL */}
      <div class="bg-slate-100 rounded-lg p-4 text-sm">
        <p class="text-slate-600 font-medium mb-2">🔗 共有URL</p>
        <div class="flex items-center gap-2">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-700"
            id="share-url"
          />
          <button
            type="button"
            onclick={`navigator.clipboard.writeText('${shareUrl}')`}
            class="px-3 py-2 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50"
          >
            📋
          </button>
        </div>
        <p class="text-slate-400 text-xs mt-2">
          このURLを共有すると、誰でも出欠を回答できます
        </p>
      </div>
    </Layout>
  );
}

function computeCounts(
  candidates: { id: number }[],
  responses: { statuses: { candidateId: number; status: string }[] }[]
) {
  const counts: Record<number, { yes: number; maybe: number; no: number }> = {};
  for (const c of candidates) {
    counts[c.id] = { yes: 0, maybe: 0, no: 0 };
  }
  for (const r of responses) {
    for (const s of r.statuses) {
      const cnt = counts[s.candidateId];
      if (!cnt) continue;
      if (s.status === "〇") cnt.yes++;
      else if (s.status === "△") cnt.maybe++;
      else cnt.no++;
    }
  }
  return counts;
}

function bestCandidateIds(
  candidates: { id: number }[],
  responses: { statuses: { candidateId: number; status: string }[] }[]
): Set<number> {
  const counts = computeCounts(candidates, responses);
  let maxYes = 0;
  for (const c of candidates) {
    if (counts[c.id]?.yes > maxYes) maxYes = counts[c.id].yes;
  }
  if (maxYes === 0) return new Set();
  return new Set(
    candidates.filter((c) => counts[c.id]?.yes === maxYes).map((c) => c.id)
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
