# Web (`apps/web`)

Next.js 16 App Router。ユーザー UI と認証付き BFF。`output: "standalone"` で本番 image に固める。

## ディレクトリ

```
src/
├── app/
│   ├── (authed)/              認証必須グループ
│   │   ├── layout.tsx          AppShell + サーバーガード (verifySession)
│   │   ├── page.tsx            トップ
│   │   ├── logs/
│   │   │   ├── page.tsx        Bot ログ閲覧画面
│   │   │   └── stream/route.ts SSE エンドポイント (Redis subscribe)
│   │   ├── send/               Discord 送信フォーム (outbox INSERT)
│   │   └── settings/           ユーザー設定
│   ├── api/auth/callback/      Cognito OIDC callback
│   ├── sign-in/                未認証ランディング → Cognito へリダイレクト
│   ├── sign-out/               セッション削除 → Cognito logout
│   └── signed-out/             ログアウト後ランディング
├── lib/
│   ├── auth.ts                 OIDC discovery, セッション CRUD
│   ├── dal.ts                  verifySession (React cache で重複排除)
│   ├── safe-action.ts          next-safe-action ベースの authActionClient
│   └── redis.ts                ioredis インスタンス
├── proxy.ts                    middleware 相当の認証ゲート
├── config.ts                   valibot で env パース (lazy Proxy)
└── theme.tsx                   MUI v9 + Emotion テーマ
```

## 認証

AWS Cognito OIDC。`openid-client` の Configuration を `getOidcConfig()` で遅延 discovery + キャッシュする。

セッション格納は DB の `sessionsTable` で、Cookie (`session`) には DB token のみ。TTL は `config.session.ttlMs` (7 日)。アクセスのたびに `getSessionUser` が `expiresAt` を更新する slide ttl。

`apps/web/src/proxy.ts` (App Router middleware) はセッション Cookie の有無で `/sign-in` リダイレクトを判定する。`ALWAYS_ALLOWED` のパス (`/sign-in`, `/sign-out`, `/signed-out`, `/api/auth/callback`) は素通し。

サーバー側のページ・アクションは `verifySession()` で検証する。`React cache` で同一リクエスト内の重複呼び出しを排除する。サーバーアクションは `authActionClient` (`next-safe-action`) を経由し、`ctx.user` に認証済みユーザーを注入する。

### OAuth callback の redirect_uri

リバースプロキシ越しだと `openid-client` が `req.url` の内部オリジン (`http://localhost:3000`) を redirect_uri にしてしまう。`/api/auth/callback` では `config.cognito.redirectUri` から完全な URL を組み直して `code` exchange に渡す。

### Cognito App Client 設定

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Allowed callback URLs | `${APP_BASE_URL}/api/auth/callback` |
| Allowed sign-out URLs | `${APP_BASE_URL}/signed-out` |

## ログストリーム

`/logs` ページは EventSource で `/logs/stream` を購読する。SSE エンドポイントは Redis の `bot:logs` チャンネルを subscribe して各クライアントへ転送する。チャンネル名 `LOG_CHANNEL` は Bot 側 (`apps/bot/src/logger.ts`) と同期する。

## ビルド時の env

`config` は Proxy で lazy 初期化のため、`next build` は env なしで通る。`@repo/database` の `database` も同様に lazy で、ビルド時に DB 接続を要求しない。

`next-env.d.ts` は gitignore。`pnpm typecheck` 時に `next typegen` が先に走って再生成される。
