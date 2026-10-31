# ==============================================================================
# Ultra-Fast Cached Production Dockerfile
# Leverages Docker Layer Caching + Precompiled GitHub Actions Binaries
# ==============================================================================
FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
        sqlite3 \
        curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -r threater && useradd -r -g threater threater && \
    mkdir -p /app/data /app/client/dist && \
    chown -R threater:threater /app

# Copy prebuilt artifacts (built in seconds via CI runners or local build)
COPY --chown=threater:threater bin/virtual-cinema-server /usr/local/bin/virtual-cinema-server
COPY --chown=threater:threater client/dist /app/client/dist

RUN chmod +x /usr/local/bin/virtual-cinema-server

USER threater

ENV THREATER_ADDR=0.0.0.0:3030 \
    DATABASE_URL=sqlite:///app/data/threater.db \
    CLIENT_DIST=/app/client/dist \
    THREATER_DEV_AUTH=false \
    THREATER_COOKIE_SECURE=true \
    RUST_LOG=info

VOLUME ["/app/data"]
EXPOSE 3030

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3030/health || exit 1

ENTRYPOINT ["/usr/local/bin/virtual-cinema-server"]
