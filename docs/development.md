# Development

ローカルでの環境構築と日次操作。

## 前提

<!-- prettier-ignore -->
| ツール | バージョン |
| --- | --- |
| Node.js | 22 (`.nvmrc`) |
| pnpm | 10 |
| Docker / Compose | 任意の最新版 |

## 初回セットアップ

```sh
nvm use
pnpm install
docker compose up -d            # postgres (5433) + redis (6379)
```

各パッケージで `.env.local.example` をコピーし、必要な値を埋める:

```sh
cp apps/web/.env.local.example          apps/web/.env.local
cp apps/bot/.env.local.example          apps/bot/.env.local
cp packages/database/.env.local.example packages/database/.env.local
```

`compose.yaml` の Postgres はホスト側 5433 に bind するため、`.env.local` の `DATABASE_URL` のポートを `5432` → `5433` に書き換える (例: `postgres://postgres:postgres@localhost:5433/postgres`)。

マイグレーション適用:

```sh
pnpm --filter @repo/database migrate
```

## 開発コマンド

ルートで実行する pnpm スクリプトは workspace 全体に再帰的に流れる。

<!-- prettier-ignore -->
| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 全パッケージの `dev` を並列起動 |
| `pnpm build` | 全パッケージの `build` を逐次実行 |
| `pnpm typecheck` | 全パッケージで `tsc --noEmit` |
| `pnpm check` | Biome の format + lint |
| `pnpm check:write` | 上記を書き込みモードで実行 |

個別パッケージは `pnpm --filter <name> <script>`:

<!-- prettier-ignore -->
| パッケージ | dev | build |
| --- | --- | --- |
| `@repo/web` | `next dev` (port 3000) | `next build` (standalone) |
| `apps/bot` | `tsup --watch` + `node --env-file=.env.local dist/main.js` | `tsup` |
| `@repo/database` | (なし) | `tsc` |

## DB 操作

<!-- prettier-ignore -->
| コマンド | 内容 |
| --- | --- |
| `pnpm --filter @repo/database generate` | スキーマ差分から SQL を生成 (`drizzle/`) |
| `pnpm --filter @repo/database migrate` | 生成済 SQL を適用 |
| `pnpm --filter @repo/database push` | スキーマを直接 push (dev only) |
| `pnpm --filter @repo/database studio` | drizzle-studio (ブラウザ GUI) |

スキーマ変更は必ず `generate` で SQL を生成してコミットする。`push` は履歴を残さないので production 向きではない。

## コーディング規約

- 全パッケージが `@tsconfig/strictest` を継承。型のみ import は `import type` を明示する。
- Biome 2.4.15 が単一の formatter/linter。スペースインデント、ダブルクォート、`organizeImports`。
- 依存追加・削除は `pnpm add` / `pnpm remove` 経由。`package.json` を直接編集しない。
- サーバー専用モジュールには `import "server-only"` を付ける (Web 側)。
- 環境変数は各パッケージの `src/config.ts` 経由で読む。`process.env` 直参照禁止。
