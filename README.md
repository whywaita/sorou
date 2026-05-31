# sorou（揃う）

既存の日程調整サービスと同様の機能を提供する、シンプルな日程調整ツール。認証不要、Cloudflare Workers + D1 で動作。

## 特徴

- 🔓 **認証不要** — URL を知っていれば誰でもアクセス・回答可能
- ⚡ **エッジネイティブ** — Cloudflare Workers でグローバル低遅延
- 🎨 **シンプル UI** — Hono JSX によるサーバーサイドレンダリング
- 🤖 **AI Agent 対応** — REST API 完備、CLI ツール提供予定

## 開発ステータス

- [x] 要件定義（DESIGN.md, SPEC.md）
- [ ] 実装

## ドキュメント

- [DESIGN.md](docs/DESIGN.md) — アーキテクチャ、データモデル、画面設計
- [SPEC.md](docs/SPEC.md) — 機能要件、API 仕様、テスト計画

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Runtime | Cloudflare Workers |
| Framework | [Hono](https://hono.dev/) |
| DB | Cloudflare D1 |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| UI | Hono JSX + Tailwind CSS |
| Language | TypeScript |
