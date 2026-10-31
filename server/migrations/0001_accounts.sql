CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT,
    normalized_username TEXT,
    display_name TEXT NOT NULL DEFAULT 'Guest',
    avatar_color TEXT NOT NULL DEFAULT '#67d5ff',
    profile_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (username IS NULL OR length(username) BETWEEN 3 AND 20),
    CHECK (normalized_username IS NULL OR length(normalized_username) BETWEEN 3 AND 20),
    CHECK (
        (username IS NULL AND normalized_username IS NULL)
        OR (username IS NOT NULL AND normalized_username = lower(username))
    )
);

CREATE UNIQUE INDEX users_normalized_username_unique
    ON users(normalized_username)
    WHERE normalized_username IS NOT NULL;

CREATE TABLE auth_identities (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_subject)
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    auth_method TEXT NOT NULL DEFAULT 'development'
        CHECK (auth_method IN ('development', 'oauth')),
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX sessions_expiry ON sessions(expires_at);
