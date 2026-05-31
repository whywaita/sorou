# DESIGN.md — sorou

## 1. 概要

**sorou（揃う）** は、既存の日程調整サービスと同様の機能を提供する認証不要の日程調整ツールです。誰でもイベントを作成し、URL を共有するだけで参加者の出欠を収集できます。Cloudflare Workers + D1 上で動作し、エッジでの高速レスポンスとスケーラビリティを提供します。

### 設計原則

| 原則 | 内容 |
|------|------|
| **認証不要** | URL を知っていれば誰でもアクセス・回答可能 |
| **シンプル** | 最小限の画面数（作成 → 表示 → 回答） |
| **エッジネイティブ** | Cloudflare Workers + D1 でグローバル低遅延 |
| **サーバーサイドレンダリング** | クライアント JS 最小限、高速初期表示 |
| **既存サービス互換** | 既存の日程調整サービスと同様のコア機能（イベント作成＋出欠回答＋共有URL）を提供 |

---

## 2. アーキテクチャ

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Hono (Router + JSX + JSON API)           │   │
│  │                                                      │   │
│  │  Routes:                                             │   │
│  │   [HTML]                                             │   │
│  │   GET  /              → トップページ（イベント作成）   │   │
│  │   POST /events        → イベント作成 → リダイレクト   │   │
│  │   GET  /e/:id         → イベント詳細＋回答フォーム     │   │
│  │   POST /e/:id/responses → 回答投稿 → リダイレクト     │   │
│  │                                                      │   │
│  │   [REST API]                                         │   │
│  │   POST /api/events              → イベント作成 (JSON) │   │
│  │   GET  /api/events/:id          → イベント詳細 (JSON) │   │
│  │   POST /api/events/:id/responses → 回答投稿   (JSON)  │   │
│  │                                                      │   │
│  │   [Admin]                                            │   │
│  │   GET  /admin                    → 管理画面（一覧）    │   │
│  │   POST /admin/login              → 管理ログイン        │   │
│  │   POST /admin/events/:id/delete  → イベント削除        │   │
│  │                                                      │   │
│  │  Middleware:                                         │   │
│  │   - CSRF トークン (Originless 対策)                   │   │
│  │   - 入力バリデーション (Zod)                          │   │
│  │   - レート制限                                        │   │
│  │   - Admin セッション検証 (/admin/*)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │                  Cloudflare D1                        │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────────┐  │   │
│  │  │  events   │  │ candidates  │  │   responses      │  │   │
│  │  └──────────┘  └────────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| **Runtime** | Cloudflare Workers | グローバルエッジ、無料枠あり、高速 |
| **Framework** | [Hono](https://hono.dev/) | Workers ネイティブ、軽量、JSX 対応 |
| **言語** | TypeScript | 型安全、Workers 標準サポート |
| **DB** | Cloudflare [D1](https://developers.cloudflare.com/d1/) | エッジ SQLite、リレーショナル、無料枠あり |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | SQLite ネイティブ、D1 対応、軽量 |
| **UI** | Hono JSX + Tailwind CSS | SSR、クライアントJS最小限 |
| **バリデーション** | [Zod](https://zod.dev/) | 型安全なスキーマバリデーション |
| **ID生成** | [ULID](https://github.com/ulid/spec) | URL 安全、時系列ソート可能、予測困難 |
| **デプロイ** | [wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare Workers 公式 CLI |
| **CLI** | `sorou` CLI（TypeScript） | AI Agent / 手動オペレーション用、REST API クライアント |

---

## 3. CLI 設計

### 3.1 概要

`sorou` CLI は、REST API (`/api/events/*`) を介して sorou サービスを操作するコマンドラインツール。AI Agent（Codex, Claude Code, Hermes Agent）や手動オペレーションからの利用を想定。

### 3.2 コマンド一覧

```
sorou create  <name> --dates <date1,date2,...> [--memo <memo>]
sorou get     <event-id>
sorou respond <event-id> --name <participant> --status <statuses> [--comment <comment>]
sorou url     <event-id>
```

| コマンド | 説明 | REST API |
|----------|------|----------|
| `sorou create` | イベントを作成し URL を出力 | `POST /api/events` |
| `sorou get` | イベント詳細（出欠表）を JSON 出力 | `GET /api/events/:id` |
| `sorou respond` | 出欠を回答 | `POST /api/events/:id/responses` |
| `sorou url` | イベントの共有 URL を表示 | — (クライアント側で構築) |

### 3.3 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `SOROU_API_BASE` | sorou API のベース URL | `http://localhost:8787`（開発時） |

### 3.4 Agent Skills（将来）

リポジトリ内に `skills/sorou/SKILL.md` を配置し、AI Agent が sorou CLI の使い方を学習できるようにする（`agent-browser` 形式に準拠）。

## 4. データモデル

### ER 図

```
┌──────────────────┐       ┌──────────────────┐
│     events       │       │    candidates     │
├──────────────────┤       ├──────────────────┤
│ id (ULID)    PK  │──┐    │ id (int)      PK │
│ name (TEXT)      │  │    │ event_id (ULID)FK │
│ memo (TEXT?)     │  ├───→│ date (TEXT)       │
│ created_at (TEXT)│  │    │ sort_order (INT)  │
└──────────────────┘  │    └──────────────────┘
                      │
                      │    ┌──────────────────────┐
                      │    │      responses       │
                      │    ├──────────────────────┤
                      │    │ id (int)          PK │
                      └───→│ event_id (ULID)   FK │
                           │ participant_name(TEXT)│
                           │ comment (TEXT?)       │
                           │ created_at (TEXT)     │
                           └──────┬───────────────┘
                                  │
                                  │    ┌──────────────────────┐
                                  │    │   response_details   │
                                  │    ├──────────────────────┤
                                  └───→│ response_id (INT) FK │
                                       │ candidate_id (INT)FK │
                                       │ status (TEXT)        │
                                       │   '〇' | '△' | '×'  │
                                       └──────────────────────┘
```

### DDL

```sql
-- events
CREATE TABLE events (
    id          TEXT PRIMARY KEY,              -- ULID (例: 01ARZ3NDEKTSV4RRFFQ69G5FAV)
    name        TEXT NOT NULL,                 -- イベント名
    memo        TEXT DEFAULT '',               -- メモ（任意）
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))  -- ISO8601
);

-- candidates（候補日）
CREATE TABLE candidates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,                  -- 例: "2026-06-15" or "6/15(月) 19:00-"
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_candidates_event ON candidates(event_id);

-- responses（回答ヘッダ）
CREATE TABLE responses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,            -- 参加者名
    comment          TEXT DEFAULT '',          -- コメント（任意）
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_responses_event ON responses(event_id);

-- response_details（各候補日への回答）
CREATE TABLE response_details (
    response_id  INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK(status IN ('〇','△','×')),
    PRIMARY KEY (response_id, candidate_id)
);
CREATE INDEX idx_details_response ON response_details(response_id);
```

### 回答の上書き戦略

参加者が同じ名前で再投稿した場合：
1. 既存の `responses` レコードを名前で検索
2. 存在すれば、そのレコードに紐づく `response_details` を全削除 → 再作成（＝上書き）
3. 存在しなければ新規作成

**理由**: 既存サービスと同様に、認証がないため「同名＝同一人物」というヒューリスティックに依存する。

---

## 5. 画面設計

### 5.1 トップページ (`GET /`)

```
┌─────────────────────────────────────────────┐
│           📅 Schedule Poller                │
│      シンプルな日程調整ツール               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  イベント名 *                       │   │
│  │  [                             ]    │   │
│  │                                     │   │
│  │  メモ（任意）                       │   │
│  │  [                             ]    │   │
│  │                                     │   │
│  │  デフォルト開始時刻                 │   │
│  │  [ 19:00 ]〜（選んだ日に付与）      │   │
│  │                                     │   │
│  │  候補日時 * （1行1候補）            │   │
│  │  ┌─ 2026年 6月  ‹ ›─────────────┐   │   │
│  │  │ 日 月 火 水 木 金 土          │   │   │  ← 初期表示は当月
│  │  │     1  2  3  4  5  6          │   │   │    （クリックで下に挿入）
│  │  │  7  8  9 10 11 12 13          │   │   │
│  │  │ 14[15][16][17]18 19 20        │   │   │
│  │  │ 21 22 23 24 25 26 27          │   │   │
│  │  │ 28 29 30                      │   │   │
│  │  └───────────────────────────────┘   │   │
│  │  ┌─────────────────────────────┐   │   │
│  │  │ 6/15(月) 19:00〜            │   │   │  ← textarea（自由編集可）
│  │  │ 6/16(火) 19:00〜            │   │   │
│  │  │ 6/17(水) 19:00〜            │   │   │
│  │  └─────────────────────────────┘   │   │
│  │                                     │   │
│  │  [ イベントを作成 ]                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

> **候補日入力の補助 (F-30)**: 候補日時の textarea の上にカレンダーとデフォルト開始時刻フィールドを置く。
> - カレンダーの初期表示は**アクセス時点の当月**（クライアントのローカル日付基準）。`‹ ›` で前月/翌月へ移動できる。
> - 日付をクリックすると `M/D(曜) HH:MM〜`（`HH:MM` はデフォルト開始時刻、既定 `19:00`）を textarea 末尾に1行挿入する。
> - カレンダーは入力補助のみで状態を持たない（チップ等は設けない）。挿入後の行は textarea で自由に編集・削除でき、送信ペイロードは F-03 と同一フォーマット。クライアント JS による拡張で、JS 無効時は手入力にフォールバックする。

### 5.2 イベントページ (`GET /e/:id`)

```
┌─────────────────────────────────────────────┐
│  📅 飲み会の日程調整                        │
│  メモ: お店は決まり次第連絡します           │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 候補日        │ whytaro │ hanako │計  │   │
│  │──────────────────────────────────────│   │  ← 名前(whytaro/hanako)はリンク
│  │ 6/15(月) 19:00│   〇    │   ×    │1/2 │   │     クリックで下のフォームに
│  │★6/16(火) 19:00│   〇    │   〇    │2/2 │◀─ 最有力（〇最多）   現在の回答をプリフィル
│  │ 6/17(水) 19:00│   △    │   〇    │1/2 │   │     （?edit=<name>）
│  └──────────────────────────────────────┘   │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📝 出欠を回答する                          │
│                                             │
│  お名前 *  [                       ]        │
│  コメント  [                       ]        │
│                                             │
│  6/15(月) 19:00  ○ 参加  △ 微妙  × 不参加 │
│  6/16(火) 19:00  ○ 参加  △ 微妙  × 不参加 │
│  6/17(水) 19:00  ○ 参加  △ 微妙  × 不参加 │
│                                             │
│  [ 回答する ]                               │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🔗 共有URL: https://example.com/e/abc123   │
└─────────────────────────────────────────────┘
```

> **ハイライト (F-18)**: 〇（参加）の数が最多の候補日（上図では `6/16(火)`）を行ごとハイライトする。
> 同数なら複数行をハイライト、回答0件ならハイライトなし。

### 5.3 回答編集インタラクション (F-19)

出欠表の参加者名はリンク（`<a href="/e/:id?edit=<name>#response-form">`）として描画する。
クリックすると下の回答フォームに該当参加者の現在の回答がプリフィルされ、編集→再送信できる。

```
出欠表                         回答フォーム
┌───────────────┐
│ … │ whytaro │…│  クリック        📝 whytaro さんの回答を編集
│   │  ↑link  │ │ ───────────→     お名前 *  [whytaro            ]
└───────────────┘                  コメント  [遅れるかも          ]
                                    6/15  (●)〇 ( )△ ( )×   ← 現在値を反映
                                    6/16  (●)〇 ( )△ ( )×
                                    6/17  ( )〇 (●)△ ( )×
                                    [ 回答を更新する ]   (新規回答に戻す)
```

**動作フロー**:
1. 名前リンク → `GET /e/:id?edit=whytaro#response-form` に遷移
2. サーバーが `participant_name = whytaro` の回答を取得
3. フォームの `name` / `comment` / 各 `status_N` の初期値・チェック状態をプリフィルし、見出しを「編集」表示に切替
4. 送信先は通常と同じ `POST /e/:id/responses`。同名のため F-14 の上書きロジックで更新される

**設計方針**:
- プリフィルはサーバーサイド（SSR）で完結し、クライアント JS を必須としない（設計原則「クライアント JS 最小限」を維持）。
- 遷移なしの即時プリフィル（ページ内 JS でフォーム反映）は段階的拡張として任意。ページに埋め込んだ回答データ（JSON または `data-*`）を読んで反映する。
- 該当 `edit` 名が存在しない場合はパラメータを無視し新規フォームを表示する。

### 5.4 管理画面 (`GET /admin`)

```
┌─────────────────────────────────────────────┐
│  🔒 管理画面                                │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 🔍 [ 飲み                          ]  │   │
│  └──────────────────────────────────────┘   │
│  入力に応じてその場で絞り込み（クライアント） │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │ イベント名          │ 作成日時  │ 回答│…  │
│  │────────────────────────────────────────│ │
│  │ 飲み会の日程調整     │ 06/01 12:00│ 2/3 │✕│ │
│  │ 歓迎会              │ 06/01 13:00│ 1/5 │✕│ │
│  │ 勉強会              │ 05/30 09:00│ 0/2 │✕│ │
│  └────────────────────────────────────────┘ │
│                                             │
│  (全 12 件)                                 │
└─────────────────────────────────────────────┘
```

**認証前（ログインフォーム）**:
```
┌─────────────────────────────────────────────┐
│  🔒 管理画面                                │
│                                             │
│  パスワード [                        ]      │
│  [ ログイン ]                               │
└─────────────────────────────────────────────┘
```

### 5.5 デザインシステム

UI は Tailwind CSS で実装する。以下のトークンを `tailwind.config.js` の `theme.extend` に定義し、全画面で統一して使用する。

#### 4.3.1 カラースキーム

ブランドカラーは「揃う＝合意・一致」を表すグリーン系を基調とし、出欠ステータスは信号色のセマンティクスに従う。

| 用途 | トークン | カラーコード | 補足 |
|------|---------|-------------|------|
| Brand / Primary | `brand` | `#059669` | ボタン・リンク・ロゴ（emerald-600） |
| Brand hover | `brand-hover` | `#047857` | ホバー / アクティブ（emerald-700） |
| Background | `bg` | `#F8FAFC` | ページ背景（slate-50） |
| Surface | `surface` | `#FFFFFF` | カード・フォーム面 |
| Text primary | `ink` | `#1E293B` | 本文・見出し（slate-800） |
| Text muted | `muted` | `#64748B` | ヒント・補足（slate-500） |
| Border | `line` | `#E2E8F0` | 罫線・入力枠（slate-200） |

#### 4.3.2 出欠ステータス色（〇 / △ / ×）

| ステータス | 意味 | トークン | カラーコード |
|-----------|------|---------|-------------|
| 〇 | 参加 | `status-yes` | `#16A34A`（green-600） |
| △ | 微妙 | `status-maybe` | `#F59E0B`（amber-500） |
| × | 不参加 | `status-no` | `#94A3B8`（slate-400） |

#### 4.3.3 状態色（フィードバック）

| 用途 | トークン | カラーコード | 補足 |
|------|---------|-------------|------|
| ハイライト背景（F-18） | `highlight-bg` | `#ECFDF5` | 最有力候補の行背景（emerald-50） |
| ハイライト枠 / 文字 | `highlight-fg` | `#059669` | 最有力候補の強調（brand と同色） |
| エラー文字 | `error` | `#DC2626` | バリデーションエラー（red-600） |
| エラー背景 | `error-bg` | `#FEF2F2` | エラーボックス背景（red-50） |

#### 4.3.4 フォント

| 用途 | font-family |
|------|-------------|
| 本文・UI（和欧混植） | `ui-sans-serif, system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif` |
| 等幅（ULID / URL / コード） | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` |

- Web フォントは読み込まず、OS 標準フォント（system font stack）のみを使用し初期表示を最適化する（NF-01）。
- 基準フォントサイズ 16px、行間 1.5。見出しは 18〜28px。

---

## 6. セキュリティ設計

### 6.1 脅威モデル

| 脅威 | 対策 |
|------|------|
| ボットによる大量作成 | レート制限（IP ベース） |
| XSS（クロスサイトスクリプティング） | JSX による自動エスケープ + CSP |
| CSRF（クロスサイトリクエストフォージェリ） | POST にトークン埋め込み |
| 予測可能IDによるイベント列挙 | ULID（128bit、ランダム成分あり） |
| 入力値の不正 | Zod スキーマバリデーション + 長さ制限 |
| SQL インジェクション | Drizzle ORM（パラメータ化クエリ） |
| 管理画面への不正アクセス | `ADMIN_PASSWORD` 環境変数 + SHA-256 ハッシュ照合 + HttpOnly Cookie |
| 管理画面のログインブルートフォース | レート制限（5回/分/IP）+ 未設定時は管理画面無効化 (F-27) |

### 6.2 ID 設計

ULID を使用：
- 48bit タイムスタンプ + 80bit ランダム → 時系列ソート可能かつ予測困難
- Base32 エンコード（Crockford）→ 26文字、URL 安全
- 例: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

イベント URL: `https://<domain>/e/<ulid>`

### 6.3 レート制限

Cloudflare Workers のレート制限（または WAF レート制限ルール）を使用：
- 作成: IP あたり 10回/分
- 回答: IP あたり 30回/分

---

## 7. デプロイメント

### wrangler.toml（概要）

```toml
name = "sorou"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ADMIN_PASSWORD = ""  # 管理画面用パスワード（空の場合は管理画面無効）

[[d1_databases]]
binding = "DB"
database_name = "sorou-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### カスタムドメイン

Cloudflare Dashboard または wrangler で設定:
```bash
wrangler deploy
# Workers > Triggers > Custom Domains でドメイン追加
```

---

## 8. 開発ロードマップ

| Phase | 内容 | 見積 |
|-------|------|------|
| **Phase 0** | プロジェクトセットアップ（wrangler init, D1, Drizzle） | 小 |
| **Phase 1** | データモデル + マイグレーション | 小 |
| **Phase 2** | イベント作成（POST /events） | 中 |
| **Phase 3** | イベント表示（GET /e/:id）+ スケジュール表 | 中 |
| **Phase 4** | 回答投稿（POST /e/:id/responses）+ 上書き | 中 |
| **Phase 5** | UI 仕上げ（Tailwind CSS、エラーハンドリング） | 小 |
| **Phase 6** | セキュリティ（CSRF、レート制限、バリデーション） | 小 |
| **Phase 7** | 管理画面（ログイン、一覧、検索、削除） | 中 |
| **Phase 8** | テスト + デプロイ | 中 |

---

## 9. 将来の拡張（Out of Scope for MVP）

- 締切日設定（`deadline_at`）
- 回答保護モード（`is_protect_member_mode`）— 他者の回答を隠す
- AI によるイベント詳細自動生成
- 時間帯接尾辞の自動付与（`add_suffix` / `suffix`）
- 回答の削除/修正 UI
- iCal エクスポート
- メール通知
- 多言語対応（日本語・英語）
