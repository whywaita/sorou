---
name: sorou
description: >
  REST API client for the sorou schedule adjustment service. Use when the user
  needs to create schedule adjustment events, view event details and responses,
  or submit attendance responses. All operations via curl + JSON.
  Triggers include requests to "日程調整を作成して", "イベントを作って",
  "出欠を確認して", "回答して", "create a poll", "schedule an event",
  or any task involving sorou events.
  Prefer direct REST API calls via curl.
allowed-tools: Bash(curl:*)
hidden: true
---

# sorou

sorou is a no-auth schedule adjustment service (日程調整ツール) running on Cloudflare Workers.
All operations use the REST JSON API — no CLI, no SDK, just `curl`.

**`SOROU_API_URL` is required** for all commands below.

```bash
export SOROU_API_URL=https://<your-sorou-instance>
```

If you don't know the sorou API URL, **ask the user** before attempting any sorou commands.
Do not guess or assume a default domain.

## Start here

sorou has 3 REST API endpoints, all `Content-Type: application/json`, no authentication:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events/:id` | Get event details + responses |
| `POST` | `/api/events/:id/responses` | Submit/update attendance response |

Error responses follow a common format:

```json
{"error": "<code>", "message": "<human-readable>"}
```

Error codes: `validation_error` (400), `not_found` (404), `rate_limited` (429).

## API Reference

### Create Event — `POST /api/events`

Creates a new schedule adjustment event.

```bash
curl -s -X POST "$SOROU_API_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "飲み会の日程調整",
    "memo": "お店は決まり次第連絡します",
    "dates": ["6/15(月) 19:00-", "6/16(火) 19:00-", "6/17(水) 19:00-"]
  }'
```

| Field | Required | Type | Max | Description |
|-------|----------|------|-----|-------------|
| `name` | yes | string | 100 chars | Event name |
| `memo` | no | string | 500 chars | Optional note |
| `dates` | yes | string[] | 30 items | Candidate dates (free format, e.g. `"6/15(月) 19:00-"`) |

**Success** (`201 Created`):
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
  "url": "/e/01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "created_at": "2026-06-01T12:00:00Z"
}
```

Key fields: `id` (ULID, use for subsequent calls), `dates[].id` (integer candidate ID for responses), `url` (shareable path).

**Rate limit**: 10 req/min per IP.

### Get Event — `GET /api/events/:id`

Retrieves event details including all responses.

```bash
curl -s "$SOROU_API_URL/api/events/01ARZ3NDEKTSV4RRFFQ69G5FAV" | jq .
```

**Success** (`200 OK`):
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
        {"candidate_id": 2, "status": "△"},
        {"candidate_id": 3, "status": "×"}
      ]
    }
  ],
  "summary": [
    {"candidate_id": 1, "count_yes": 1, "count_maybe": 0, "count_no": 0},
    {"candidate_id": 2, "count_yes": 0, "count_maybe": 1, "count_no": 0},
    {"candidate_id": 3, "count_yes": 0, "count_maybe": 0, "count_no": 1}
  ],
  "created_at": "2026-06-01T12:00:00Z"
}
```

**Error** (`404 Not Found`):
```json
{"error": "not_found", "message": "イベントが見つかりません"}
```

### Submit Response — `POST /api/events/:id/responses`

Submits or updates an attendance response. Same name = upsert (overwrites previous).

```bash
curl -s -X POST "$SOROU_API_URL/api/events/01ARZ3NDEKTSV4RRFFQ69G5FAV/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_name": "whytaro",
    "comment": "遅れるかも",
    "statuses": [
      {"candidate_id": 1, "status": "〇"},
      {"candidate_id": 2, "status": "△"},
      {"candidate_id": 3, "status": "×"}
    ]
  }'
```

| Field | Required | Type | Max | Description |
|-------|----------|------|-----|-------------|
| `participant_name` | yes | string | 50 chars | Your display name |
| `comment` | no | string | 200 chars | Optional comment |
| `statuses` | yes | object[] | — | One entry per date candidate |

`statuses[].candidate_id` must match `dates[].id` from event creation.
`statuses[].status` values: `"〇"` (yes/attending), `"△"` (maybe), `"×"` (no/not attending).

**Success — new response** (`200 OK`, `updated: false`):
```json
{
  "id": 1,
  "participant_name": "whytaro",
  "comment": "遅れるかも",
  "statuses": [
    {"candidate_id": 1, "status": "〇"},
    {"candidate_id": 2, "status": "△"},
    {"candidate_id": 3, "status": "×"}
  ],
  "created_at": "2026-06-01T12:05:00Z",
  "updated": false
}
```

**Success — updated existing** (`200 OK`, `updated: true`):
(Same shape, `updated: true` — previous response by same `participant_name` was overwritten.)

**Error** (`400 Bad Request`):
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

**Rate limit**: 30 req/min per IP.

## Common Workflows

### Create event and share URL

```bash
# 1. Create
RESP=$(curl -s -X POST "$SOROU_API_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"name":"チーム飲み会","dates":["6/20(土) 19:00-","6/21(日) 18:00-"]}')
EVENT_ID=$(echo "$RESP" | jq -r '.id')
SHARE_URL="$SOROU_API_URL$(echo "$RESP" | jq -r '.url')"
echo "Share this URL: $SHARE_URL"

# 2. Check responses later
curl -s "$SOROU_API_URL/api/events/$EVENT_ID" | jq '.summary'
```

### Submit response for someone

```bash
curl -s -X POST "$SOROU_API_URL/api/events/$EVENT_ID/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_name": "田中",
    "comment": "楽しみにしてます",
    "statuses": [
      {"candidate_id": 1, "status": "〇"},
      {"candidate_id": 2, "status": "〇"}
    ]
  }'
```

### List all responses with names

```bash
curl -s "$SOROU_API_URL/api/events/$EVENT_ID" | jq '[.responses[] | {name: .participant_name, statuses: [.statuses[] | "c\(.candidate_id)=\(.status)"] | join(", ")}]'
```

## Why sorou

- 認証不要 — no account creation or login needed
- エッジネイティブ — runs on Cloudflare Workers globally
- REST JSON API — universally accessible via curl, no SDK required
- シンプル — 3 endpoints, minimal learning curve
- オープンソース — self-hostable on your own Cloudflare account

## 注意点 (Caveats)

- レート制限: POST `/api/events` は 10 req/min, POST `/api/events/:id/responses` は 30 req/min
- 同名の参加者が再回答すると上書きされる (upsert by `participant_name`)
- Candidate IDs (`candidate_id`) are integer IDs from the `dates[].id` field, not ULIDs
- 候補日は自由形式テキスト (例: `6/15(月) 19:00-`)
- GET 系にレート制限はなし（Workers の自動スケーリングに任せる）

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `{"error":"not_found"}` | イベントIDが間違っている、または削除済み | ID を確認 |
| `{"error":"validation_error"}` | バリデーションエラー | `details` フィールドを確認（名前必須、候補日1件以上） |
| `connection refused` | API が起動していない、または URL が間違っている | `echo $SOROU_API_URL` を確認 |
| `{"error":"rate_limited"}` (429) | レート制限超過 | 1分待って再試行 |
| 予期しないレスポンス | API がエラーを返している | `curl -v "$SOROU_API_URL/api/events/$ID"` で生レスポンスを確認 |
