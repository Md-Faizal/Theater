use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, put},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{Row, SqlitePool};
use std::{
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

const SESSION_COOKIE: &str = "threater_session";
const SESSION_TTL_SECONDS: i64 = 30 * 24 * 60 * 60;

#[derive(Clone)]
pub struct AccountState {
    pub pool: SqlitePool,
    pub development_auth: bool,
    pub secure_cookies: bool,
}

#[derive(Debug, Serialize)]
pub struct AccountProfile {
    pub user_id: String,
    pub username: Option<String>,
    pub display_name: String,
    pub avatar_color: String,
    pub profile_complete: bool,
    pub is_development_session: bool,
}

#[derive(Deserialize)]
pub struct ProfileUpdate {
    username: String,
    display_name: String,
    avatar_color: String,
}

#[derive(Deserialize)]
pub struct UsernameQuery {
    username: String,
}

#[derive(Serialize)]
pub struct UsernameAvailability {
    available: bool,
    valid: bool,
    message: Option<&'static str>,
}

#[derive(Serialize)]
struct ApiErrorBody {
    error: String,
}

pub struct ApiError {
    status: StatusCode,
    message: &'static str,
}

impl ApiError {
    fn new(status: StatusCode, message: &'static str) -> Self {
        Self { status, message }
    }

    fn internal(error: sqlx::Error) -> Self {
        tracing::error!(%error, "account database operation failed");
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Account service is unavailable",
        )
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ApiErrorBody {
                error: self.message.to_owned(),
            }),
        )
            .into_response()
    }
}

#[derive(Clone)]
struct SessionUser {
    user_id: String,
    development_session: bool,
}

pub fn router() -> axum::Router<AccountState> {
    axum::Router::new()
        .route("/api/account/bootstrap", get(bootstrap))
        .route(
            "/api/account/username-availability",
            get(username_availability),
        )
        .route("/api/account/profile", put(update_profile))
}

fn unix_time() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn token_hash(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

fn cookie_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .map(str::trim)
        .find_map(|cookie| {
            let (name, value) = cookie.split_once('=')?;
            (name == SESSION_COOKIE && Uuid::parse_str(value).is_ok()).then(|| value.to_owned())
        })
}

async fn find_session(pool: &SqlitePool, token: &str) -> Result<Option<SessionUser>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT user_id, auth_method FROM sessions WHERE token_hash = ? AND expires_at > ?",
    )
    .bind(token_hash(token))
    .bind(unix_time())
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|row| SessionUser {
        user_id: row.get("user_id"),
        development_session: row.get::<String, _>("auth_method") == "development",
    }))
}

async fn create_development_session(
    pool: &SqlitePool,
) -> Result<(String, SessionUser), sqlx::Error> {
    let user_id = Uuid::new_v4().to_string();
    let token = Uuid::new_v4().to_string();
    let now = unix_time();
    let mut transaction = pool.begin().await?;
    sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(now)
        .execute(&mut *transaction)
        .await?;
    sqlx::query(
        "INSERT INTO users (id, display_name, created_at, updated_at) VALUES (?, 'Guest', ?, ?)",
    )
    .bind(&user_id)
    .bind(now)
    .bind(now)
    .execute(&mut *transaction)
    .await?;
    sqlx::query(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&user_id)
    .bind(token_hash(&token))
    .bind(now + SESSION_TTL_SECONDS)
    .bind(now)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    Ok((
        token,
        SessionUser {
            user_id,
            development_session: true,
        },
    ))
}

async fn load_profile(pool: &SqlitePool, user: SessionUser) -> Result<AccountProfile, sqlx::Error> {
    let row = sqlx::query("SELECT username, display_name, avatar_color FROM users WHERE id = ?")
        .bind(&user.user_id)
        .fetch_one(pool)
        .await?;
    let username: Option<String> = row.get("username");
    let display_name: String = row.get("display_name");
    let avatar_color: String = row.get("avatar_color");
    Ok(AccountProfile {
        user_id: user.user_id,
        profile_complete: username.is_some(),
        username,
        display_name,
        avatar_color,
        is_development_session: user.development_session,
    })
}

async fn bootstrap(
    State(state): State<AccountState>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let token = cookie_token(&headers);
    let existing = match token.as_deref() {
        Some(token) => find_session(&state.pool, token)
            .await
            .map_err(ApiError::internal)?,
        None => None,
    };

    let (profile, new_token) = match existing {
        Some(user) if user.development_session && !state.development_auth => {
            return Err(ApiError::new(
                StatusCode::UNAUTHORIZED,
                "Development sign-in is disabled",
            ));
        }
        Some(user) => (
            load_profile(&state.pool, user)
                .await
                .map_err(ApiError::internal)?,
            None,
        ),
        None if state.development_auth => {
            let (token, user) = create_development_session(&state.pool)
                .await
                .map_err(ApiError::internal)?;
            (
                load_profile(&state.pool, user)
                    .await
                    .map_err(ApiError::internal)?,
                Some(token),
            )
        }
        None => {
            return Err(ApiError::new(
                StatusCode::UNAUTHORIZED,
                "Sign-in is required",
            ));
        }
    };

    let mut response = Json(profile).into_response();
    if let Some(token) = new_token {
        let secure = if state.secure_cookies { "; Secure" } else { "" };
        let cookie = format!(
            "{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_TTL_SECONDS}{secure}"
        );
        response.headers_mut().insert(
            header::SET_COOKIE,
            HeaderValue::from_str(&cookie).map_err(|_| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Could not create session",
                )
            })?,
        );
    }
    Ok(response)
}

fn normalize_username(username: &str) -> Result<(String, String), &'static str> {
    let username = username.trim();
    let valid = (3..=20).contains(&username.len())
        && username
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    if !valid {
        return Err("Use 3–20 letters, numbers, or underscores");
    }
    Ok((username.to_owned(), username.to_ascii_lowercase()))
}

async fn username_availability(
    State(state): State<AccountState>,
    Query(query): Query<UsernameQuery>,
) -> Result<Json<UsernameAvailability>, ApiError> {
    let normalized = match normalize_username(&query.username) {
        Ok((_, normalized)) => normalized,
        Err(message) => {
            return Ok(Json(UsernameAvailability {
                available: false,
                valid: false,
                message: Some(message),
            }));
        }
    };
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE normalized_username = ?)")
            .bind(normalized)
            .fetch_one(&state.pool)
            .await
            .map_err(ApiError::internal)?;
    Ok(Json(UsernameAvailability {
        available: !exists,
        valid: true,
        message: if exists {
            Some("That username is already taken")
        } else {
            None
        },
    }))
}

async fn require_session(
    state: &AccountState,
    headers: &HeaderMap,
) -> Result<SessionUser, ApiError> {
    let token = cookie_token(headers).ok_or_else(|| {
        ApiError::new(
            StatusCode::UNAUTHORIZED,
            "A development session is required",
        )
    })?;
    let session = find_session(&state.pool, &token)
        .await
        .map_err(ApiError::internal)?
        .ok_or_else(|| {
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "Session expired; reload to continue",
            )
        })?;
    if session.development_session && !state.development_auth {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "Development sign-in is disabled",
        ));
    }
    Ok(session)
}

pub async fn profile_for_socket(
    state: &AccountState,
    headers: &HeaderMap,
) -> Result<AccountProfile, ApiError> {
    let session = require_session(state, headers).await?;
    let profile = load_profile(&state.pool, session)
        .await
        .map_err(ApiError::internal)?;
    if !profile.profile_complete {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "Complete your profile before joining a room",
        ));
    }
    Ok(profile)
}

fn reject_cross_site_request(headers: &HeaderMap) -> Result<(), ApiError> {
    if headers
        .get("sec-fetch-site")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("cross-site"))
    {
        return Err(ApiError::new(
            StatusCode::FORBIDDEN,
            "Cross-site profile updates are not allowed",
        ));
    }
    Ok(())
}

async fn update_profile(
    State(state): State<AccountState>,
    headers: HeaderMap,
    Json(payload): Json<ProfileUpdate>,
) -> Result<Json<AccountProfile>, ApiError> {
    reject_cross_site_request(&headers)?;
    let session = require_session(&state, &headers).await?;
    let (username, normalized_username) = normalize_username(&payload.username)
        .map_err(|_| ApiError::new(StatusCode::BAD_REQUEST, "Username format is invalid"))?;
    let display_name = payload.display_name.trim();
    if display_name.is_empty()
        || display_name.chars().count() > 32
        || display_name.chars().any(char::is_control)
    {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Display name must be 1–32 printable characters",
        ));
    }
    let avatar_color = payload.avatar_color.trim();
    if avatar_color.len() != 7
        || !avatar_color.starts_with('#')
        || !avatar_color[1..]
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit())
    {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Avatar color must be a hex color",
        ));
    }
    let now = unix_time();
    let result = sqlx::query(
        "UPDATE users SET username = ?, normalized_username = ?, display_name = ?, avatar_color = ?, updated_at = ? WHERE id = ?",
    )
    .bind(username)
    .bind(normalized_username)
    .bind(display_name)
    .bind(avatar_color.to_ascii_lowercase())
    .bind(now)
    .bind(&session.user_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(result) if result.rows_affected() == 1 => {}
        Ok(_) => {
            return Err(ApiError::new(
                StatusCode::NOT_FOUND,
                "Profile does not exist",
            ));
        }
        Err(sqlx::Error::Database(error)) if error.is_unique_violation() => {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "That username is already taken",
            ));
        }
        Err(error) => return Err(ApiError::internal(error)),
    }
    Ok(Json(
        load_profile(&state.pool, session)
            .await
            .map_err(ApiError::internal)?,
    ))
}

pub fn cookie_secure_from_env() -> bool {
    std::env::var("THREATER_COOKIE_SECURE")
        .map(|value| value.eq_ignore_ascii_case("true"))
        .unwrap_or(!cfg!(debug_assertions))
}

pub fn configured_development_auth() -> bool {
    std::env::var("THREATER_DEV_AUTH")
        .map(|value| value.eq_ignore_ascii_case("true"))
        .unwrap_or(cfg!(debug_assertions))
}

pub async fn connect_database(
    database_url: &str,
) -> Result<SqlitePool, Box<dyn std::error::Error + Send + Sync>> {
    let options = sqlx::sqlite::SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::normalize_username;

    #[test]
    fn usernames_are_ascii_and_normalized_case_insensitively() {
        assert_eq!(
            normalize_username("CinemaFan_7"),
            Ok(("CinemaFan_7".to_owned(), "cinemafan_7".to_owned()))
        );
        assert!(normalize_username("ab").is_err());
        assert!(normalize_username("name-with-dashes").is_err());
        assert!(normalize_username("café").is_err());
    }
}
