# Image Studio Slim — Deployment

A single-binary Go server + Vue 3 SPA. Designed for a 4-core / 4 GB cloud VM
and an OpenAI-compatible upstream (official OpenAI, Azure OpenAI compatible
gateway, LiteLLM, third-party relay, etc.).

## Architecture

```
[browser] --HTTPS--> [reverse proxy / Caddy / Nginx] --HTTP--> [container :8090]
                                                                |
                                                                +-- /api/v1/image-studio/generate-external  (proxies to upstream)
                                                                +-- /api/v1/image-studio/download           (streams remote URLs)
                                                                +-- /                                       (Vue SPA bundled)
```

The container has **no database, no Redis, no auth**. State lives in the
browser (localStorage). Every generate request carries the upstream
`base_url` and `api_key` from the user's preferences.

## What you need on the server

- Docker Engine 24+ and the Compose v2 plugin (`docker compose ...`).
- A domain name (recommended) and a reverse proxy in front for HTTPS.
- Open inbound port 80/443 on the firewall.

## Build & run

```bash
# 1. Clone / upload the repository to the server
cd image-studio-slim

# 2. Build the image and start the container
docker compose up -d --build

# 3. Verify
curl http://127.0.0.1:8090/api/v1/health
# {"code":0,"msg":"ok"}
```

The first build takes a few minutes (frontend + Go). Subsequent rebuilds
reuse the layer cache and finish in under a minute.

Image size is ~25 MB. Container resident memory under load: 60–150 MB.

## External access

### Option A — direct port mapping (simplest, HTTP only)

Edit `docker-compose.yml` if `8090` is busy on the host:

```yaml
ports:
  - "8091:8090"   # host:container
```

Open `http://YOUR_SERVER_IP:8090/` from a browser (or `:8091` if you remapped).

> Do not expose plain HTTP to the public internet long-term. Use Option B.

### Option B — Caddy in front (HTTPS, recommended)

Install Caddy, then put this in `/etc/caddy/Caddyfile`:

```caddyfile
your-domain.com {
    reverse_proxy 127.0.0.1:8090
    encode gzip
}
```

`systemctl reload caddy`. Caddy provisions Let's Encrypt automatically.

### Option C — Nginx in front

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 32m;     # reference image uploads

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;  # external upstreams can take 1–2 min
    }
}
```

## First-time browser setup

1. Open `https://your-domain.com/`
2. The UI lands on the image studio. Click the gear / preferences icon.
3. Provider mode is already set to **External Relay**.
4. Profile: **OpenAI Image API** (works for `gpt-image-1` on api.openai.com
   and most third-party relays). Use **OpenAI Responses** if your upstream
   only exposes `/v1/responses` with the image-generation tool.
5. Base URL: `https://api.openai.com/v1` (or your relay's `/v1` endpoint).
6. API Key: paste your `sk-...` key. Stored only in browser localStorage.
7. Type a prompt → Generate.

## Configuration reference

All settings are environment variables. See [.env.example](./.env.example).

| Var                        | Default                | Purpose                                          |
| -------------------------- | ---------------------- | ------------------------------------------------ |
| `HOST`                     | `0.0.0.0`              | Bind address inside container                    |
| `PORT`                     | `8090`                 | Listen port                                      |
| `UPSTREAM_TIMEOUT`         | `180s`                 | Total time per upstream call                     |
| `DOWNLOAD_TIMEOUT`         | `60s`                  | Total time for `/download` proxy                 |
| `ALLOW_PRIVATE_UPSTREAM`   | `false`                | Allow loopback / RFC1918 hosts (SSRF guard off)  |
| `STATIC_DIR`               | (embedded)             | Serve frontend from this directory instead       |

## Operations

```bash
# Tail logs
docker compose logs -f image-studio

# Restart after editing env vars / docker-compose
docker compose up -d --build

# Stop
docker compose down

# Update only the frontend (no backend code change)
docker compose build --no-cache frontend-builder image-studio
docker compose up -d
```

## Resource budget on a 4-core / 4 GB box

| Component         | RSS    | CPU baseline |
| ----------------- | ------ | ------------ |
| `image-studio`    | 80 MB  | <1 %         |
| Caddy / Nginx     | 30 MB  | <1 %         |
| OS + kernel       | ~600 MB | -            |
| **Free for you** | **~3 GB** | **3.5 cores idle** |

Compose limits are set to `cpus: 2.0 / memory: 512M` — safe ceiling that
still leaves the host responsive even if a runaway request leaks memory.

## Troubleshooting

**"private/loopback hosts are not allowed"** — your `base_url` resolves to
a private IP. Either expose the upstream via a public name, or set
`ALLOW_PRIVATE_UPSTREAM=true` in the compose file.

**"Browser direct mode failed. The upstream provider may not allow CORS"**
— pick **External Relay** mode in the UI, not **Browser Direct**. Only the
relay path proxies through this server.

**Image takes >2 minutes** — increase `UPSTREAM_TIMEOUT` and the reverse
proxy's read timeout. Both must be ≥ the slowest upstream call.

**Out of memory on builds** — the frontend build uses `--max-old-space-size=4096`.
On a 4 GB host you may need to add a 2 GB swap file before running
`docker compose build`. See `man swapon` / your distro's docs.

## What was removed (vs the upstream sub2api project)

The full sub2api gateway includes user/admin/billing/JWT/TOTP/OAuth/
multi-platform-account features and requires PostgreSQL + Redis. None of
that is needed to "type a prompt → see an image." The legacy code is
preserved in `_legacy/` for reference; you can delete the folder once the
slim deployment is working.
