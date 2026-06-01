import { Layout } from "./layout";

export function TopPage(props: {
  currentUrl: string;
  errors?: Record<string, string[]>;
  values?: { name?: string; memo?: string; dates?: string };
}) {
  const e = props.errors ?? {};
  const v = props.values ?? {};

  return (
    <Layout
      title="新しいイベントを作成"
      description="sorou - シンプルな日程調整ツール"
      currentUrl={props.currentUrl}
    >
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

        {/* Default start time (input assist only — not submitted, F-30) */}
        <div>
          <label
            for="default-time"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            デフォルト開始時刻
          </label>
          <div class="flex items-center gap-2">
            <input
              type="time"
              id="default-time"
              value="19:00"
              class="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <span class="text-slate-400 text-xs">
              〜（選んだ日に付与されます）
            </span>
          </div>
        </div>

        {/* Dates */}
        <div>
          <label
            for="dates"
            class="block text-sm font-medium text-slate-700 mb-1"
          >
            候補日時 <span class="text-red-500">*</span>
          </label>
          {/* Calendar input assist — populated by client JS, empty without JS (F-30) */}
          <div
            id="calendar"
            class="mb-2 border border-slate-200 rounded-md p-3 hidden"
          />
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

      {/* Recent Events */}
      <div id="recent-events" class="mt-10 hidden">
        <h2 class="text-lg font-bold mb-4">直近のイベント</h2>
        <div id="recent-events-list" class="space-y-3" />
      </div>

      <script dangerouslySetInnerHTML={{ __html: calendarScript }} />
      <script dangerouslySetInnerHTML={{ __html: recentEventsScript }} />
    </Layout>
  );
}

// 候補日入力補助のカレンダー（F-30）。
// クライアントサイドでのみ動作し、JS 無効時は textarea への手入力にフォールバックする。
const calendarScript = `
(function () {
  var cal = document.getElementById("calendar");
  var dates = document.getElementById("dates");
  var timeInput = document.getElementById("default-time");
  if (!cal || !dates || !timeInput) return;
  cal.classList.remove("hidden");

  var WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  var now = new Date();
  var view = { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function insertDate(d) {
    var t = timeInput.value || "19:00";
    var w = WEEKDAYS[d.getDay()];
    var line =
      d.getMonth() + 1 + "/" + d.getDate() + "(" + w + ") " + t + "〜";
    var cur = dates.value;
    if (cur.length > 0 && cur.charAt(cur.length - 1) !== "\\n") {
      dates.value = cur + "\\n" + line;
    } else {
      dates.value = cur + line;
    }
    dates.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function renderCalendar() {
    cal.textContent = "";

    // ヘッダー（前月 / 当月表示 / 翌月）
    var header = document.createElement("div");
    header.className = "flex items-center justify-between mb-2";

    var prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "‹";
    prev.className =
      "px-2 py-1 text-slate-500 hover:text-brand text-lg leading-none";
    prev.addEventListener("click", function () {
      view.month--;
      if (view.month < 0) {
        view.month = 11;
        view.year--;
      }
      renderCalendar();
    });

    var label = document.createElement("span");
    label.className = "text-sm font-medium text-slate-700";
    label.textContent = view.year + "年 " + (view.month + 1) + "月";

    var next = document.createElement("button");
    next.type = "button";
    next.textContent = "›";
    next.className =
      "px-2 py-1 text-slate-500 hover:text-brand text-lg leading-none";
    next.addEventListener("click", function () {
      view.month++;
      if (view.month > 11) {
        view.month = 0;
        view.year++;
      }
      renderCalendar();
    });

    header.appendChild(prev);
    header.appendChild(label);
    header.appendChild(next);
    cal.appendChild(header);

    // 曜日行 + 日付グリッド
    var grid = document.createElement("div");
    grid.className = "grid grid-cols-7 gap-1 text-center text-sm";

    for (var i = 0; i < WEEKDAYS.length; i++) {
      var wd = document.createElement("div");
      wd.className = "text-xs text-slate-400 py-1";
      wd.textContent = WEEKDAYS[i];
      grid.appendChild(wd);
    }

    var first = new Date(view.year, view.month, 1);
    var startBlanks = first.getDay();
    var daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

    for (var b = 0; b < startBlanks; b++) {
      grid.appendChild(document.createElement("div"));
    }

    for (var day = 1; day <= daysInMonth; day++) {
      (function (day) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "" + day;
        btn.className =
          "py-1 rounded hover:bg-brand hover:text-white text-slate-700 transition";
        btn.addEventListener("click", function () {
          insertDate(new Date(view.year, view.month, day));
        });
        grid.appendChild(btn);
      })(day);
    }

    cal.appendChild(grid);
  }

  renderCalendar();
})();
`;

// Render recent events from LocalStorage
const recentEventsScript = `
(function () {
  try {
    var STORAGE_KEY = "sorou_recent_events";
    var stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    var events = JSON.parse(stored);
    if (!events.length) return;

    var container = document.getElementById("recent-events");
    var list = document.getElementById("recent-events-list");
    if (!container || !list) return;

    container.classList.remove("hidden");

    events.forEach(function (ev) {
      var card = document.createElement("a");
      card.href = ev.url;
      card.className =
        "block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:border-brand/50 hover:shadow transition";

      var nameEl = document.createElement("div");
      nameEl.className = "font-medium text-slate-800";
      nameEl.textContent = ev.name || "(無題のイベント)";

      var idEl = document.createElement("div");
      idEl.className = "text-xs text-slate-400 mt-1 font-mono";
      idEl.textContent = ev.id;

      card.appendChild(nameEl);
      card.appendChild(idEl);
      list.appendChild(card);
    });
  } catch (_) {
    // LocalStorage unavailable — silently ignore
  }
})();
`;
