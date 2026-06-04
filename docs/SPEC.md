# SPEC.md — sorou

> **Status**: Draft | **Version**: 0.1.0 | **Date**: 2026-06-01

## 1. プロダクト概要

### 1.1 目的

認証不要のシンプルな日程調整サービス。ユーザーはイベントを作成し、発行された URL を共有するだけで、参加者の出欠（〇△×）を収集・可視化できる。

### 1.2 対象ユーザー

- 友人同士の飲み会・イベント日程調整
- コミュニティ活動の参加確認
- 小規模チームのミーティング日程調整

### 1.3 差別化ポイント

| 項目 | sorou |
|------|-------|
| 認証 | 不要 |
| インフラ | Cloudflare Workers（エッジ） |
| UI | SSR (Hono JSX) — クライアントJS最小限 |
| API | RESTful JSON API |
| 拡張性 | オープンソース |
| レイテンシ | グローバルエッジ |

---

## 2. 機能要件

### 2.1 イベント作成

| ID | 要件 | 優先度 |
|----|------|--------|
| F-01 | イベント名（必須、最大100文字）を入力できる | P0 |
| F-02 | メモ（任意、最大500文字）を入力できる | P1 |
| F-03 | 候補日時を複数行で入力できる（必須、1行1候補、最大30候補） | P0 |
| F-04 | 作成成功時、イベント固有の URL (`/e?id=<ulid>`) にリダイレクトする | P0 |
| F-05 | 入力バリデーションエラー時、エラーメッセージとともに入力値を保持して再表示 | P1 |
| F-30 | 候補日時の入力補助としてカレンダーを表示し、日付クリックで候補日時の textarea（F-03）に1行挿入する。挿入時刻はデフォルト開始時刻フィールド（既定 `19:00`）の値を使う | P1 |

> **F-30 候補日入力の改善**: トップページの候補日時入力（F-03）はキーボードでの日付打鍵が初回操作として煩雑なため、カレンダーUIによる入力補助を加える。
> - カレンダーの**初期表示はアクセスした時点の当月**（クライアントのローカル日付基準）。前月/翌月への移動が可能。
> - 日付をクリックすると、`M/D(曜) HH:MM〜` 形式の1行を候補日時の textarea 末尾に挿入する。曜日は日本語1文字、`HH:MM` はデフォルト開始時刻フィールドの値。
> - **デフォルト開始時刻**フィールド（既定 `19:00`）をフォームに追加。挿入前に変更すると以降の挿入はその時刻になる。
> - カレンダーはあくまで入力補助であり、挿入後の行は textarea で自由に編集・削除できる。専用のチップ等の状態管理UIは設けない。挿入結果は F-03 と同一の文字列フォーマットで、サーバー側の処理は変わらない。
> - クライアント JS による拡張機能。JS 無効時は textarea への手入力（F-03）にフォールバックする。

### 2.2 イベント表示

| ID | 要件 | 優先度 |
|----|------|--------|
| F-06 | イベント名・メモ・候補日時を表示する | P0 |
| F-07 | 参加者ごとの回答を表形式（行=候補日、列=参加者）で表示する | P0 |
| F-08 | 各候補日の集計（〇/△/× のカウント）を表示する | P1 |
| F-09 | 存在しないイベントIDには 404 ページを表示する | P0 |
| F-10 | 共有URLを表示し、クリップボードコピーボタンを提供する | P2 |
| F-18 | 〇（参加）の数が最も多い候補日をハイライト表示する。同数の場合は該当する全候補日をハイライトする。回答が0件の場合はハイライトしない | P1 |

> **F-18 ハイライト判定ロジック**: 集計（F-08）の `count_yes`（〇の数）が最大となる候補日を「最有力候補」としてハイライトする。
> 比較は `count_yes` のみで行い、△・× は考慮しない。最大値が 0（誰も〇を付けていない）の場合はハイライトしない。

### 2.3 出欠回答

| ID | 要件 | 優先度 |
|----|------|--------|
| F-11 | 参加者名（必須、最大50文字）を入力できる | P0 |
| F-12 | コメント（任意、最大200文字）を入力できる | P1 |
| F-13 | 各候補日に対して 〇（参加）/ △（微妙）/ ×（不参加）を選択できる（デフォルト: ×） | P0 |
| F-14 | 同名の参加者が再回答した場合、前回の回答を上書きする | P0 |
| F-15 | 回答成功時、イベントページにリダイレクトし、更新された表を表示する | P0 |
| F-19 | 出欠表の参加者名はリンクになっており、クリックすると回答フォームにその参加者の現在の回答（名前・コメント・各候補日のステータス）がプリフィルされ、編集して再送信できる。再送信は F-14（同名上書き）で処理する | P1 |

> **F-19 編集インタラクション**: 参加者名のリンク先は `GET /e?id=<id>&edit=<participant_name>`。サーバーが該当回答を取得してフォームの初期値（`name`・`comment`・各 `status_N` のチェック状態）をプリフィルし、フォーム見出しを「<name> さんの回答を編集」に切り替える。
> URL 共有型・認証不要のため、編集も上書きと同様に名前の一致のみで許可する。プリフィルはサーバーサイドで完結し（SSR）、クライアント JS は必須としない（任意の遷移なしプリフィルは段階的拡張）。

### 2.4 URL 共有

| ID | 要件 | 優先度 |
|----|------|--------|
| F-16 | イベントURL (`/e?id=<ulid>`) を画面に表示する | P1 |
| F-17 | URL を知っていれば誰でもイベントの閲覧・回答が可能 | P0 |

### 2.5 管理画面

| ID | 要件 | 優先度 |
|----|------|--------|
| F-20 | 環境変数 `ADMIN_PASSWORD` で管理用パスワードを設定できる | P0 |
| F-21 | 管理画面 (`/admin`) にアクセスするとパスワード入力フォームが表示される | P0 |
| F-22 | 正しいパスワードを入力するとセッション Cookie が発行され、管理画面が開く | P0 |
| F-23 | 管理画面では全イベントの一覧（イベント名、作成日時、候補日数、回答数）が表示される | P0 |
| F-24 | イベント名でインクリメンタルフィルターができる（クライアントサイド・部分一致・大文字小文字無視） | P1 |
| F-25 | 各イベント行に削除ボタンがあり、確認後にイベントを削除できる | P0 |
| F-26 | パスワードが間違っている場合はエラーメッセージを表示する | P1 |
| F-27 | 未設定（`ADMIN_PASSWORD` が空または未定義）の場合は管理画面全体が無効化される | P1 |

> **セッション管理**: 認証成功時に `admin_session` Cookie（HttpOnly, Secure, SameSite=Lax, 有効期限 24h）を発行する。
> Cookie の値は `ADMIN_PASSWORD` の SHA-256 ハッシュとし、リクエスト時にサーバー側で照合する。
> Workers はステートレスだが、Hono の Cookie ミドルウェアで都度検証するため追加のストアは不要。

---

## 3. 非機能要件

| ID | 要件 | 目標値 |
|----|------|--------|
| NF-01 | ページロード時間（TTFB） | < 100ms（エッジ） |
| NF-02 | 同時接続数 | 制限なし（Workers オートスケール） |
| NF-03 | データ永続性 | D1（Cloudflare 管理、自動バックアップ） |
| NF-04 | 入力バリデーション | サーバーサイド（Zod） |
| NF-05 | XSS 対策 | JSX 自動エスケープ + CSP ヘッダー |
| NF-06 | CSRF 対策 | Hidden token + Origin チェック |
| NF-07 | レート制限 | 作成 10req/min/IP, 回答 30req/min/IP |
| NF-08 | ID 予測困難性 | ULID（128bit, 80bit ランダム） |
| NF-09 | HTTPS | Cloudflare デフォルト |
| NF-10 | 管理画面認証 | 環境変数 `ADMIN_PASSWORD`（SHA-256 ハッシュ照合）、Cookie セッション（24h） |

---

## 4. 画面仕様

### 4.1 コンポーネントツリー

```
App
├── Layout (共通ヘッダー/フッター)
│   ├── TopPage (GET /)
│   │   └── CreateEventForm
│   ├── EventPage (GET /e?id=)
│   │   ├── EventHeader (イベント名 + メモ)
│   │   ├── ScheduleTable (出欠表)
│   │   │   ├── TableHeader (候補日 + 参加者名列 ※名前はリンク → ?edit=)
│   │   │   ├── TableRow × N (各候補日の行 ※〇最多をハイライト)
│   │   │   └── SummaryRow (集計行)
│   │   ├── ResponseForm (回答フォーム ※?edit= 指定時はプリフィル)
│   │   │   ├── FormHeading (新規:「出欠を回答する」/ 編集:「<name> さんの回答を編集」)
│   │   │   ├── NameInput
│   │   │   ├── CommentInput
│   │   │   └── StatusSelector × N (各候補日のラジオボタン)
│   │   └── ShareURL (共有URL表示)
```

### 4.2 画面遷移図

```
 ┌──────────┐  POST /events    ┌──────────┐
 │  TOP (/) │ ───────────────→ │ /e?id=   │
 │          │                  │          │
 │ フォーム │                  │ 出欠表   │
 │          │ ←──── validation │ フォーム │
 └──────────┘     error        └──────────┘
                                    ↑  │
                                    │  │ POST /e?id=
                                    └──┘ (リダイレクト)
```

### 4.3 レスポンシブ対応

- モバイル（< 640px）: 表を横スクロール、フォーム縦積み
- タブレット/デスクトップ（≥ 640px）: 表をフル表示
- Tailwind CSS のレスポンシブユーティリティを使用

---

## 5. API 仕様

API は **2系統** を提供する：

| 系統 | Content-Type | 用途 | 認証 |
|------|-------------|------|------|
|| **HTML** | `text/html` | ブラウザからのフォーム操作 | 不要 |
| **REST** | `application/json` | CLI / AI Agent からの操作 | 不要 |
| **Admin** | `text/html` | 管理画面（イベント管理） | `ADMIN_PASSWORD` |

### 5.1 全エンドポイント一覧

> **注**: イベント関連のエンドポイントは CDN キャッシュ回避のため、イベントIDをクエリパラメータ (`?id=`) で渡す。
> 旧URL（`/e/:id` 等）は新URLへの 301/307 リダイレクトで後方互換性を維持している。

#### 新URL（現行）

| Method | Path | Accept | Description |
|--------|------|--------|-------------|
| `GET` | `/` | HTML | トップページ（イベント作成フォーム） |
| `POST` | `/events` | HTML | イベント作成（form POST → redirect） |
| `POST` | `/api/events` | JSON | イベント作成（JSON） |
| `GET` | `/e` | HTML | イベント詳細（`?id=<ulid>` / 任意 `?edit=<name>`） |
| `GET` | `/e` | HTML | イベント編集フォーム（`?id=<ulid>&action=edit`、作成者限定） |
| `POST` | `/e` | HTML | 回答投稿（`?id=<ulid>`） |
| `POST` | `/e` | HTML | イベント更新（`?id=<ulid>&action=edit`、作成者限定） |
| `POST` | `/e` | HTML | イベント削除（`?id=<ulid>&action=delete`、作成者限定） |
| `GET` | `/e/ogp.png` | PNG | イベント別OGP画像（`?id=<ulid>`）/ 省略時は共通OGP |
| `GET` | `/ogp.png` | PNG | 共通OGP画像 |
| `GET` | `/api/events/:id` | JSON | イベント詳細（JSON） |
| `POST` | `/api/events/:id/responses` | JSON | 回答投稿（JSON） |
| `GET` | `/privacy` | HTML | プライバシーポリシー |
| `GET` | `/terms` | HTML | 利用規約 |
| `GET` | `/admin` | HTML | 管理画面（ログイン / イベント一覧） |
| `POST` | `/admin/login` | HTML | 管理画面ログイン |
| `GET` | `/admin/events/:id/edit` | HTML | 管理画面イベント編集フォーム |
| `POST` | `/admin/events/:id/edit` | HTML | 管理画面イベント更新 |
| `POST` | `/admin/events/:id/delete` | HTML | 管理画面イベント削除 |

#### 旧URL（レガシーリダイレクト）

| Method | 旧Path | → 新URL | Status |
|--------|--------|---------|--------|
| `GET` | `/e/:id` | `/e?id=:id` | 301 |
| `GET` | `/e/:id/edit` | `/e?id=:id&action=edit` | 301 |
| `GET` | `/e/:id/ogp.png` | `/e/ogp.png?id=:id` | 301 |
| `POST` | `/e/:id/responses` | `/e?id=:id` | 307 |
| `POST` | `/e/:id/edit` | `/e?id=:id&action=edit` | 307 |
| `POST` | `/e/:id/delete` | `/e?id=:id&action=delete` | 307 |

---

### 5.2 HTML 系エンドポイント

#### 5.2.1 GET `/`

イベント作成フォームを返す。

**Response**: `200 OK` — HTML（Hono JSX）

#### 5.2.2 POST `/events`

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
```
name: 飲み会の日程調整
memo: お店は決まり次第連絡します
dates: 6/15(月) 19:00-\n6/16(火) 19:00-\n6/17(水) 19:00-
```

**Success Response**: `302 Found` → `Location: /e?id=01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Error Response**: `200 OK` — フォームをエラーメッセージとともに再表示

**Validation Rules**:
| Field | Rule |
|-------|------|
| `name` | 必須, 1〜100文字 |
| `memo` | 任意, 0〜500文字 |
| `dates` | 必須, 1〜30行, 各行 1〜100文字, 空行除去 |

#### 5.2.3 GET `/e`

**Query Params**:

| Name | Required | Description |
|------|----------|-------------|
| `id` | **必須** | イベントID（ULID） |
| `edit` | 任意 | 参加者名。指定時、該当参加者の現在の回答を回答フォームにプリフィルし、見出しを編集モードに切り替える（F-19）。該当者がいない場合は無視して新規フォームを表示 |
| `action` | 任意 | `edit` を指定するとイベント編集フォームを表示する（作成者限定。F-20, F-30） |

**Success Response**: `200 OK` — HTML ページ（出欠表 + 回答フォーム / action=edit の場合は編集フォーム）

**Error Response**: `404 Not Found` — イベントが存在しない場合、または非作成者が action=edit を指定した場合

#### 5.2.4 POST `/e`

イベントへの回答投稿、編集、削除を行う。クエリパラメータでアクションを切り替える。

**Query Params**:

| Name | Required | Description |
|------|----------|-------------|
| `id` | **必須** | イベントID（ULID） |
| `action` | 任意 | `edit` → イベント更新 / `delete` → イベント削除 / 省略 → 回答投稿 |

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body（回答投稿時、action 省略）**:
```
participant_name: whytaro
comment: 遅れるかも
status_0: 〇
status_1: ×
status_2: △
```

**Success Response（回答投稿）**: `302 Found` → `Location: /e?id=01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Success Response（イベント更新）**: `302 Found` → `Location: /e?id=01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Success Response（イベント削除）**: `302 Found` → `Location: /`

**Validation Rules（回答投稿）**:
| Field | Rule |
|-------|------|
| `participant_name` | 必須, 1〜50文字 |
| `comment` | 任意, 0〜200文字 |
| `status_N` | 必須, "〇" | "△" | "×" |

**上書きロジック**:
1. `SELECT id FROM responses WHERE event_id=? AND participant_name=?`
2. 存在すれば `response_details` DELETE → 再 INSERT
3. 存在しなければ新規 INSERT

#### 5.2.5 GET `/admin`

管理画面。セッション Cookie が有効であればイベント一覧を表示。未認証の場合はログインフォームを表示。

**Query Params**: なし（イベント名による絞り込みはクライアントサイドのインクリメンタルフィルターで行うため、サーバーは全件を返す。F-24）

**Authenticated Response**: `200 OK` — イベント一覧 HTML（イベント名、作成日時、候補日数、回答数、削除ボタン）。一覧は全件を埋め込み、検索ボックスへの入力に応じて JS で行を表示/非表示する。

**Unauthenticated Response**: `200 OK` — ログインフォーム HTML

**Disabled Response**: `404 Not Found` — `ADMIN_PASSWORD` 未設定時

#### 5.2.6 POST `/admin/login`

管理画面にログインする。

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
```
password: <admin-password>
```

**Success Response**: `302 Found` → `Location: /admin`（`admin_session` Cookie 付与）

**Error Response**: `200 OK` — ログインフォームをエラーメッセージとともに再表示（「パスワードが違います」）

**Session Cookie**:
| 属性 | 値 |
|------|-----|
| Name | `admin_session` |
| Value | `ADMIN_PASSWORD` の SHA-256 ハッシュ |
| HttpOnly | true |
| Secure | true |
| SameSite | Lax |
| Max-Age | 86400（24時間） |

#### 5.2.7 POST `/admin/events/:id/delete`

イベントを削除する。セッション Cookie が必須。

**URL Params**: `id` (ULID) — 削除対象イベントID

**Middleware**: セッション検証 → 未認証なら `302` → `/admin`

**Success Response**: `302 Found` → `Location: /admin`（イベント削除後、一覧にリダイレクト）

**Error Response**: `404 Not Found` — イベントが存在しない場合

---

### 5.3 REST API 系エンドポイント

すべてのレスポンスは `Content-Type: application/json`。

#### 5.3.1 POST `/api/events`

イベントを作成する。

**Request**:
```json
{
  "name": "飲み会の日程調整",
  "memo": "お店は決まり次第連絡します",
  "dates": [
    "6/15(月) 19:00-",
    "6/16(火) 19:00-",
    "6/17(水) 19:00-"
  ]
}
```

**Success Response** (`201 Created`):
```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "name": "飲み会の日程調整",
  "memo": "お店は決まり次第連絡します",
  "dates": [
    {"id": 1, "date": "6/15(月) 19:00-"},
    {"id": 2, "date": "6/16(火) 19:00-"},
    {"id": 3, "date": "6/17(水) 19:00-"}
  ],
  "responses": [],
  "created_at": "2026-06-01T12:00:00Z",
  "url": "https://example.com/e?id=01ARZ3NDEKTSV4RRFFQ69G5FAV"
}
```

**Error Response** (`400 Bad Request`):
```json
{
  "error": "validation_error",
  "message": "イベント名は必須です",
  "details": {
    "name": ["必須項目です"],
    "dates": ["候補日が入力されていません"]
  }
}
```

#### 5.3.2 GET `/api/events/:id`

イベント詳細を取得する。

**Success Response** (`200 OK`):
```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "name": "飲み会の日程調整",
  "memo": "お店は決まり次第連絡します",
  "dates": [
    {"id": 1, "date": "6/15(月) 19:00-"},
    {"id": 2, "date": "6/16(火) 19:00-"},
    {"id": 3, "date": "6/17(水) 19:00-"}
  ],
  "responses": [
    {
      "id": 1,
      "participant_name": "whytaro",
      "comment": "遅れるかも",
      "statuses": [
        {"candidate_id": 1, "status": "〇"},
        {"candidate_id": 2, "status": "×"},
        {"candidate_id": 3, "status": "△"}
      ],
      "created_at": "2026-06-01T12:05:00Z"
    }
  ],
  "created_at": "2026-06-01T12:00:00Z",
  "url": "https://example.com/e?id=01ARZ3NDEKTSV4RRFFQ69G5FAV"
}
```

**Error Response** (`404 Not Found`):
```json
{
  "error": "not_found",
  "message": "イベントが見つかりません"
}
```

#### 5.3.3 POST `/api/events/:id/responses`

出欠を回答する。

**Request**:
```json
{
  "participant_name": "whytaro",
  "comment": "遅れるかも",
  "statuses": [
    {"candidate_id": 1, "status": "〇"},
    {"candidate_id": 2, "status": "×"},
    {"candidate_id": 3, "status": "△"}
  ]
}
```

**Success Response** (`200 OK` — 新規 / `200 OK` for 上書き):
```json
{
  "id": 1,
  "participant_name": "whytaro",
  "comment": "遅れるかも",
  "statuses": [
    {"candidate_id": 1, "status": "〇"},
    {"candidate_id": 2, "status": "×"},
    {"candidate_id": 3, "status": "△"}
  ],
  "created_at": "2026-06-01T12:05:00Z",
  "updated": false
}
```

- `updated: false` — 新規回答
- `updated: true` — 同名ユーザーの回答を上書き

**Error Response** (`400 Bad Request`):
```json
{
  "error": "validation_error",
  "message": "入力内容を確認してください",
  "details": {
    "participant_name": ["必須項目です"],
    "statuses": ["候補日 2 の回答が不正です"]
  }
}
```

---

### 5.4 共通仕様

#### Rate Limiting

| エンドポイント | 制限 |
|---------------|------|
| POST `/api/events` | 10 req/min per IP |
| POST `/api/events/:id/responses` | 30 req/min per IP |
| GET 系 | 制限なし（Workers の自動スケーリングに任せる） |

#### エラーレスポンス形式

```json
{
  "error": "<error_code>",
  "message": "<human-readable message>",
  "details": {}  // optional, validation errors only
}
```

エラーコード一覧:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | 入力バリデーションエラー |
| `not_found` | 404 | リソース不存在 |
| `rate_limited` | 429 | レート制限超過 |

---

## 6. データベース詳細

### 6.1 D1 セットアップ

```bash
wrangler d1 create sorou-db
# → database_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 6.2 マイグレーション

Drizzle Kit で管理:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 6.3 インデックス

```sql
-- イベントIDでの検索（主キー検索）
-- events.id は PRIMARY KEY なので追加インデックス不要

-- 候補日のイベント別取得
CREATE INDEX idx_candidates_event ON candidates(event_id);

-- 回答のイベント別取得
CREATE INDEX idx_responses_event ON responses(event_id);

-- 回答参加者名の検索（上書き判定用）
CREATE INDEX idx_responses_name ON responses(event_id, participant_name);

-- 回答詳細の回答別取得
CREATE INDEX idx_details_response ON response_details(response_id);
```

### 6.4 クエリパターン

#### イベント取得（全データを JOIN）
```sql
SELECT
    e.id, e.name, e.memo, e.created_at,
    c.id AS candidate_id, c.date, c.sort_order,
    r.id AS response_id, r.participant_name, r.comment,
    rd.status
FROM events e
LEFT JOIN candidates c ON c.event_id = e.id
LEFT JOIN responses r ON r.event_id = e.id
LEFT JOIN response_details rd ON rd.response_id = r.id AND rd.candidate_id = c.id
WHERE e.id = ?
ORDER BY c.sort_order, r.id
```

#### 回答の上書き判定
```sql
SELECT id FROM responses
WHERE event_id = ? AND participant_name = ?
```

#### 集計（〇△× カウント）
```sql
SELECT
    c.id AS candidate_id,
    COUNT(CASE WHEN rd.status = '〇' THEN 1 END) AS count_yes,
    COUNT(CASE WHEN rd.status = '△' THEN 1 END) AS count_maybe,
    COUNT(CASE WHEN rd.status = '×' THEN 1 END) AS count_no
FROM candidates c
LEFT JOIN response_details rd ON rd.candidate_id = c.id
WHERE c.event_id = ?
GROUP BY c.id
ORDER BY c.sort_order
```

#### 管理画面：イベント一覧（全件取得）
```sql
-- 全件を取得し、イベント名での絞り込みはクライアントサイドの
-- インクリメンタルフィルターで行う（F-24）。サーバー側に検索条件は無い。
SELECT
    e.id, e.name, e.memo, e.created_at,
    (SELECT COUNT(*) FROM candidates c WHERE c.event_id = e.id) AS candidate_count,
    (SELECT COUNT(*) FROM responses r WHERE r.event_id = e.id) AS response_count
FROM events e
ORDER BY e.created_at DESC
```

#### 管理画面：イベント削除
```sql
DELETE FROM events WHERE id = ?
-- CASCADE により candidates, responses, response_details も自動削除
```

---

## 7. プロジェクト構造

```
sorou/
├── .github/
│   └── workflows/
│   │   ├── test.yaml                # CI: Vitest (unit + integration)
│   │   ├── lint.yaml                # CI: ESLint + Prettier + actionlint
│   │   ├── deploy.yaml              # CD: wrangler deploy (main branch)
│   │   ├── pr-preview.yaml          # CD: PR preview deploy
│   │   └── pr-preview-cleanup.yaml  # CD: PR preview cleanup
├── docs/
│   ├── DESIGN.md                    # 本ドキュメント
│   └── SPEC.md                      # 要件定義（本ファイル）
├── drizzle/
│   └── migrations/                  # Drizzle Kit 生成
├── src/
│   ├── index.ts                     # エントリーポイント（Hono app）
│   ├── db/
│   │   ├── schema.ts                # Drizzle ORM スキーマ
│   │   └── index.ts                 # DB 接続
│   ├── routes/
│   │   ├── web.ts                   # HTML 系: GET /, POST /events, GET /e/:id
│   │   ├── api.ts                   # REST 系: /api/events/*
│   │   └── admin.ts                 # Admin 系: /admin, /admin/login, /admin/events/:id/delete
│   ├── views/
│   │   ├── layout.tsx               # 共通レイアウト
│   │   ├── top.tsx                  # トップページ JSX
│   │   ├── event.tsx                # イベントページ JSX
│   │   └── admin.tsx                # 管理画面 JSX（ログイン + 一覧）
│   │   └── error.tsx                # エラーページ JSX
│   ├── lib/
│   │   ├── ulid.ts                  # ULID 生成
│   │   └── validation.ts           # Zod スキーマ
│   └── types.ts                     # 共有型定義
├── cli/                             # CLI ツール（将来）
│   └── sorou.ts                     # AI Agent 向け CLI
├── static/
│   └── style.css                    # Tailwind CSS 出力
├── wrangler.toml
├── wrangler.pr.toml                 # PR preview 用テンプレート（worker名/D1 ID はプレースホルダ）
├── drizzle.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. テスト計画

| 種別 | 対象 | ツール |
|------|------|--------|
| ユニットテスト | Zod バリデーション、ULID 生成、データ変換 | Vitest |
| 結合テスト | Hono ルートハンドラ + D1（miniflare） | Vitest + miniflare |
| E2E | ブラウザ操作（作成→回答→表示） | Playwright (optional) |

### 8.1 CI/CD パイプライン

```yaml
# .github/workflows/test.yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
```

```yaml
# .github/workflows/lint.yaml
name: lint
on: [push, pull_request]
jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint           # ESLint + Prettier

  actionlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker://rhysd/actionlint:latest
        with:
          args: -color
```

```yaml
# .github/workflows/deploy.yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

```yaml
# .github/workflows/pr-preview.yaml
name: PR Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    concurrency: preview-${{ github.event.pull_request.number }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
      - run: npx tsc --noEmit
      - name: Create D1 database
        run: |
          wrangler d1 create "sorou-pr-${{ github.event.pull_request.number }}-db"
      - name: Apply D1 migrations
        run: |
          for f in ./drizzle/migrations/*.sql; do
            wrangler d1 execute "sorou-pr-${{ github.event.pull_request.number }}-db" --remote --file="$f"
          done
      - name: Generate wrangler config & deploy
        run: |
          sed -e "s/__WORKER_NAME__/sorou-pr-${{ github.event.pull_request.number }}/g" \
              -e "s/__D1_NAME__/sorou-pr-${{ github.event.pull_request.number }}-db/g" \
              wrangler.pr.toml > wrangler.pr.tmp.toml
          wrangler deploy --config wrangler.pr.tmp.toml
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

```yaml
# .github/workflows/pr-preview-cleanup.yaml
name: PR Preview Cleanup
on:
  pull_request:
    types: [closed]
jobs:
  cleanup-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: wrangler delete "sorou-pr-${{ github.event.pull_request.number }}" --force
      - run: wrangler d1 delete "sorou-pr-${{ github.event.pull_request.number }}-db" --skip-confirmation
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 8.2 監査ツール

| ツール | 用途 | 実行方法 |
|--------|------|----------|
| **ESLint** | TypeScript コード品質 | `npm run lint` |
| **Prettier** | コードフォーマット | `npm run format` |
| **actionlint** | GitHub Actions workflow 静的解析 | `actionlint` または CI 上で実行 |

---

## 9. 受け入れ基準

- [ ] トップページからイベントを作成できる（HTML）
- [ ] REST API からイベントを作成できる（JSON）
- [ ] 作成後、一意な URL にリダイレクトされる / JSON で返却される
- [ ] イベントページで候補日と出欠表が表示される
- [ ] 回答フォームから出欠を投稿できる（HTML）
- [ ] REST API から回答を投稿できる（JSON）
- [ ] 同名で再投稿すると上書きされる
- [ ] 存在しないイベントIDで404が返る
- [ ] 入力バリデーションエラーが適切に表示される
- [ ] XSS 対策が機能している
- [ ] モバイル表示が崩れない
- [ ] `wrangler deploy` でデプロイできる
- [ ] `ADMIN_PASSWORD` 未設定時は管理画面が無効化される
- [ ] 管理画面にログインできる（正しいパスワード）
- [ ] 管理画面でイベント一覧が表示される
- [ ] イベント名でインクリメンタルフィルターができる（入力に応じて即時に行が絞り込まれる）
- [ ] イベントを削除できる
