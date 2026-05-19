# Architecture

pnpm workspaces のモノレポ。Next.js Web、Discord Bot、Drizzle スキーマパッケージの 3 つで構成する。

## パッケージ

<!-- prettier-ignore -->
| パス | 公開名 | 役割 |
| --- | --- | --- |
| `apps/web` | `@repo/web` | Next.js 16 App Router (standalone)。ユーザー向け UI と BFF |
| `apps/bot` | `apps/bot` | Discord.js Bot。`tsup` で ESM ビルドして `node22` で起動 |
| `packages/database` | `@repo/database` | Drizzle ORM スキーマ・接続・マイグレーション |

クロスパッケージ依存は `@repo/database` のみ。`apps/bot/tsup.config.ts` は `noExternal: [/^@repo\//]` で `@repo/database` を bundle に含める。

## ランタイム依存

<!-- prettier-ignore -->
| 依存 | 用途 |
| --- | --- |
| PostgreSQL 17 | アプリ DB (users / sessions / discord_outbox) |
| Redis 7 | Bot → Web のログ pub/sub |
| AWS Cognito | OIDC IdP |
| Discord API | Bot |
| OpenAI API | Bot の chat mod |
| Cloudflare Tunnel | 本番の公開 ingress |

## データフロー

### 認証 (Cognito OIDC)

```
Browser ──/sign-in──▶ Web ──redirect──▶ Cognito Hosted UI
                                          │
                                          ▼
Browser ◀──set-cookie── Web ◀──/api/auth/callback── Cognito
        (session token)        (code exchange + DB upsert)
```

セッションは `sessionsTable` に保存し、Cookie には DB の token (32 byte random) のみを置く。詳細は [web.md](./web.md)。

### Web から Bot への送信 (outbox)

```
Web Server Action ──INSERT──▶ discord_outbox (status='pending')
                                  ▲
                                  │ poll 10s
                                  │
                                Bot send-message mod ──Discord API──▶ channel
```

`FOR UPDATE SKIP LOCKED` で claim し、3 回失敗で `failed`。詳細は [bot.md](./bot.md)。

### Bot ログの SSE 配信

```
Bot pino multistream ─publish─▶ Redis "bot:logs" ─subscribe─▶ Web SSE ─▶ /logs
```

チャンネル名 `bot:logs` は `apps/bot/src/logger.ts` と `apps/web/src/app/(authed)/logs/stream/route.ts` で同期する。

## 環境変数

各パッケージの `src/config.ts` で `valibot` を使い起動時にパースする。`process.env` の直参照禁止。`config` は Proxy 経由の lazy 初期化で、`next build` や `tsup` のビルド時には env を要求しない。

例ファイル:

<!-- prettier-ignore -->
| ファイル | 用途 |
| --- | --- |
| `apps/web/.env.local.example` | Web 開発用 |
| `apps/bot/.env.local.example` | Bot 開発用 |
| `packages/database/.env.local.example` | drizzle-kit 用 |
| `deploy/.env.local.example` | 本番 VM 用 (全 service 共有) |
