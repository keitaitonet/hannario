# Documentation

<!-- prettier-ignore -->
| Topic | 内容 |
| --- | --- |
| [Architecture](./architecture.md) | パッケージ構成・データフロー・ランタイム依存 |
| [Development](./development.md) | ローカル開発のセットアップと日次コマンド |
| [Web](./web.md) | `apps/web` の構造、Cognito 認証、SSE ログ |
| [Bot](./bot.md) | `apps/bot` の mod 構造、ロガー、outbox |
| [Database](./database.md) | `@repo/database` のスキーマとマイグレーション運用 |
| [Deployment](./deployment.md) | 本番デプロイ全般 |

新しいトピックは sibling として `.md` を追加。1 ファイルに収まらなくなったらそのトピックだけサブディレクトリへ昇格。
