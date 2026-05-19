# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 起点ドキュメント

詳細は `docs/` に分割済み。作業前に該当トピックを必ず読む。

<!-- prettier-ignore -->
| Topic | 場所 |
| --- | --- |
| 全体像・パッケージ依存・データフロー | `docs/architecture.md` |
| ローカル開発・コーディング規約 | `docs/development.md` |
| `apps/web` (Next.js 16, Cognito, SSE) | `docs/web.md` |
| `apps/bot` (Discord.js, outbox, logger) | `docs/bot.md` |
| `@repo/database` (Drizzle, migration) | `docs/database.md` |
| 本番デプロイ (GHA + self-hosted runner) | `docs/deployment.md` |

## 構成

pnpm workspaces のモノレポ。`apps/web` (Next.js 16 App Router, MUI v9, standalone)、`apps/bot` (Discord.js + tsup ESM bundle)、`packages/database` (Drizzle ORM, postgres) の 3 つ。クロスパッケージ依存は `@repo/database` のみ。

ランタイム依存: PostgreSQL 17 / Redis 7 / AWS Cognito / Discord API / OpenAI API / Cloudflare Tunnel。

## コマンド

ルートで実行する pnpm スクリプトは workspace 全体に再帰的に流れる。

<!-- prettier-ignore -->
| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 全パッケージの `dev` を並列起動 |
| `pnpm build` | 全パッケージの `build` を逐次実行 |
| `pnpm typecheck` | `tsc --noEmit` を全パッケージで実行 (Web では事前に `next typegen`) |
| `pnpm check` | Biome の format + lint |
| `pnpm check:write` | 上記を書き込みモードで実行 |

個別操作は `pnpm --filter <name> <script>`。例:

- `pnpm --filter @repo/web dev` — Next.js dev サーバ (port 3000)
- `pnpm --filter @repo/bot dev` — tsup watch + `node --env-file=.env.local dist/main.js`
- `pnpm --filter @repo/database generate` — スキーマ差分から SQL 生成 (`drizzle/`)
- `pnpm --filter @repo/database migrate` — 生成済 SQL を適用
- `pnpm --filter @repo/database studio` — drizzle-studio GUI

初回セットアップは `docs/development.md`。`docker compose up -d` で Postgres を host 側 5433 に bind するため、各 `.env.local` の `DATABASE_URL` ポートは `5433` にする。

## 規約 (忘れやすいもの)

- Node.js 22 (`.nvmrc`)、pnpm 10。依存追加・削除は `pnpm add` / `pnpm remove` 経由。`package.json` 直接編集は禁止。
- 全パッケージが `@tsconfig/strictest` を継承。型のみ import は `import type` を明示。
- Biome 2.4.15 が単一の formatter/linter。スペースインデント、ダブルクォート、`organizeImports`。`drizzle/` は対象外。
- 環境変数は各パッケージの `src/config.ts` (valibot + lazy Proxy) 経由で読む。`process.env` 直参照禁止。
- Web のサーバー専用モジュールには `import "server-only"` を付ける。
- `apps/bot/tsup.config.ts` は `noExternal: [/^@repo\//]` で `@repo/database` を bundle に含める。
- DB スキーマ変更は `generate` で SQL を生成してコミットする。`push` は履歴を残さず production 不可。
- 生成された `drizzle/` SQL と `next-env.d.ts` は gitignore / Biome 対象外。
- Web の `next build` は env 不要 (`config` と `database` が lazy Proxy)。OAuth callback では `config.cognito.redirectUri` から redirect_uri を組み直す (reverse proxy 越しの `req.url` 罠回避)。

## データフローの要点

- 認証: Cognito Hosted UI → `/api/auth/callback` で code exchange → `sessionsTable` に書き込み、Cookie には DB token のみ。`verifySession()` は React `cache` で同一リクエスト内で重複排除。
- Web → Bot: Server Action から `discord_outbox` に INSERT のみ。Bot 側が 10 秒毎に `FOR UPDATE SKIP LOCKED` で claim → Discord 送信。失敗は backoff、3 回で `failed`、5 分滞留した `sending` は起動時に `recoverStuck` で `pending` 復帰。
- Bot ログ: pino multistream で stdout / 200 行リングバッファ / Redis `bot:logs` チャンネルへ pub。Web の `/logs/stream` が subscribe して SSE 配信。チャンネル名は `apps/bot/src/logger.ts` と `apps/web/src/app/(authed)/logs/stream/route.ts` で同期。
