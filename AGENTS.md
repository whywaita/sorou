# AGENTS.md — sorou

AI エージェント／コントリビューター向けの作業ガイド。詳細仕様は [docs/SPEC.md](docs/SPEC.md)・[docs/DESIGN.md](docs/DESIGN.md) を参照。

## プロジェクト概要

認証不要のシンプルな日程調整ツール。イベントを作成し、発行された URL を共有して参加者の出欠（〇△×）を収集・可視化する。Cloudflare Workers（エッジ）+ D1 で動作する。

## 技術スタック

| レイヤー  | 技術                                                     |
| --------- | -------------------------------------------------------- |
| Runtime   | Cloudflare Workers                                       |
| Framework | [Hono](https://hono.dev/)                                |
| DB        | Cloudflare D1                                            |
| ORM       | [Drizzle ORM](https://orm.drizzle.team/)                 |
| UI        | Hono JSX + Tailwind CSS（SSR、クライアント JS は最小限） |
| Language  | TypeScript                                               |
| Test      | Vitest                                                   |

## よく使うコマンド

| 目的              | コマンド      |
| ----------------- | ------------- |
| 開発サーバー      | `make dev`    |
| テスト            | `make test`   |
| Lint + 型チェック | `make lint`   |
| 全チェック        | `make check`  |
| フォーマット      | `make fmt`    |
| デプロイ          | `make deploy` |

`make deploy` は `CF_API_TOKEN` と `CF_ACCOUNT_ID` の環境変数が必須。

## 開発ルール

- **TDD**: Red-Green-Refactor。まず失敗するテストを書き、通る最小限のコードを書き、リファクタリングする。各機能にハッピーパスとエラーパスの両方のテストを含める。
- **フォーマット**: 作業完了前に `make fmt`（Prettier）を実行する。
- **型・Lint**: `make lint`（ESLint + `tsc --noEmit`）が通ること。
- **SSR 優先**: UI は Hono JSX による SSR が基本。クライアント JS は入力補助などの段階的拡張に限定し、JS 無効時は手入力にフォールバックできるようにする（例: 候補日カレンダー F-30）。
- **バリデーション**: 入力バリデーションはサーバーサイド（Zod, `src/lib/validation.ts`）で行う。

## デプロイ・インフラ運用

- **シークレット**: 機密情報（`ADMIN_PASSWORD` など）は `wrangler.toml` の `[vars]` に平文で置かず、**必ず Cloudflare Secret で管理する**。

  ```bash
  wrangler secret put ADMIN_PASSWORD
  ```

  Secret は deploy 設定とは別管理のため、`make deploy` で上書き・消去されない。`ADMIN_PASSWORD` 未設定時は管理画面が無効化される（F-27）。

- **`wrangler.toml` とリモート設定の整合**: `wrangler deploy` はローカルの `wrangler.toml` でリモート設定を上書きする。デプロイ前に差分（route, vars, bindings）を確認すること。

- **カスタムドメインは追加しない**: 本プロジェクトはカスタムドメインを**公開しない**。`wrangler.toml` に `[[routes]]` の `custom_domain` 設定を**追加しないこと**。

## API 系統

| 系統  | Content-Type       | 用途                       | 認証             |
| ----- | ------------------ | -------------------------- | ---------------- |
| HTML  | `text/html`        | ブラウザからのフォーム操作 | 不要             |
| REST  | `application/json` | CLI / AI Agent からの操作  | 不要             |
| Admin | `text/html`        | 管理画面（イベント管理）   | `ADMIN_PASSWORD` |

エンドポイント一覧・リクエスト/レスポンス形式は [docs/SPEC.md](docs/SPEC.md) の「5. API 仕様」を参照。
