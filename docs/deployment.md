# Deployment

Production runs on a single home VM. GitHub Actions builds Docker images on the cloud runner, then a self-hosted runner on the VM pulls and restarts services via `docker compose`.

## Topology

```
push to main
   │
   ▼
GitHub Actions (.github/workflows/release.yml)
   ├── build (cloud, matrix: web/bot/migrate)
   │      └─► GHCR (ghcr.io/keitaitonet/hannario-*)
   │            tags: :sha-<short>, :latest
   │
   └── deploy (self-hosted runner, label `hannario-production`)
          └─► home VM
                cd <runner_work>/deploy
                cp ~/hannario/.env.local .env.local
                docker compose pull
                docker compose run --rm migrate
                docker compose up -d --wait web bot

           home VM (docker compose, project `hannario-production`)
                ├── postgres    (named volume `postgres-data`)
                ├── redis       (named volume `redis-data`)
                ├── web         (port 3000)
                └── bot

           Cloudflare Tunnel (cloudflared on VM)
                └── ingress → http://localhost:3000
```

## Components

<!-- prettier-ignore -->
| Component | Where | Role |
| --- | --- | --- |
| GHA cloud runner | GitHub | Builds and pushes images |
| GHA self-hosted runner | home VM, label `hannario-production` | Pulls images, runs compose |
| GHCR | `ghcr.io/keitaitonet/hannario-{web,bot,migrate}` | Image registry (pull via `GITHUB_TOKEN`) |
| `deploy/compose.yaml` | Repo | Defines 5 services (postgres / redis / migrate / web / bot) |
| `~/hannario/.env.local` | VM only | Runtime secrets (gitignored, copied into workspace before deploy) |
| Cloudflare Tunnel | VM (cloudflared) | Public HTTPS termination → `http://localhost:3000` |
| AWS Cognito | AWS | OIDC for web sign-in |

## Image tagging

Each push to main produces two tags per image:

<!-- prettier-ignore -->
| Tag | Purpose |
| --- | --- |
| `:sha-<short>` | Immutable, pinned reference for rollback |
| `:latest` | Mutable pointer used by `compose.yaml`'s default |

`compose.yaml` references `${IMAGE_TAG:-latest}`. Compose reads `IMAGE_TAG` from shell env at parse time (not from `.env.local`). Override inline for rollback (see below).

## VM one-time bootstrap

These steps run once per VM. The runner user (`keitaito`) is assumed.

### 1. Docker engine + compose plugin

```sh
docker --version
docker compose version
```

If absent (Ubuntu/Debian):

```sh
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get install -y docker-compose-plugin
```

### 2. Runner user in `docker` group

```sh
sudo usermod -aG docker "$USER"
sudo systemctl restart actions.runner.*    # reload group
docker ps                                  # must succeed without sudo
```

### 3. Self-hosted runner

Register from repo Settings → Actions → Runners. Label must include `hannario-production` (matches `runs-on:` in `release.yml`). Install as a service:

```sh
cd ~/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
```

Verify online:

```sh
gh api repos/keitaitonet/hannario/actions/runners --jq '.runners[] | {name, status, labels: [.labels[].name]}'
```

### 4. `.env.local` at a stable path

The runner workspace gets reinitialized by `actions/checkout`, so secrets must live outside it.

```sh
mkdir -p ~/hannario
nano ~/hannario/.env.local           # paste from deploy/.env.local.example, fill in
chmod 600 ~/hannario/.env.local
```

Required keys (see `deploy/.env.local.example` for the up-to-date list):

<!-- prettier-ignore -->
| Key | Notes |
| --- | --- |
| `POSTGRES_PASSWORD` | Used by the PG container and by `DATABASE_URL` |
| `DATABASE_URL` | `postgres://postgres:<pw>@postgres:5432/hannario` (in-compose hostname) |
| `REDIS_URL` | `redis://redis:6379` |
| `APP_BASE_URL` | Public URL exposed by Cloudflare Tunnel (e.g. `https://hannario.example.com`) |
| `COGNITO_ISSUER` / `COGNITO_LOGIN_DOMAIN` / `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` | App client values |
| `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` | Discord Developer Portal |
| `OPENAI_API_KEY` | OpenAI or OpenAI-compatible (e.g. Gemini) |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | Optional, override defaults |

### 5. Cloudflare Tunnel

cloudflared `config.yml` ingress:

```yaml
ingress:
  - hostname: hannario.example.com
    service: http://localhost:3000
  - service: http_status:404
```

### 6. Cognito App Client allowed URLs

In AWS Console → Cognito → User pool → App integration → App client, register:

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Allowed callback URLs | `${APP_BASE_URL}/api/auth/callback` |
| Allowed sign-out URLs | `${APP_BASE_URL}/signed-out` |

Exact match required (scheme, host, path, no trailing slash).

## Day-to-day operations

### Deploy

Merge to `main`. `release.yml` builds and deploys automatically. Monitor:

```sh
gh run watch                  # interactive picker
gh run list --workflow=release.yml --limit 5
```

### View status / logs

```sh
cd ~/actions-runner/_work/hannario/hannario/deploy
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 bot
```

### Rollback to a previous image

Image SHA tags are listed at https://github.com/keitaitonet/hannario/pkgs/container/hannario-web (and `-bot`, `-migrate`).

On the VM:

```sh
cd ~/actions-runner/_work/hannario/hannario/deploy
cp ~/hannario/.env.local .env.local            # if not already present
IMAGE_TAG=sha-xxxxxxx docker compose pull
IMAGE_TAG=sha-xxxxxxx docker compose up -d --wait web bot
```

To return to current main, drop the `IMAGE_TAG=` prefix (defaults to `:latest`).

### Update env vars

```sh
nano ~/hannario/.env.local
cd ~/actions-runner/_work/hannario/hannario/deploy
cp ~/hannario/.env.local .env.local
docker compose up -d --force-recreate web bot
```

### Update postgres / redis image versions

Edit `deploy/compose.yaml` in the repo, open PR, merge. After deploy, postgres/redis will not auto-restart with new tag because `up -d --wait web bot` only touches those two services. To pick up new tag manually on the VM:

```sh
cd ~/actions-runner/_work/hannario/hannario/deploy
docker compose pull postgres redis
docker compose up -d postgres redis
```

Postgres major version bumps (e.g. 17 → 18) require dump/restore — `compose up` will refuse to start on an incompatible data dir.

## Notes / known constraints

<!-- prettier-ignore -->
| Constraint | Reason / mitigation |
| --- | --- |
| `env_file: .env.local` injects all vars into every service | Bot sees `COGNITO_*`, web sees `DISCORD_*`. Acceptable for single-user home VM; would not be for multi-tenant prod |
| Port 3000 bound to `0.0.0.0` | Direct VM-IP access bypasses Cloudflare. Tighten by changing to `"127.0.0.1:3000:3000"` in `compose.yaml` once CF Tunnel is the only ingress |
| `apps/web/next-env.d.ts` is gitignored | `pnpm typecheck` runs `next typegen` first to regenerate it for tsc |
| Callback URL must be reconstructed in `apps/web/src/app/api/auth/callback/route.ts` | Behind a reverse proxy, openid-client derives `redirect_uri` from `req.url` (internal origin). The code passes a URL built from `config.cognito.redirectUri` instead |
| `actions/checkout` initial fetch wipes pre-existing workspace files | `.env.local` lives at `~/hannario/.env.local` outside the workspace, copied in by `release.yml` |
| Build-time env not required for web | `config.ts` and `@repo/database`'s `database` export are lazy (Proxy). `next build` runs without any app env set |
