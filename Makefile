.PHONY: deploy build check lint test fmt dev db-generate db-migrate help

# Cloudflare 環境変数（用意されていない場合はエラー）
CF_API_TOKEN ?=
CF_ACCOUNT_ID ?=

deploy: ## Cloudflare Workers にデプロイ
	@test -n "$(CF_API_TOKEN)" || { echo "❌ CF_API_TOKEN が設定されていません"; exit 1; }
	@test -n "$(CF_ACCOUNT_ID)" || { echo "❌ CF_ACCOUNT_ID が設定されていません"; exit 1; }
	CLOUDFLARE_API_TOKEN=$(CF_API_TOKEN) CLOUDFLARE_ACCOUNT_ID=$(CF_ACCOUNT_ID) npm run deploy

build: ## ビルド（dry-run）
	npm run build

check: lint test ## 全チェック（lint + typecheck + test）
	npx tsc --noEmit

lint: ## ESLint + 型チェック
	npm run lint
	npx tsc --noEmit

test: ## テスト実行
	npm test

fmt: ## コードフォーマット
	npm run format

dev: ## 開発サーバー起動
	npm run dev

db-generate: ## Drizzle マイグレーションファイル生成
	npm run db:generate

db-migrate: ## ローカル D1 にマイグレーション適用
	npm run db:migrate

help: ## ヘルプ表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
