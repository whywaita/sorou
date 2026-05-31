# DESIGN.md — sorou

## 1. 概要

**sorou（揃う）** は、[既存サービス (既存サービス)](https://既存サービス) と機能的に同等な日程調整サービスです。認証不要で、誰でもイベントを作成し、URL を共有するだけで参加者の出欠を収集できます。Cloudflare Workers + D1 上で動作し、エッジでの高速レスポンスとスケーラビリティを提供します。

### 設計原則

| 原則 | 内容 |
|------|------|
| **認証不要** | URL を知っていれば誰でもアクセス・回答可能 |
| **シンプル** | 最小限の画面数（作成 → 表示 → 回答） |
| **エッジネイティブ** | Cloudflare Workers + D1 でグローバル低遅延 |
| **サーバーサイドレンダリング** | クライアント JS 最小限、高速初期表示 |
| **機能的同等性** | 既存サービス のコア機能（イベント作成＋出欠回答＋共有URL）を再現 |

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
│  │  Middleware:                                         │   │
│  │   - CSRF トークン (Originless 対策)                   │   │
│  │   - 入力バリデーション (Zod)                          │   │
│  │   - レート制限                                        │   │
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

---

## 3. データモデル

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

**理由**: 既存サービス も同名での再投稿は上書きとして扱う。認証がないため「同名＝同一人物」というヒューリスティックに依存する。

---

## 4. 画面設計

### 4.1 トップページ (`GET /`)

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
│  │  候補日時 * （1行1候補）            │   │
│  │  ┌─────────────────────────────┐   │   │
│  │  │ 6/15(月) 19:00-             │   │   │
│  │  │ 6/16(火) 19:00-             │   │   │
│  │  │ 6/17(水) 19:00-             │   │   │
│  │  └─────────────────────────────┘   │   │
│  │                                     │   │
│  │  [ イベントを作成 ]                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 4.2 イベントページ (`GET /e/:id`)

```
┌─────────────────────────────────────────────┐
│  📅 飲み会の日程調整                        │
│  メモ: お店は決まり次第連絡します           │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 候補日        │ whytaro │ hanako │計  │   │
│  │──────────────────────────────────────│   │
│  │ 6/15(月) 19:00│   〇    │   ×    │1/2 │   │
│  │ 6/16(火) 19:00│   〇    │   〇    │2/2 │   │
│  │ 6/17(水) 19:00│   △    │   〇    │1/2 │   │
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

---

## 5. セキュリティ設計

### 5.1 脅威モデル

| 脅威 | 対策 |
|------|------|
| ボットによる大量作成 | レート制限（IP ベース） |
| XSS（クロスサイトスクリプティング） | JSX による自動エスケープ + CSP |
| CSRF（クロスサイトリクエストフォージェリ） | POST にトークン埋め込み |
| 予測可能IDによるイベント列挙 | ULID（128bit、ランダム成分あり） |
| 入力値の不正 | Zod スキーマバリデーション + 長さ制限 |
| SQL インジェクション | Drizzle ORM（パラメータ化クエリ） |

### 5.2 ID 設計

ULID を使用：
- 48bit タイムスタンプ + 80bit ランダム → 時系列ソート可能かつ予測困難
- Base32 エンコード（Crockford）→ 26文字、URL 安全
- 例: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

イベント URL: `https://<domain>/e/<ulid>`

### 5.3 レート制限

Cloudflare Workers のレート制限（または WAF レート制限ルール）を使用：
- 作成: IP あたり 10回/分
- 回答: IP あたり 30回/分

---

## 6. デプロイメント

### wrangler.toml（概要）

```toml
name = "sorou"
main = "src/index.ts"
compatibility_date = "2025-01-01"

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

## 7. 開発ロードマップ

| Phase | 内容 | 見積 |
|-------|------|------|
| **Phase 0** | プロジェクトセットアップ（wrangler init, D1, Drizzle） | 小 |
| **Phase 1** | データモデル + マイグレーション | 小 |
| **Phase 2** | イベント作成（POST /events） | 中 |
| **Phase 3** | イベント表示（GET /e/:id）+ スケジュール表 | 中 |
| **Phase 4** | 回答投稿（POST /e/:id/responses）+ 上書き | 中 |
| **Phase 5** | UI 仕上げ（Tailwind CSS、エラーハンドリング） | 小 |
| **Phase 6** | セキュリティ（CSRF、レート制限、バリデーション） | 小 |
| **Phase 7** | テスト + デプロイ | 中 |

---

## 8. 将来の拡張（Out of Scope for MVP）

- 締切日設定（`deadline_at`）
- 回答保護モード（`is_protect_member_mode`）— 他者の回答を隠す
- AI によるイベント詳細自動生成
- 時間帯接尾辞の自動付与（`add_suffix` / `suffix`）
- 回答の削除/修正 UI
- iCal エクスポート
- メール通知
- 多言語対応（日本語・英語）
