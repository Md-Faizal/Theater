# ==============================================================================
# Ultra-Fast Cached Production Dockerfile
# Leverages Docker Layer Caching + Precompiled GitHub Actions Binaries
# ==============================================================================
FROM ubuntu:24.04 AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
        sqlite3 \
        curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/data /app/client/dist && \
    chmod 777 /app/data

# Copy prebuilt artifacts (built in seconds via CI runners or local build)
COPY bin/virtual-cinema-server /usr/local/bin/virtual-cinema-server
COPY client/dist /app/client/dist

RUN chmod +x /usr/local/bin/virtual-cinema-server

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
