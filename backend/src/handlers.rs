use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;

use crate::auth::AdminUser;
use crate::models::*;
use crate::AppState;

fn err(status: StatusCode, msg: impl Into<String>) -> Response {
    (status, Json(serde_json::json!({ "error": msg.into() }))).into_response()
}

#[derive(Deserialize)]
pub struct ListParams {
    pub kind: Option<String>,
}

/// GET /api/entries?kind=book|short_text
/// Public: only ever returns entries with status = 'read'.
pub async fn list_entries(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Response {
    let rows = match &params.kind {
        Some(k) => {
            sqlx::query_as::<_, EntryListItem>(
                r#"
                SELECT e.id, e.kind, e.title, e.author, e.language, e.year_published, e.read_at,
                       (c.id IS NOT NULL AND c.is_published = TRUE) AS has_commentary
                FROM entries e
                LEFT JOIN commentaries c ON c.entry_id = e.id
                WHERE e.status = 'read' AND e.kind = $1::kind
                ORDER BY e.read_at DESC, e.created_at DESC
                "#,
            )
            .bind(k)
            .fetch_all(&state.db)
            .await
        }
        None => {
            sqlx::query_as::<_, EntryListItem>(
                r#"
                SELECT e.id, e.kind, e.title, e.author, e.language, e.year_published, e.read_at,
                       (c.id IS NOT NULL AND c.is_published = TRUE) AS has_commentary
                FROM entries e
                LEFT JOIN commentaries c ON c.entry_id = e.id
                WHERE e.status = 'read'
                ORDER BY e.read_at DESC, e.created_at DESC
                "#,
            )
            .fetch_all(&state.db)
            .await
        }
    };

    match rows {
        Ok(rows) => Json(rows).into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

/// GET /api/entries/:id
/// Public: 404s if the entry isn't published/read, so unread admin drafts stay hidden.
pub async fn get_entry(State(state): State<AppState>, Path(id): Path<i32>) -> Response {
    let entry = sqlx::query_as::<_, Entry>(
        "SELECT * FROM entries WHERE id = $1 AND status = 'read'",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let entry = match entry {
        Ok(Some(e)) => e,
        Ok(None) => return err(StatusCode::NOT_FOUND, "not found"),
        Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    };

    let commentary = sqlx::query_as::<_, Commentary>(
        "SELECT * FROM commentaries WHERE entry_id = $1 AND is_published = TRUE",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    Json(EntryDetail { entry, commentary }).into_response()
}

// ---- Admin ----

/// GET /api/admin/entries?status=to_read
/// Admin's own reading list / everything, unfiltered by public status rules.
pub async fn admin_list_entries(
    _admin: AdminUser,
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let status = params.get("status");
    let rows = match status {
        Some(s) => {
            sqlx::query_as::<_, Entry>(
                "SELECT * FROM entries WHERE status = $1::status ORDER BY created_at DESC",
            )
            .bind(s)
            .fetch_all(&state.db)
            .await
        }
        None => {
            sqlx::query_as::<_, Entry>("SELECT * FROM entries ORDER BY created_at DESC")
                .fetch_all(&state.db)
                .await
        }
    };

    match rows {
        Ok(rows) => Json(rows).into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

/// POST /api/admin/entries
pub async fn create_entry(
    _admin: AdminUser,
    State(state): State<AppState>,
    Json(body): Json<NewEntry>,
) -> Response {
    let status = body.status.unwrap_or(Status::ToRead);
    let result = sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO entries (kind, title, author, language, year_written, year_published, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        "#,
    )
    .bind(&body.kind)
    .bind(&body.title)
    .bind(&body.author)
    .bind(&body.language)
    .bind(body.year_written)
    .bind(body.year_published)
    .bind(&body.image_url)
    .bind(&status)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(id) => Json(serde_json::json!({ "id": id })).into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

/// PATCH /api/admin/entries/:id
/// Simple approach: fetch, apply Some(..) overrides in Rust, write back.
/// Fine at this scale - no need for a dynamic query builder for a single-admin blog.
pub async fn update_entry(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(body): Json<UpdateEntry>,
) -> Response {
    let existing = sqlx::query_as::<_, Entry>("SELECT * FROM entries WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return err(StatusCode::NOT_FOUND, "not found"),
        Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    };

    let title = body.title.unwrap_or(existing.title);
    let author = body.author.or(existing.author);
    let language = body.language.or(existing.language);
    let year_written = body.year_written.or(existing.year_written);
    let year_published = body.year_published.or(existing.year_published);
    let image_url = body.image_url.or(existing.image_url);
    let status = body.status.unwrap_or(existing.status);
    let read_at = body.read_at.or(existing.read_at);

    let result = sqlx::query(
        r#"
        UPDATE entries
        SET title = $1, author = $2, language = $3, year_written = $4, year_published = $5,
            image_url = $6, status = $7, read_at = $8, edited_at = NOW()
        WHERE id = $9
        "#,
    )
    .bind(title)
    .bind(author)
    .bind(language)
    .bind(year_written)
    .bind(year_published)
    .bind(image_url)
    .bind(status)
    .bind(read_at)
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => (StatusCode::OK, "updated").into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

/// PUT /api/admin/entries/:id/commentary
/// Upsert - a commentary is optional and 1:1 with an entry.
pub async fn upsert_commentary(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(body): Json<UpsertCommentary>,
) -> Response {
    let result = sqlx::query(
        r#"
        INSERT INTO commentaries (entry_id, title, body, is_published)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (entry_id) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            is_published = EXCLUDED.is_published,
            edited_at = NOW()
        "#,
    )
    .bind(id)
    .bind(&body.title)
    .bind(&body.body)
    .bind(body.is_published)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => (StatusCode::OK, "saved").into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}
