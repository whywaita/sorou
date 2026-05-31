.PHONY: build test lint vet fmt clean

GO ?= go

build: ## CLI バイナリをビルド
	$(GO) build -o sorou .

test: ## テストを実行
	$(GO) test ./... -v

lint: vet ## 静的解析
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not installed, running go vet only"; \
	fi

vet: ## go vet
	$(GO) vet ./...

fmt: ## フォーマット
	$(GO) fmt ./...

clean: ## ビルド成果物を削除
	rm -f sorou

help: ## ヘルプ
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
