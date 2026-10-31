# ==============================================================================
# Stage 1: Build Frontend (Three.js WebGPU / Vite Client)
# ==============================================================================
FROM node:22-bookworm-slim AS client-builder

WORKDIR /build/client

# Install dependencies using clean install
COPY client/package*.json ./
RUN npm ci

# Copy source and compile production bundle
COPY client/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Backend (Rust Axum / SQLite Server)
# ==============================================================================
FROM rust:1.85-bookworm AS server-builder

WORKDIR /build

# Copy Cargo workspace configuration
COPY Cargo.toml Cargo.lock ./
COPY server/Cargo.toml server/

# Create dummy source to cache dependency compilation
RUN mkdir -p server/src && \
    echo "fn main() {}" > server/src/main.rs && \
    cargo build --release -p virtual-cinema-server && \
    rm -rf server/src

# Copy real source code and migrations
COPY server/src server/src
COPY server/migrations server/migrations

# Touch main.rs to invalidate the dummy build and compile release binary
RUN touch server/src/main.rs && \
    cargo build --release -p virtual-cinema-server && \
    strip /build/target/release/virtual-cinema-server

# ==============================================================================
# Stage 3: Production Runtime Image (< 60MB minimal footprint)
# ==============================================================================
FROM debian:bookworm-slim AS runtime

# Install essential runtime libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
        sqlite3 \
        curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security
RUN groupadd -r threater && useradd -r -g threater threater && \
    mkdir -p /app/data /app/client/dist && \
    chown -R threater:threater /app

# Copy compiled backend binary from Stage 2
COPY --from=server-builder /build/target/release/virtual-cinema-server /usr/local/bin/virtual-cinema-server

# Copy compiled frontend distribution from Stage 1
COPY --from=client-builder --chown=threater:threater /build/client/dist /app/client/dist

# Switch to non-root user
USER threater

# Configure production environment defaults
ENV THREATER_ADDR=0.0.0.0:3000 \
    DATABASE_URL=sqlite:///app/data/threater.db \
    CLIENT_DIST=/app/client/dist \
    THREATER_DEV_AUTH=true \
    THREATER_COOKIE_SECURE=false \
    RUST_LOG=info

# Persistent volume for SQLite database
VOLUME ["/app/data"]

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/usr/local/bin/virtual-cinema-server"]
