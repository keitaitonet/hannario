# Database (`@repo/database`)

Drizzle ORM スキーマと接続、マイグレーション SQL の置き場。Web と Bot が共通で import する。

## エクスポート

`src/index.ts` が公開する API:

<!-- prettier-ignore -->
| Symbol | 内容 |
| --- | --- |
| `database` | drizzle インスタンス (lazy Proxy。初回アクセス時に接続を構築) |
| `Database` | 上記の型 |
| `usersTable` 等 | `src/schema.ts` の全 export を re-export |

`database` は Proxy で関数は `bind(cached)` してから返す。`database.query.usersTable.findFirst(...)` のような chain でも内部 `this` が崩れない。

## スキーマ

`src/schema.ts` (postgres dialect)。

<!-- prettier-ignore -->
| テーブル | 主なカラム | 備考 |
| --- | --- | --- |
| `users` | `id`, `cognito_sub` (unique), `name` | Cognito サブで upsert |
| `sessions` | `id`, `token` (unique), `user_id` (FK cascade), `expires_at` | `user_id` と `expires_at` に index |
| `discord_outbox` | `id` (uuid), `channel_id`, `thread_id`, `content`, `status`, `attempt_count`, `scheduled_at` | `(status, scheduled_at)` に index |

`status` の取りうる値: `pending` / `sending` / `sent` / `failed`。詳細は [bot.md](./bot.md) の outbox セクション。

共通カラム `createdAt` / `updatedAt` は `timestamps` 定数で定義。`updatedAt` は drizzle の `$onUpdate` で自動更新する。

## マイグレーション運用

スクリプトはすべて `drizzle-kit` 経由。

<!-- prettier-ignore -->
| コマンド | 内容 |
| --- | --- |
| `pnpm --filter @repo/database generate` | `src/schema.ts` の差分から SQL を生成 |
| `pnpm --filter @repo/database migrate` | 生成済 SQL を順に適用 |
| `pnpm --filter @repo/database push` | スキーマを直接 push (dev のみ) |
| `pnpm --filter @repo/database studio` | drizzle-studio (GUI) |

生成された SQL は `drizzle/` に保存され、Biome の対象外 (生成物のため)。スキーマ変更は必ず `generate` で SQL ファイルを作ってコミットする。`push` は履歴を残さないので production 向きではない。

## drizzle.config.ts

env は `process.loadEnvFile(".env.local")` で読み込んでから `require("./src/config")` で valibot 経由の設定を再利用する。`drizzle-kit` 単独で動かす場合も同じ valibot 検証を通る。

## 本番マイグレーション

本番 (home VM) では `packages/database/Dockerfile` の image を別 service `migrate` として `deploy/compose.yaml` に定義する。`profiles: ["migrate"]` で `up` から除外し、deploy step で `docker compose run --rm migrate` として one-shot 実行する。詳細は [deployment.md](./deployment.md)。
