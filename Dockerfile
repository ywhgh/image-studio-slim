# =============================================================================
# Image Studio Slim — single-binary container for 4-core / 4 GB servers
# =============================================================================
# Stage 1: Build frontend (Vue 3 + Vite)
# Stage 2: Build Go backend with embedded frontend dist
# Stage 3: Final minimal runtime (alpine, ~25 MB)
# =============================================================================
#
# Build args let you swap to local mirrors when Docker Hub / npm / goproxy.io
# are slow. Defaults below are tuned for servers in mainland China.
#
#   docker compose build \
#       --build-arg NPM_REGISTRY=https://registry.npmjs.org \
#       --build-arg GOPROXY=direct
#
# To pull base images from a registry mirror, set the daemon mirror in
# /etc/docker/daemon.json on the host:
#   { "registry-mirrors": ["https://docker.m.daocloud.io"] }
# (then `systemctl restart docker`). No Dockerfile change needed.
# =============================================================================

ARG NODE_IMAGE=node:20-alpine
ARG GOLANG_IMAGE=golang:1.22-alpine
ARG ALPINE_IMAGE=alpine:3.20
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG GOPROXY=https://goproxy.cn,direct
ARG ALPINE_MIRROR=mirrors.tuna.tsinghua.edu.cn

# -----------------------------------------------------------------------------
# Stage 1: Frontend Builder
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS frontend-builder
ARG NPM_REGISTRY
ARG ALPINE_MIRROR

# Speed up apk if needed (corepack uses Node, not apk, but kept for parity).
RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s|dl-cdn.alpinelinux.org|${ALPINE_MIRROR}|g" /etc/apk/repositories; \
    fi

WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@9 --activate

ENV npm_config_registry=${NPM_REGISTRY}

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm config set registry ${NPM_REGISTRY} && \
    pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# -----------------------------------------------------------------------------
# Stage 2: Backend Builder
# -----------------------------------------------------------------------------
FROM ${GOLANG_IMAGE} AS backend-builder
ARG GOPROXY
ARG ALPINE_MIRROR

RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s|dl-cdn.alpinelinux.org|${ALPINE_MIRROR}|g" /etc/apk/repositories; \
    fi

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOFLAGS=-trimpath \
    GOPROXY=${GOPROXY} \
    GOSUMDB=sum.golang.google.cn

WORKDIR /app/server

COPY server/go.mod ./
RUN go mod download

COPY server/ ./

# Replace embedded web placeholder with the real frontend bundle.
RUN rm -rf ./web && mkdir ./web
COPY --from=frontend-builder /app/frontend/dist/ ./web/

RUN go build -ldflags="-s -w" -o /out/image-studio-slim ./

# -----------------------------------------------------------------------------
# Stage 3: Final Runtime Image
# -----------------------------------------------------------------------------
FROM ${ALPINE_IMAGE}
ARG ALPINE_MIRROR

LABEL org.opencontainers.image.title="image-studio-slim" \
      org.opencontainers.image.description="Slim image-generation web app, OpenAI-compatible upstream"

RUN if [ -n "${ALPINE_MIRROR}" ]; then \
      sed -i "s|dl-cdn.alpinelinux.org|${ALPINE_MIRROR}|g" /etc/apk/repositories; \
    fi && \
    apk add --no-cache ca-certificates tzdata wget && \
    addgroup -g 1000 app && \
    adduser -u 1000 -G app -D -s /sbin/nologin app

WORKDIR /app

COPY --from=backend-builder --chown=app:app /out/image-studio-slim /app/image-studio-slim

USER app

ENV HOST=0.0.0.0 \
    PORT=8090

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -T 5 -O /dev/null "http://127.0.0.1:${PORT}/api/v1/health" || exit 1

ENTRYPOINT ["/app/image-studio-slim"]
