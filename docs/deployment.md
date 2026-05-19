# Deployment

自宅 VM 1 台。main マージで GitHub Actions が image を build & GHCR push、self-hosted runner が VM 上で `docker compose` を更新する。

## Topology

```
push to main
   │
   ▼
GHA cloud runner (.github/workflows/release.yml)
   ├── build (matrix: web/bot/migrate) ──► GHCR (:sha-<short>, :latest)
   └── deploy (self-hosted, label `hannario-production`)
        └─► home VM
              cp ~/hannario/.env.local deploy/.env.local
              docker compose pull
              docker compose run --rm migrate
              docker compose up -d --wait web bot

home VM (compose project `hannario-production`)
   postgres / redis / web (:3000) / bot
   ← Cloudflare Tunnel ingress: http://localhost:3000
```

## Image tag

<!-- prettier-ignore -->
| Tag | 用途 |
| --- | --- |
| `:sha-<short>` | rollback 用の pinning |
| `:latest` | `compose.yaml` のデフォルト |

`compose.yaml` は `${IMAGE_TAG:-latest}`。`IMAGE_TAG` は shell env から読む (`.env.local` ではない)。

## 初回セットアップ

### Docker

```sh
docker --version && docker compose version
# 無ければ:
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get install -y docker-compose-plugin
sudo usermod -aG docker "$USER"
```

### self-hosted runner

repo Settings → Actions → Runners で発行された手順を実行。label に `hannario-production` を含める。

```sh
cd ~/actions-runner
sudo ./svc.sh install && sudo ./svc.sh start
```

確認:

```sh
gh api repos/keitaitonet/hannario/actions/runners \
  --jq '.runners[] | {name, status, labels: [.labels[].name]}'
```

### `.env.local`

workspace 外に置く (`actions/checkout` 初回 fetch が workspace を wipe するため)。

```sh
mkdir -p ~/hannario
nano ~/hannario/.env.local           # deploy/.env.local.example を見て埋める
chmod 600 ~/hannario/.env.local
```

### Cloudflare Tunnel

cloudflared の ingress:

```yaml
ingress:
  - hostname: hannario.example.com
    service: http://localhost:3000
  - service: http_status:404
```

### Cognito App Client

AWS Console → Cognito → User pool → App integration → App client で完全一致登録:

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Allowed callback URLs | `${APP_BASE_URL}/api/auth/callback` |
| Allowed sign-out URLs | `${APP_BASE_URL}/signed-out` |

## 日次運用

### deploy

main にマージ → `release.yml` が自動実行。

```sh
gh run watch
```

### 状態確認

```sh
cd ~/actions-runner/_work/hannario/hannario/deploy
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 bot
```

### rollback

過去の sha tag は https://github.com/keitaitonet/hannario/pkgs/container/hannario-web で確認。

```sh
cd ~/actions-runner/_work/hannario/hannario/deploy
IMAGE_TAG=sha-xxxxxxx docker compose pull
IMAGE_TAG=sha-xxxxxxx docker compose up -d --wait web bot
```

最新に戻す時は `IMAGE_TAG=` を省略。

### env 変更

```sh
nano ~/hannario/.env.local
cd ~/actions-runner/_work/hannario/hannario/deploy
cp ~/hannario/.env.local .env.local
docker compose up -d --force-recreate web bot
```

### postgres / redis 更新

`compose.yaml` の image tag を編集 → PR → merge。`release.yml` の `up -d --wait web bot` は postgres / redis に触らないので、VM 上で手動:

```sh
docker compose pull postgres redis
docker compose up -d postgres redis
```

major version bump は data dir 非互換なので dump / restore が必要。

## 注意点

<!-- prettier-ignore -->
| 制約 | 補足 |
| --- | --- |
| `env_file: .env.local` が全 service に全 var を注入 | bot に `COGNITO_*`、web に `DISCORD_*` も入る。single-user 想定なら許容 |
| Port 3000 が `0.0.0.0` bind | VM IP に直接届く。CF Tunnel 経由のみにしたい場合は `compose.yaml` を `"127.0.0.1:3000:3000"` へ |
| build 時に env 不要 | `config.ts` と `@repo/database#database` は lazy Proxy。`next build` は env 無しで通る |
| `next-env.d.ts` は gitignore | `pnpm typecheck` で `next typegen` が先に走って再生成 |
| OAuth callback で URL を明示構築 | reverse proxy 越しだと openid-client が `req.url` の内部オリジンを redirect_uri にしてしまう。`config.cognito.redirectUri` から組み直して渡す |
