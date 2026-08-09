mod auth;
mod db;
mod handlers;
mod models;

use axum::{
    http::{request::Parts, HeaderValue},
    routing::{get, patch, post, put},
    Router,
};
use sqlx::postgres::PgPool;
use tower_http::cors::{AllowOrigin, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub admin_password_hash: String,
    pub session_secret: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let admin_password_hash =
        std::env::var("ADMIN_PASSWORD_HASH").expect("ADMIN_PASSWORD_HASH must be set");
    let session_secret = std::env::var("SESSION_SECRET").expect("SESSION_SECRET must be set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());

    // Browser origins allowed to call this API directly (CORS). Comma-separated
    // list; each entry may be an exact origin or contain a single `*` wildcard
    // for sub-domains, e.g. "https://*.ralfjka.sk" matches any sub-domain.
    // In the Docker/nginx setup the browser talks to nginx (same origin), so
    // CORS is irrelevant there. CORS_ORIGIN is kept as a single-origin alias.
    let raw_cors = std::env::var("CORS_ORIGINS")
        .or_else(|_| std::env::var("CORS_ORIGIN"))
        .unwrap_or_else(|_| "http://localhost:5173".to_string());
    let cors_origins: Vec<String> = raw_cors
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
        .collect();

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");

    let state = AppState {
        db: pool,
        admin_password_hash,
        session_secret,
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(
            move |origin: &HeaderValue, _parts: &Parts| {
                origin
                    .to_str()
                    .map(|o| cors_origins.iter().any(|allowed| origin_allowed(o, allowed)))
                    .unwrap_or(false)
            },
        ))
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([axum::http::header::CONTENT_TYPE])
        .allow_credentials(true);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/api/login", post(auth::login))
        .route("/api/logout", post(auth::logout))
        .route("/api/entries", get(handlers::list_entries))
        .route("/api/entries/:id", get(handlers::get_entry))
        .route("/api/admin/entries", get(handlers::admin_list_entries))
        .route("/api/admin/entries/:id", get(handlers::admin_get_entry))
        .route("/api/admin/entries", post(handlers::create_entry))
        .route("/api/admin/entries/:id", patch(handlers::update_entry))
        .route(
            "/api/admin/entries/:id/commentary",
            put(handlers::upsert_commentary),
        )
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    tracing::info!("listening on {port}");
    axum::serve(listener, app).await.unwrap();
}

/// Does a request `Origin` match one configured CORS entry?
/// - Exact match for plain entries ("https://sub1.ralfjka.sk").
/// - A single `*` wildcard stands for one-or-more characters, so
///   "https://*.ralfjka.sk" allows any sub-domain (but not the apex —
///   list "https://ralfjka.sk" separately if you want it).
fn origin_allowed(origin: &str, allowed: &str) -> bool {
    let Some(star) = allowed.find('*') else {
        return origin == allowed;
    };

    let prefix = &allowed[..star];
    let suffix = &allowed[star + 1..];

    match origin.strip_prefix(prefix) {
        Some(rest) if rest.len() > suffix.len() => rest.ends_with(suffix),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::origin_allowed;

    #[test]
    fn cors_exact_origins() {
        assert!(origin_allowed("https://sub1.ralfjka.sk", "https://sub1.ralfjka.sk"));
        assert!(!origin_allowed("https://evil.example", "https://sub1.ralfjka.sk"));
        assert!(!origin_allowed("https://sub1.ralfjka.sk", "https://sub2.ralfjka.sk"));
        // scheme must match too
        assert!(!origin_allowed("http://sub1.ralfjka.sk", "https://sub1.ralfjka.sk"));
    }

    #[test]
    fn cors_wildcard_subdomains() {
        let pattern = "https://*.ralfjka.sk";
        assert!(origin_allowed("https://sub1.ralfjka.sk", pattern));
        assert!(origin_allowed("https://a.b.ralfjka.sk", pattern));
        // apex is NOT matched by "https://*.ralfjka.sk"
        assert!(!origin_allowed("https://ralfjka.sk", pattern));
        // different scheme / lookalike domain
        assert!(!origin_allowed("http://sub1.ralfjka.sk", pattern));
        assert!(!origin_allowed("https://sub1.example.io", pattern));
        assert!(!origin_allowed("https://evilralfjka.sk", pattern));
    }

    #[test]
    fn cors_comma_list_default() {
        let origins = "http://localhost:5173, https://sub1.ralfjka.sk ,https://*.ralfjka.sk";
        let list: Vec<&str> = origins.split(',').map(str::trim).filter(|s| !s.is_empty()).collect();
        let ok = |o: &str| list.iter().any(|allowed| origin_allowed(o, allowed));

        assert!(ok("http://localhost:5173"));
        assert!(ok("https://sub1.ralfjka.sk"));
        assert!(ok("https://anything.ralfjka.sk"));
        assert!(!ok("https://ralfjka.sk")); // apex not granted by wildcard
        assert!(!ok("https://danger.com"));
    }
}
