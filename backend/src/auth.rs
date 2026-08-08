use axum::{
    extract::{FromRequestParts, State},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;

const SESSION_TTL_SECS: u64 = 60 * 60 * 24 * 7; // 7 days
const COOKIE_NAME: &str = "session";

type HmacSha256 = Hmac<Sha256>;

/// Builds a signed session token: "<expiry_unix_ts>.<hex hmac>"
/// No session table needed - the signature is the only thing that needs verifying.
fn sign_token(secret: &str, expiry: u64) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("hmac key");
    mac.update(expiry.to_string().as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    format!("{expiry}.{sig}")
}

fn verify_token(secret: &str, token: &str) -> bool {
    let Some((expiry_str, sig)) = token.split_once('.') else {
        return false;
    };
    let Ok(expiry) = expiry_str.parse::<u64>() else {
        return false;
    };
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    if now > expiry {
        return false;
    }
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("hmac key");
    mac.update(expiry_str.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());
    // constant-time-ish comparison is nice to have here but not critical for a single-admin
    // hobby project; swap in `subtle::ConstantTimeEq` later if you want to harden this.
    expected == sig
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

pub async fn login(State(state): State<AppState>, Json(body): Json<LoginRequest>) -> Response {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};

    let Ok(parsed_hash) = PasswordHash::new(&state.admin_password_hash) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "bad admin hash config").into_response();
    };
    if Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return (StatusCode::UNAUTHORIZED, "wrong password").into_response();
    }

    let expiry = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + SESSION_TTL_SECS;
    let token = sign_token(&state.session_secret, expiry);

    let cookie = format!(
        "{COOKIE_NAME}={token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age={SESSION_TTL_SECS}"
    );

    (
        StatusCode::OK,
        [(header::SET_COOKIE, cookie)],
        Json(serde_json::json!({ "message": "logged in" })),
    )
        .into_response()
}

pub async fn logout() -> Response {
    let cookie = format!("{COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
    (
        StatusCode::OK,
        [(header::SET_COOKIE, cookie)],
        Json(serde_json::json!({ "message": "logged out" })),
    )
        .into_response()
}

/// Axum extractor: put this as a handler argument to require a valid admin session.
/// e.g. `async fn admin_handler(_admin: AdminUser, State(state): State<AppState>) -> ...`
pub struct AdminUser;

#[axum::async_trait]
impl FromRequestParts<AppState> for AdminUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let cookie_header = parts
            .headers
            .get(header::COOKIE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        let token = cookie_header
            .split(';')
            .map(|c| c.trim())
            .find_map(|c| c.strip_prefix(&format!("{COOKIE_NAME}=")));

        match token {
            Some(t) if verify_token(&state.session_secret, t) => Ok(AdminUser),
            _ => Err((StatusCode::UNAUTHORIZED, "admin login required").into_response()),
        }
    }
}
