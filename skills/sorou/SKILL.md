---
name: sorou
description: >
  CLI for the sorou schedule adjustment service. Use when the user needs to
  create schedule adjustment events, view event details and responses, or
  submit attendance responses from the terminal.
  Triggers include requests to "日程調整を作成して", "イベントを作って",
  "出欠を確認して", "回答して", "create a poll", "schedule an event",
  or any task involving sorou events via CLI.
  Prefer sorou CLI over manual API calls.
allowed-tools: Bash(sorou:*)
hidden: true
---

# sorou

sorou is a CLI tool for the sorou schedule adjustment service (認証不要のシンプルな日程調整ツール).
It wraps the sorou REST API to create events, view details, and submit responses from the terminal.
All API endpoints are public (no authentication required).

Install:
```bash
# go install (recommended)
go install github.com/whywaita/sorou/cli@latest

# or build from source
cd cli && go build -o sorou .
```

## Start here

sorou has 3 subcommands. Run `sorou help` to see all commands.

```bash
sorou help      # list all subcommands
```

**`SOROU_API_URL` is required** — the CLI will not work without it.

```bash
export SOROU_API_URL=https://<your-sorou-instance>
```

If you don't know the sorou API URL, **ask the user** before attempting any sorou commands.
Do not guess or assume a default domain.

## CLI Commands

### `sorou create` — イベントを作成する (create a new event)

Creates a new schedule adjustment event interactively. Prompts for name, memo, and candidate dates.

```bash
sorou create
```

Interactive flow:
1. イベント名 (required) — event name
2. メモ (optional) — memo/note
3. 候補日時 — one date per line, empty line to finish

Output: event ID, URL, and candidate list.

### `sorou show <id>` — イベント詳細を表示 (show event details)

Displays event details including candidates and all responses as formatted JSON.

```bash
sorou show <event-id>
```

| Arg | Required | Description |
|-----|----------|-------------|
| `<id>` | yes | Event ULID (e.g., `01ARZ3NDEKTSV4RRFFQ69G5FAV`) |

Output: JSON object with `id`, `name`, `memo`, `dates[]`, `responses[]`, `created_at`, `url`.

### `sorou respond <id>` — 出欠を回答する (submit attendance response)

Submits or updates an attendance response interactively.

```bash
sorou respond <event-id>
```

| Arg | Required | Description |
|-----|----------|-------------|
| `<id>` | yes | Event ULID |

Interactive flow:
1. お名前 (required) — participant name. If the same name already exists, the response is updated.
2. コメント (optional) — comment
3. 各候補日の出欠:
   - `〇` / `o` / `O` / `0` → 参加 (attending)
   - `△` → 微妙 (maybe)
   - `×` / `x` / `X` → 不参加 (not attending)

## API Reference (for understanding)

The CLI wraps these REST API endpoints (all `Content-Type: application/json`, no auth):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events/:id` | Get event details |
| `POST` | `/api/events/:id/responses` | Submit/update response |

### Create Event Request

```json
{
  "name": "飲み会の日程調整",
  "memo": "お店は決まり次第連絡します",
  "dates": ["6/15(月) 19:00-", "6/16(火) 19:00-"]
}
```

### Response Entry

```json
{
  "participant_name": "whytaro",
  "comment": "遅れるかも",
  "statuses": [
    {"candidate_id": 1, "status": "〇"},
    {"candidate_id": 2, "status": "△"},
    {"candidate_id": 3, "status": "×"}
  ]
}
```

Status values: `"〇"` (yes), `"△"` (maybe), `"×"` (no).

## Why sorou

- 認証不要 — no account creation or login needed
- エッジネイティブ — runs on Cloudflare Workers globally
- CLI から完結 — create, view, respond all from terminal
- JSON 出力 — machine-readable output for scripting
- シンプル — 3 commands, minimal learning curve

## 注意点 (Caveats)

- レート制限: POST `/api/events` は 10 req/min, POST `/api/events/:id/responses` は 30 req/min
- 同名の参加者が再回答すると上書きされる (upsert)
- Candidate IDs (`candidate_id`) are integer IDs, not ULIDs
- 候補日は自由形式テキスト (例: `6/15(月) 19:00-`)

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `Error: 404 Not Found` | イベントIDが間違っている、または削除済み | ID を確認 |
| `Error: 400 Bad Request` | バリデーションエラー | 入力値を確認 (名前必須、候補日1件以上) |
| `connection refused` | API が起動していない、または URL が間違っている | `SOROU_API_URL` を確認, `curl $SOROU_API_URL/api/events/<id>` で疎通確認 |
| `Error: parsing response` | API が予期しないレスポンスを返した | `curl -v` で生レスポンスを確認 |
