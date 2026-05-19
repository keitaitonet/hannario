# Bot (`apps/bot`)

Discord.js Bot。`tsup` で ESM 1 ファイルに bundle して Node 22 で起動する。

## エントリーポイント

`src/main.ts` が Discord client を生成し、`src/mods/index.ts` の `mods` 配列を順に `setup(client, modLogger)` で初期化する。

intents:

```ts
GatewayIntentBits.Guilds
GatewayIntentBits.GuildMessages
GatewayIntentBits.MessageContent
```

## Mods

`defineMod({ name, setup })` で定義し、`src/mods/index.ts` の配列に追加すると有効になる。

<!-- prettier-ignore -->
| mod | 役割 |
| --- | --- |
| `sample` | 動作確認用の最小 mod |
| `chat` | OpenAI 連携の会話 |
| `log` | `/log` スラッシュコマンドで直近セッションのログを返信 |
| `send-message` | `discord_outbox` をポーリングして Discord へ送信 |
| `say` | 任意発話コマンド |

新しい機能は `defineMod` で 1 ファイル追加し、`mods` 配列に register する。

## ロガー

Pino の multistream (`src/logger.ts`)。3 つの出力先を持つ:

<!-- prettier-ignore -->
| Stream | 用途 |
| --- | --- |
| 標準出力 | dev は `pino-pretty`、本番は素の JSON |
| メモリリングバッファ (200 行) | `/log` コマンドが pretty 化して返信 |
| Redis pub `bot:logs` | Web 側 SSE が subscribe してブラウザへ転送 |

Redis 接続エラーは握りつぶして `process.stderr` に出すのみ (ログ pub の失敗で Bot 本体を落とさない)。

## Outbox パターン (`send-message`)

Web の Server Action は `discord_outbox` に INSERT するだけで Bot に送信は依頼しない。Bot 側で 10 秒毎にポーリングする。

claim クエリは `FOR UPDATE SKIP LOCKED` で原子的に状態を `pending` → `sending` に遷移させる:

```sql
WITH due AS (
  SELECT id FROM discord_outbox
  WHERE status = 'pending' AND scheduled_at <= now()
  ORDER BY scheduled_at
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE discord_outbox AS o
SET status = 'sending', claimed_at = now(), attempt_count = o.attempt_count + 1
FROM due WHERE o.id = due.id
RETURNING ...;
```

成功で `sent`、失敗で `pending` に戻して `attempt_count * 60s` 後に再試行。3 回失敗で `failed`。`sending` のまま 5 分以上経過した行は起動時に `recoverStuck` が `pending` に戻す (Bot クラッシュ復旧用)。

設定:

<!-- prettier-ignore -->
| 定数 | 値 |
| --- | --- |
| `POLL_INTERVAL_MS` | 10_000 |
| `BATCH_SIZE` | 10 |
| `MAX_ATTEMPTS` | 3 |
| `STUCK_AFTER_MS` | 5 分 |

## ビルド

`tsup.config.ts` は `noExternal: [/^@repo\//]` を指定し、`@repo/database` を含む workspace パッケージを最終 bundle に含める。出力は `dist/main.js`。

本番 image (`apps/bot/Dockerfile`) は Node 22 のスリム image にこの 1 ファイルを置くだけ。
