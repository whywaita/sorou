# sorou（揃う）

既存の日程調整サービスと同様の機能を提供する、シンプルな日程調整ツール。認証不要、Cloudflare Workers + D1 で動作。

## 特徴

- 🔓 **認証不要** — URL を知っていれば誰でもアクセス・回答可能
- ⚡ **エッジネイティブ** — Cloudflare Workers でグローバル低遅延
- 🎨 **シンプル UI** — Hono JSX によるサーバーサイドレンダリング
- 🤖 **AI Agent 対応** — REST JSON API 完備、curl で全操作可能。Agent Skills も提供（後述）

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

## AI エージェント向け Agent Skills

sorou は AI コーディングエージェント（Claude Code, Codex, Cursor, GitHub Copilot など）が直接操作できる **Agent Skills** を提供しています。

Agent Skills をインストールすると、エージェントは curl による REST JSON API 経由で sorou の全操作（イベント作成・出欠確認・回答送信）を自律的に実行できるようになります。

### インストール

**GitHub CLI (`gh`)** を使う場合：

```bash
gh skill install whywaita/sorou
```

**npm (`npx`)** を使う場合：

```bash
npx skills add whywaita/sorou
```

> [!TIP]
> どちらのコマンドも、リポジトリの `skills/sorou/SKILL.md` を取得してエージェントのスキルディレクトリに配置します。
> スキルは常に GitHub 上の最新版が使われるため、手動で更新する必要はありません。

### できること

エージェントに以下のような指示が出せるようになります：

- 「sorou で飲み会の日程調整を作成して」
- 「イベントの出欠状況を確認して」
- 「〇△×で回答しておいて」

詳細な API 仕様は [SPEC.md](docs/SPEC.md) の「5. API 仕様」を参照してください。
