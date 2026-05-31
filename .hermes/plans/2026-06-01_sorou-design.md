# Plan: sorou（揃う）— 既存サービスと同様の日程調整ツール

## Status
- [x] 要件定義（docs/DESIGN.md, docs/SPEC.md）
- [ ] 実装

## 決定事項まとめ

| 項目 | 決定 |
|------|------|
| Repo 名 | `sorou` |
| 互換性 | 機能的同等（URL/API互換不要） |
| 認証 | 不要 |
| インフラ | Cloudflare Workers + D1 |
| 言語 | TypeScript |
| Framework | Hono (JSX + JSON API) |
| ORM | Drizzle ORM |
| UI | SSR (Hono JSX) + Tailwind CSS |
| ID | ULID |
| API | HTML系 (form POST) + REST系 (JSON) |
| ドメイン | カスタムドメイン |
| スコープ | MVP: イベント作成 + 出欠回答 + 共有URL |

## ファイル

- `/home/whywaita/sorou/docs/DESIGN.md`
- `/home/whywaita/sorou/docs/SPEC.md`
