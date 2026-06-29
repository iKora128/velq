.PHONY: dev build front test lint fmt clean release release-minor release-major tag-release bump-patch bump-minor bump-major keygen help

APP_DIR := apps/desktop

# ----- Development -----
dev:                ## Run the desktop app (cargo tauri dev)
	cd $(APP_DIR) && cargo tauri dev

front:              ## Frontend only (Vite @ :1420) for UI work / screenshots
	pnpm --filter desktop dev

build:              ## Build the desktop app (cargo tauri build)
	cd $(APP_DIR) && cargo tauri build

# ----- Quality -----
test:               ## Run all Rust + frontend tests
	cargo test --workspace
	pnpm -r test

lint:               ## Lint (biome + clippy)
	pnpm lint
	cargo clippy --workspace --all-targets -- -D warnings

fmt:                ## Format (biome + rustfmt)
	pnpm format
	cargo fmt --all

clean:
	cargo clean
	rm -rf node_modules apps/*/node_modules apps/desktop/dist

# ----- Release (version synced across 3 files; tag triggers GitHub Actions) -----
SYNC_VERSION = VERSION=$$(node -p "require('./package.json').version"); \
	sed -i '' "s/\"version\": \".*\"/\"version\": \"$$VERSION\"/" $(APP_DIR)/src-tauri/tauri.conf.json; \
	sed -i '' "s/^version = \".*\"/version = \"$$VERSION\"/" Cargo.toml; \
	echo "Version synced to $$VERSION"

bump-patch:
	@npm version patch --no-git-tag-version >/dev/null
	@$(SYNC_VERSION)
bump-minor:
	@npm version minor --no-git-tag-version >/dev/null
	@$(SYNC_VERSION)
bump-major:
	@npm version major --no-git-tag-version >/dev/null
	@$(SYNC_VERSION)

define DO_RELEASE
	@$(SYNC_VERSION)
	@VERSION=$$(node -p "require('./package.json').version"); \
	git add package.json Cargo.toml $(APP_DIR)/src-tauri/tauri.conf.json; \
	git commit -m "chore: bump version to $$VERSION"; \
	TAG="v$$VERSION-$$(date +%Y%m%d-%H%M)"; \
	echo "Releasing $$TAG"; \
	git tag "$$TAG" && git push origin main "$$TAG" && \
	echo "$$TAG pushed — GitHub Actions will build and publish."
endef

release: bump-patch          ## Bump patch + tag + push (triggers CI release)
	$(DO_RELEASE)
release-minor: bump-minor
	$(DO_RELEASE)
release-major: bump-major
	$(DO_RELEASE)

tag-release:                 ## Tag current version without bumping
	@VERSION=$$(node -p "require('./package.json').version"); \
	git tag "v$$VERSION" && git push origin "v$$VERSION"

keygen:                      ## Generate updater signing key (store private key in CI secrets)
	@mkdir -p ~/.tauri
	@cd $(APP_DIR) && cargo tauri signer generate -w ~/.tauri/velq.key
	@echo "Copy the PUBLIC key into tauri.conf.json plugins.updater.pubkey;"
	@echo "add the PRIVATE key to GitHub Secrets as TAURI_SIGNING_PRIVATE_KEY."

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
