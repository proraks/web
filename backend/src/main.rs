mod auth;
mod db;
mod handlers;
mod models;

use axum::{
    http::HeaderValue,
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
    // Allow running from either the backend directory or the repo root.
    dotenvy::dotenv().ok();
    dotenvy::from_filename("backend/.env").ok();
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
        .unwrap_or_else(|_| "https://remark.ralfjka.sk".to_string());
    let cors_origins: Vec<HeaderValue> = raw_cors
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .filter_map(|origin| origin.parse::<HeaderValue>().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(cors_origins)) // Use list instead of predicate
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ])
        .allow_credentials(true);

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");

    let state = AppState {
        db: pool,
        admin_password_hash,
        session_secret,
    };

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
