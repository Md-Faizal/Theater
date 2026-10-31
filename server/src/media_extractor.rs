use axum::{
    Json, Router,
    body::Body,
    extract::Query,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use futures_util::TryStreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use tokio::process::Command;
use url::Url;

#[derive(Debug, Deserialize)]
pub struct ResolveQuery {
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct ResolvedMedia {
    pub title: String,
    pub stream_url: String,
    pub proxy_url: String,
    pub is_curved_compatible: bool,
    pub format: String,
    pub duration_seconds: Option<f64>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Deserialize)]
pub struct ProxyQuery {
    pub url: String,
}

#[derive(Clone)]
pub struct MediaState {
    pub http_client: Client,
}

pub fn router() -> Router {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let state = MediaState {
        http_client: client,
    };

    Router::new()
        .route("/api/media/resolve", get(resolve_media))
        .route("/api/media/proxy", get(proxy_media))
        .with_state(state)
}

/// Resolves any video URL (YouTube, Vimeo, or direct MP4/HLS) into a raw streamable video URL
async fn resolve_media(
    axum::extract::State(state): axum::extract::State<MediaState>,
    Query(params): Query<ResolveQuery>,
) -> Result<Json<ResolvedMedia>, (StatusCode, Json<ErrorResponse>)> {
    let raw_url = params.url.trim();
    if raw_url.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Empty URL provided".to_string(),
            }),
        ));
    }

    // 1. Check if the URL is already a direct playable video stream
    let lower = raw_url.to_lowercase();
    if lower.ends_with(".mp4")
        || lower.ends_with(".webm")
        || lower.ends_with(".m3u8")
        || lower.ends_with(".ogg")
        || lower.ends_with(".mov")
    {
        let proxy_url = format!("/api/media/proxy?url={}", urlencoding::encode(raw_url));
        return Ok(Json(ResolvedMedia {
            title: "Direct Cinema Stream".to_string(),
            stream_url: raw_url.to_string(),
            proxy_url,
            is_curved_compatible: true,
            format: if lower.ends_with(".m3u8") { "hls".into() } else { "mp4".into() },
            duration_seconds: None,
            thumbnail: None,
        }));
    }

    // 2. If it is YouTube or general video, attempt resolution via yt-dlp first
    if let Ok(resolved) = resolve_via_yt_dlp(raw_url).await {
        return Ok(Json(resolved));
    }

    // 3. Fallback: If YouTube URL, attempt resolution via public Invidious instances
    if is_youtube_url(raw_url) {
        if let Some(video_id) = extract_youtube_id(raw_url) {
            if let Ok(resolved) = resolve_via_invidious(&state.http_client, &video_id).await {
                return Ok(Json(resolved));
            }
        }
    }

    // 4. Fallback: If YouTube extraction was not possible, return an error
    if is_youtube_url(raw_url) {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Direct stream extraction not available for this YouTube video. Use 3D YouTube player.".to_string(),
            }),
        ));
    }

    // 5. For non-YouTube arbitrary video URLs, return stream info
    let proxy_url = format!("/api/media/proxy?url={}", urlencoding::encode(raw_url));
    Ok(Json(ResolvedMedia {
        title: "Web Stream".to_string(),
        stream_url: raw_url.to_string(),
        proxy_url,
        is_curved_compatible: true,
        format: "mp4".to_string(),
        duration_seconds: None,
        thumbnail: None,
    }))
}

/// Tries to resolve raw stream URLs using `yt-dlp` CLI if available
async fn resolve_via_yt_dlp(raw_url: &str) -> Result<ResolvedMedia, String> {
    let mut candidates = Vec::new();
    if let Ok(p) = env::var("YT_DLP_PATH") {
        candidates.push(std::path::PathBuf::from(p));
    }
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("yt-dlp.exe"));
            candidates.push(dir.join("../yt-dlp.exe"));
            candidates.push(dir.join("../../yt-dlp.exe"));
        }
    }
    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd.join("yt-dlp.exe"));
        candidates.push(cwd.join("server/yt-dlp.exe"));
    }
    candidates.push(std::path::PathBuf::from("server/yt-dlp.exe"));
    candidates.push(std::path::PathBuf::from("yt-dlp.exe"));

    let mut binary_path = std::path::PathBuf::from("yt-dlp");
    for cand in candidates {
        if cand.is_file() {
            binary_path = cand;
            break;
        }
    }

    let command_future = Command::new(&binary_path)
        .arg("--dump-json")
        .arg("--extractor-args")
        .arg("youtube:player_client=android,web")
        .arg("-f")
        .arg("18/best[ext=mp4]/best")
        .arg("--no-playlist")
        .arg("--no-warnings")
        .arg(raw_url)
        .output();

    let output = tokio::time::timeout(std::time::Duration::from_secs(25), command_future)
        .await
        .map_err(|_| "yt-dlp command timed out after 25s".to_string())?
        .map_err(|e| format!("Failed to spawn yt-dlp ({:?}): {e}", binary_path))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let val: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Invalid yt-dlp JSON: {e}"))?;

    let direct_url = val["url"]
        .as_str()
        .ok_or_else(|| "No direct stream URL in yt-dlp output".to_string())?;

    let title = val["title"].as_str().unwrap_or("Cinema Video").to_string();
    let duration = val["duration"].as_f64();
    let thumbnail = val["thumbnail"].as_str().map(|s| s.to_string());
    let proxy_url = format!("/api/media/proxy?url={}", urlencoding::encode(direct_url));

    Ok(ResolvedMedia {
        title,
        stream_url: direct_url.to_string(),
        proxy_url,
        is_curved_compatible: true,
        format: "mp4".to_string(),
        duration_seconds: duration,
        thumbnail,
    })
}

/// Fallback resolver using Invidious public streaming instances
async fn resolve_via_invidious(client: &Client, video_id: &str) -> Result<ResolvedMedia, String> {
    let instances = [
        "https://vid.puffyan.us",
        "https://invidious.nerdvpn.de",
        "https://inv.tux.pizza",
        "https://invidious.drgns.space",
    ];

    for base in instances {
        let api_url = format!("{base}/api/v1/videos/{video_id}");
        let resp = match client.get(&api_url).send().await {
            Ok(r) if r.status().is_success() => r,
            _ => continue,
        };

        let json: serde_json::Value = match resp.json().await {
            Ok(j) => j,
            Err(_) => continue,
        };

        let title = json["title"].as_str().unwrap_or("YouTube Cinema Video").to_string();
        let duration = json["lengthSeconds"].as_f64();

        // Search formatStreams for progressive MP4 stream with audio
        if let Some(formats) = json["formatStreams"].as_array() {
            // Find highest resolution progressive MP4 stream
            if let Some(fmt) = formats.iter().rev().find(|f| {
                f["container"].as_str() == Some("mp4") || f["type"].as_str().unwrap_or("").contains("video/mp4")
            }) {
                if let Some(stream_url) = fmt["url"].as_str() {
                    let proxy_url = format!("/api/media/proxy?url={}", urlencoding::encode(stream_url));
                    return Ok(ResolvedMedia {
                        title,
                        stream_url: stream_url.to_string(),
                        proxy_url,
                        is_curved_compatible: true,
                        format: "mp4".to_string(),
                        duration_seconds: duration,
                        thumbnail: Some(format!("https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")),
                    });
                }
            }
        }
    }

    Err("Could not resolve video stream from Invidious instances".to_string())
}

/// Proxies remote media streams to the browser <video> element with full Range header forwarding and CORS headers
async fn proxy_media(
    axum::extract::State(state): axum::extract::State<MediaState>,
    headers: HeaderMap,
    Query(params): Query<ProxyQuery>,
) -> Response {
    let target_url = match Url::parse(&params.url) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid media URL").into_response();
        }
    };

    let mut req = state.http_client.get(target_url.as_str());

    // Forward Range header if browser requested it (crucial for video scrubbing & seeking)
    if let Some(range) = headers.get(header::RANGE) {
        req = req.header(header::RANGE, range);
    }

    let upstream = match req.send().await {
        Ok(res) => res,
        Err(err) => {
            return (
                StatusCode::BAD_GATEWAY,
                format!("Failed to connect to media host: {err}"),
            )
                .into_response();
        }
    };

    let status = upstream.status();
    let upstream_headers = upstream.headers().clone();

    // Convert upstream byte stream into Axum response body
    let body_stream = upstream.bytes_stream().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e));
    let body = Body::from_stream(body_stream);

    let mut res = Response::builder().status(status);

    // Forward video metadata headers
    if let Some(content_type) = upstream_headers.get(header::CONTENT_TYPE) {
        res = res.header(header::CONTENT_TYPE, content_type);
    } else {
        res = res.header(header::CONTENT_TYPE, "video/mp4");
    }

    if let Some(content_len) = upstream_headers.get(header::CONTENT_LENGTH) {
        res = res.header(header::CONTENT_LENGTH, content_len);
    }

    if let Some(content_range) = upstream_headers.get(header::CONTENT_RANGE) {
        res = res.header(header::CONTENT_RANGE, content_range);
    }

    res = res.header(header::ACCEPT_RANGES, "bytes");

    // Permissive CORS headers so WebGL THREE.VideoTexture can read every frame
    res = res.header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*");
    res = res.header(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        "Range, Content-Type, Accept",
    );
    res = res.header(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        "Content-Range, Content-Length, Accept-Ranges",
    );

    res.body(body).unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn is_youtube_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.contains("youtube.com") || lower.contains("youtu.be")
}

fn extract_youtube_id(url: &str) -> Option<String> {
    let parsed = Url::parse(url).ok()?;
    if parsed.host_str()?.contains("youtu.be") {
        let path = parsed.path().trim_start_matches('/');
        if !path.is_empty() {
            return Some(path.split('/').next()?.to_string());
        }
    }
    for (k, v) in parsed.query_pairs() {
        if k == "v" {
            return Some(v.into_owned());
        }
    }
    None
}

/// Simple URL encoder utility
mod urlencoding {
    pub fn encode(data: &str) -> String {
        let mut result = String::with_capacity(data.len() * 3);
        for b in data.bytes() {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                result.push(b as char);
            } else {
                result.push_str(&format!("%{:02X}", b));
            }
        }
        result
    }
}
