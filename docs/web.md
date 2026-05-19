# Web (`apps/web`)

Next.js 16 App Router。ユーザー UI と認証付き BFF。`output: "standalone"` で本番 image に固める。

## ディレクトリ

```
src/
├── app/
│   ├── (authed)/              member 必須グループ (granted_at NOT NULL)
│   │   ├── layout.tsx          AppShell + サーバーガード (verifyMember)
│   │   ├── page.tsx            トップ
│   │   ├── logs/
│   │   │   ├── page.tsx        Bot ログ閲覧画面
│   │   │   └── stream/route.ts SSE エンドポイント (Redis subscribe)
│   │   ├── send/               Discord 送信フォーム (outbox INSERT)
│   │   ├── settings/           ユーザー設定
│   │   └── admin/users/        ユーザー一覧 + 権限付与
│   ├── pending/                ログイン済 + 未承認向け待機画面 + polling
│   │   ├── page.tsx            承認待ち UI
│   │   ├── _components/poller.tsx  fetch /pending/status を 5s 間隔
│   │   └── status/route.ts     GET → { granted: boolean }
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

サーバー側のページ・アクションは `verifySession()` で検証する。`React cache` で同一リクエスト内の重複呼び出しを排除する。

## 認可 (membership)

ログイン済 ≠ 利用可。`users.granted_at` が NULL のユーザーは `(authed)/` 配下に入れない。

<!-- prettier-ignore -->
| Helper | 振る舞い |
| --- | --- |
| `getCurrentSession()` | session を返す。未ログインなら `null` (redirect しない)。polling 用 |
| `verifySession()` | 未ログインなら `/sign-in?redirect=...` へ |
| `verifyMember()` | 未ログインなら `/sign-in`、`granted_at` が NULL なら `/pending` へ |

ルーティング:

<!-- prettier-ignore -->
| パス | 要件 | 内容 |
| --- | --- | --- |
| `/pending` | ログイン済 + `granted_at = NULL` | 承認待ち画面 (`PendingPoller` で 5 秒間隔 polling) |
| `/pending/status` | session のみ | GET → `{ granted: boolean }`。未認証なら 401 |
| `(authed)/...` | member (granted) | `layout.tsx` で `verifyMember()` |
| `(authed)/admin/users` | member | 全ユーザー一覧 + 「権限付与」 |

`granted_at` 付与は `(authed)/admin/users/_actions.ts` の `grantUser` server action。`memberActionClient` で守られ、`UPDATE ... WHERE id = ? AND granted_at IS NULL` で二重付与防止。

サーバーアクションのクライアントは 2 段:

<!-- prettier-ignore -->
| Client | 要件 | 用途 |
| --- | --- | --- |
| `authActionClient` | session | 現状未使用 (将来 pending ユーザー向け action を増やす場合用) |
| `memberActionClient` | member | 通常の業務アクション (`updateSettings`, `sendMessage`, `grantUser`) |

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
