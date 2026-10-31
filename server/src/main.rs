mod accounts;
mod media_extractor;
mod protocol;
mod rooms;

use axum::{
    Json, Router,
    extract::{State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
struct AppState {
    rooms: rooms::SharedRooms,
    accounts: accounts::AccountState,
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn websocket(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Response {
    let profile = match accounts::profile_for_socket(&state.accounts, &headers).await {
        Ok(profile) => profile,
        Err(error) => return error.into_response(),
    };
    upgrade
        .max_message_size(16 * 1024)
        .max_frame_size(16 * 1024)
        .on_upgrade(move |socket| rooms::handle_socket(socket, state.rooms, profile))
        .into_response()
}

async fn fallback() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Not found")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let address: SocketAddr = env::var("THREATER_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_owned())
        .parse()
        .expect("THREATER_ADDR must be a valid socket address");
    let database_url = match env::var("DATABASE_URL") {
        Ok(database_url) => database_url,
        Err(env::VarError::NotPresent) => {
            std::fs::create_dir_all("data").expect("failed to create SQLite data directory");
            "sqlite://data/threater.db".to_owned()
        }
        Err(error) => panic!("DATABASE_URL could not be read: {error}"),
    };
    let pool = accounts::connect_database(&database_url)
        .await
        .expect("failed to initialize SQLite account database");
    tracing::info!(%database_url, "SQLite account database ready");
    let account_state = accounts::AccountState {
        pool,
        development_auth: accounts::configured_development_auth(),
        secure_cookies: accounts::cookie_secure_from_env(),
    };
    let app_state = AppState {
        rooms: rooms::new_shared_rooms(),
        accounts: account_state.clone(),
    };

    let mut app = Router::new()
        .route("/health", get(health))
        .route("/ws", get(websocket))
        .with_state(app_state)
        .merge(accounts::router().with_state(account_state))
        .merge(media_extractor::router())
        .fallback(fallback)
        .layer(TraceLayer::new_for_http());

    if let Ok(client_dist) = env::var("CLIENT_DIST") {
        app =
            app.fallback_service(ServeDir::new(client_dist).append_index_html_on_directories(true));
    }

    let listener = TcpListener::bind(address)
        .await
        .expect("failed to bind HTTP listener");
    tracing::info!(%address, "virtual cinema server listening");
    axum::serve(listener, app).await.expect("server failed");
}
