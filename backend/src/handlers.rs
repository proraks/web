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
    pub kind: Option<Kind>,
    pub q: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(serde::Serialize)]
pub struct ListResponse {
    pub items: Vec<EntryListItem>,
    pub has_more: bool,
}

/// GET /api/entries          — all completed entries
/// GET /api/entries?kind=Book
/// GET /api/entries?kind=ShortText
/// GET /api/entries?kind=Article
/// GET /api/entries?kind=Media
/// Public: only ever returns entries with status = 'completed'.
pub async fn list_entries(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Response {
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = params.offset.unwrap_or(0).max(0);
    let search = params.q.as_ref().map(|q| format!("%{}%", q.trim()));

    let rows = if let Some(q) = &search {
        let query = if params.kind.is_some() {
            r#"
            WITH page AS (
                SELECT e.id
                FROM entries e
                WHERE e.status = 'completed'
                  AND e.kind = $1::entry_kind
                  AND (
                    e.title ILIKE $2
                    OR COALESCE(e.author, '') ILIKE $2
                    OR EXISTS (
                        SELECT 1
                        FROM articles a
                        WHERE a.entry_id = e.id
                          AND COALESCE(a.journal, '') ILIKE $2
                    )
                    OR e.kind::text ILIKE $2
                    OR COALESCE(e.language, '') ILIKE $2
                  )
                ORDER BY e.completed_at DESC, e.created_at DESC
                LIMIT $3 OFFSET $4
            )
            SELECT e.id, e.kind, e.title, e.author, e.language, e.completed_at,
                   EXISTS (
                       SELECT 1
                       FROM commentaries c
                       WHERE c.entry_id = e.id AND c.is_published = TRUE
                   ) AS has_commentary,
                   a.journal, a.url AS article_url,
                   m.url AS media_url,
                   b.rating
            FROM page p
            JOIN entries e ON e.id = p.id
            LEFT JOIN articles a ON a.entry_id = e.id
            LEFT JOIN media_items m ON m.entry_id = e.id
            LEFT JOIN books b ON b.entry_id = e.id
            ORDER BY e.completed_at DESC, e.created_at DESC
            "#
        } else {
            r#"
            WITH page AS (
                SELECT e.id
                FROM entries e
                WHERE e.status = 'completed'
                  AND (
                    e.title ILIKE $1
                    OR COALESCE(e.author, '') ILIKE $1
                    OR EXISTS (
                        SELECT 1
                        FROM articles a
                        WHERE a.entry_id = e.id
                          AND COALESCE(a.journal, '') ILIKE $1
                    )
                    OR e.kind::text ILIKE $1
                    OR COALESCE(e.language, '') ILIKE $1
                  )
                ORDER BY e.completed_at DESC, e.created_at DESC
                LIMIT $2 OFFSET $3
            )
            SELECT e.id, e.kind, e.title, e.author, e.language, e.completed_at,
                   EXISTS (
                       SELECT 1
                       FROM commentaries c
                       WHERE c.entry_id = e.id AND c.is_published = TRUE
                   ) AS has_commentary,
                   a.journal, a.url AS article_url,
                   m.url AS media_url,
                   b.rating
            FROM page p
            JOIN entries e ON e.id = p.id
            LEFT JOIN articles a ON a.entry_id = e.id
            LEFT JOIN media_items m ON m.entry_id = e.id
            LEFT JOIN books b ON b.entry_id = e.id
            ORDER BY e.completed_at DESC, e.created_at DESC
            "#
        };

        if params.kind.is_some() {
            sqlx::query_as::<_, EntryListItem>(query)
                .bind(params.kind.as_ref().unwrap())
                .bind(q)
                .bind(limit + 1)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        } else {
            sqlx::query_as::<_, EntryListItem>(query)
                .bind(q)
                .bind(limit + 1)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        }
    } else if let Some(k) = &params.kind {
        sqlx::query_as::<_, EntryListItem>(
            r#"
            WITH page AS (
                SELECT e.id
                FROM entries e
                WHERE e.status = 'completed' AND e.kind = $1::entry_kind
                ORDER BY e.completed_at DESC, e.created_at DESC
                LIMIT $2 OFFSET $3
            )
            SELECT e.id, e.kind, e.title, e.author, e.language, e.completed_at,
                   EXISTS (
                       SELECT 1
                       FROM commentaries c
                       WHERE c.entry_id = e.id AND c.is_published = TRUE
                   ) AS has_commentary,
                   a.journal, a.url AS article_url,
                   m.url AS media_url,
                   b.rating
            FROM page p
            JOIN entries e ON e.id = p.id
            LEFT JOIN articles a ON a.entry_id = e.id
            LEFT JOIN media_items m ON m.entry_id = e.id
            LEFT JOIN books b ON b.entry_id = e.id
            ORDER BY e.completed_at DESC, e.created_at DESC
            "#,
        )
        .bind(k)
        .bind(limit + 1)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, EntryListItem>(
            r#"
            WITH page AS (
                SELECT e.id
                FROM entries e
                WHERE e.status = 'completed'
                ORDER BY e.completed_at DESC, e.created_at DESC
                LIMIT $1 OFFSET $2
            )
            SELECT e.id, e.kind, e.title, e.author, e.language, e.completed_at,
                   EXISTS (
                       SELECT 1
                       FROM commentaries c
                       WHERE c.entry_id = e.id AND c.is_published = TRUE
                   ) AS has_commentary,
                   a.journal, a.url AS article_url,
                   m.url AS media_url,
                   b.rating
            FROM page p
            JOIN entries e ON e.id = p.id
            LEFT JOIN articles a ON a.entry_id = e.id
            LEFT JOIN media_items m ON m.entry_id = e.id
            LEFT JOIN books b ON b.entry_id = e.id
            ORDER BY e.completed_at DESC, e.created_at DESC
            "#,
        )
        .bind(limit + 1)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    match rows {
        Ok(mut rows) => {
            let has_more = rows.len() as i64 > limit;
            if has_more {
                rows.pop();
            }
            Json(ListResponse {
                items: rows,
                has_more,
            })
            .into_response()
        }
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

fn row_to_detail(row: EntryWithDetailsRow, commentary: Option<Commentary>) -> EntryDetail {
    EntryDetail {
        id: row.id,
        kind: row.kind,
        title: row.title,
        author: row.author,
        language: row.language,
        status: row.status,
        completed_at: row.completed_at,
        created_at: row.created_at,
        edited_at: row.edited_at,
        isbn: row.isbn,
        pages: row.pages,
        publisher: row.publisher,
        rating: row.rating,
        doi: row.doi,
        short_text_url: row.short_text_url,
        journal: row.journal,
        issue: row.issue,
        article_url: row.article_url,
        media_subtype: row.media_subtype,
        media_url: row.media_url,
        commentary,
    }
}

async fn fetch_entry_with_details(
    state: &AppState,
    id: i32,
    public_only: bool,
) -> Result<Option<EntryWithDetailsRow>, sqlx::Error> {
    let where_clause = if public_only {
        "WHERE e.id = $1 AND e.status = 'completed'"
    } else {
        "WHERE e.id = $1"
    };

    let book_query = format!(
        r#"
        SELECT e.id, e.kind, e.title, e.author, e.language, e.status, e.completed_at, e.created_at, e.edited_at,
               b.isbn, b.pages, b.publisher, b.rating,
               NULL::text AS doi, NULL::text AS short_text_url,
               NULL::text AS journal, NULL::text AS issue, NULL::text AS article_url,
               NULL::media_subtype AS media_subtype, NULL::text AS media_url
        FROM entries e
        LEFT JOIN books b ON b.entry_id = e.id
        {}
        AND e.kind = 'book'
        "#,
        where_clause
    );

    let short_text_query = format!(
        r#"
        SELECT e.id, e.kind, e.title, e.author, e.language, e.status, e.completed_at, e.created_at, e.edited_at,
               NULL::int AS isbn, NULL::int AS pages, NULL::text AS publisher, NULL::int AS rating,
               st.doi, st.url AS short_text_url,
               NULL::text AS journal, NULL::text AS issue, NULL::text AS article_url,
               NULL::media_subtype AS media_subtype, NULL::text AS media_url
        FROM entries e
        LEFT JOIN short_texts st ON st.entry_id = e.id
        {}
        AND e.kind = 'short_text'
        "#,
        where_clause
    );

    let article_query = format!(
        r#"
        SELECT e.id, e.kind, e.title, e.author, e.language, e.status, e.completed_at, e.created_at, e.edited_at,
               NULL::text AS isbn, NULL::int AS pages, NULL::text AS publisher, NULL::int AS rating,
               NULL::text AS doi, NULL::text AS short_text_url,
               a.journal, a.issue, a.url AS article_url,
               NULL::media_subtype AS media_subtype, NULL::text AS media_url
        FROM entries e
        LEFT JOIN articles a ON a.entry_id = e.id
        {}
        AND e.kind = 'article'
        "#,
        where_clause
    );

    let media_query = format!(
        r#"
        SELECT e.id, e.kind, e.title, e.author, e.language, e.status, e.completed_at, e.created_at, e.edited_at,
               NULL::text AS isbn, NULL::int AS pages, NULL::text AS publisher, NULL::int AS rating,
               NULL::text AS doi, NULL::text AS short_text_url,
               NULL::text AS journal, NULL::text AS issue, NULL::text AS article_url,
               m.media_subtype AS media_subtype, m.url AS media_url
        FROM entries e
        LEFT JOIN media_items m ON m.entry_id = e.id
        {}
        AND e.kind = 'media'
        "#,
        where_clause
    );

    let row = match sqlx::query_as::<_, EntryWithDetailsRow>(&book_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await?
    {
        Some(row) => Some(row),
        None => match sqlx::query_as::<_, EntryWithDetailsRow>(&short_text_query)
            .bind(id)
            .fetch_optional(&state.db)
            .await?
        {
            Some(row) => Some(row),
            None => match sqlx::query_as::<_, EntryWithDetailsRow>(&article_query)
                .bind(id)
                .fetch_optional(&state.db)
                .await?
            {
                Some(row) => Some(row),
                None => {
                    sqlx::query_as::<_, EntryWithDetailsRow>(&media_query)
                        .bind(id)
                        .fetch_optional(&state.db)
                        .await?
                }
            },
        },
    };

    Ok(row)
}

/// GET /api/entries/:id
/// Public: 404s if the entry isn't published/completed, so unread admin drafts stay hidden.
pub async fn get_entry(State(state): State<AppState>, Path(id): Path<i32>) -> Response {
    let row = match fetch_entry_with_details(&state, id, true).await {
        Ok(Some(r)) => r,
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

    Json(row_to_detail(row, commentary)).into_response()
}

// ---- Admin ----

/// GET /api/admin/entries?status=Tbr&sort=title&order=asc
/// Admin's own reading list / everything, unfiltered by public status rules.
/// Supports sorting by: title, kind, author, language, status, completed_at, created_at
pub async fn admin_list_entries(
    _admin: AdminUser,
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let status = params.get("status").and_then(|s| match s.as_str() {
        "Tbr" => Some("tbr"),
        "InProgress" => Some("in_progress"),
        "Completed" => Some("completed"),
        _ => None,
    });
    let kind = params.get("kind").and_then(|k| match k.as_str() {
        "Book" => Some("book"),
        "ShortText" => Some("short_text"),
        "Article" => Some("article"),
        "Media" => Some("media"),
        _ => None,
    });
    let sort = params
        .get("sort")
        .map(|s| s.as_str())
        .unwrap_or("completed_at");
    let order = params.get("order").map(|o| o.as_str()).unwrap_or("desc");
    let limit = params
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(20)
        .clamp(1, 100);
    let offset = params
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0)
        .max(0);

    // Whitelist allowed sort columns to prevent SQL injection.
    let order_by = match sort {
        "title" | "kind" | "author" | "language" | "status" | "completed_at" | "created_at" => sort,
        _ => "completed_at",
    };

    let direction = if order == "asc" { "ASC" } else { "DESC" };

    let query = format!(
        r#"
        WITH page AS (
            SELECT e.id
            FROM entries e
            WHERE ($1::entry_status IS NULL OR e.status = $1::entry_status)
              AND ($2::entry_kind IS NULL OR e.kind = $2::entry_kind)
            ORDER BY {} {}
            LIMIT $3 OFFSET $4
        )
        SELECT e.id, e.kind, e.title, e.author, e.language, e.status, e.completed_at,
               EXISTS (
                   SELECT 1
                   FROM commentaries c
                   WHERE c.entry_id = e.id AND c.is_published = TRUE
               ) AS has_commentary,
               b.rating
        FROM page p
        JOIN entries e ON e.id = p.id
        LEFT JOIN books b ON b.entry_id = e.id
        ORDER BY {} {}
        "#,
        order_by, direction, order_by, direction
    );

    let rows = sqlx::query_as::<_, AdminEntryListItem>(&query)
        .bind(status)
        .bind(kind)
        .bind(limit + 1)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match rows {
        Ok(mut rows) => {
            let has_more = rows.len() as i64 > limit;
            if has_more {
                rows.pop();
            }
            Json(serde_json::json!({ "items": rows, "has_more": has_more })).into_response()
        }
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

/// GET /api/admin/entries/:id
/// Admin variant of the public detail endpoint: returns *any* entry regardless
/// of its public status (so drafts / to-read items can be edited), plus the
/// commentary even when it isn't published yet.
pub async fn admin_get_entry(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Response {
    let row = match fetch_entry_with_details(&state, id, false).await {
        Ok(Some(r)) => r,
        Ok(None) => return err(StatusCode::NOT_FOUND, "not found"),
        Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    };

    // Note: unlike the public endpoint, no is_published filter here - the admin
    // form needs to pre-fill draft commentary too.
    let commentary =
        sqlx::query_as::<_, Commentary>("SELECT * FROM commentaries WHERE entry_id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    Json(row_to_detail(row, commentary)).into_response()
}

/// POST /api/admin/entries
pub async fn create_entry(
    _admin: AdminUser,
    State(state): State<AppState>,
    Json(body): Json<NewEntry>,
) -> Response {
    let status = body.status.unwrap_or(Status::Tbr);

    if let Err(msg) = validate_book_rating(&status, &body.kind, body.rating) {
        return err(StatusCode::BAD_REQUEST, msg);
    }

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    };

    let entry_id: i32 = match sqlx::query_scalar::<_, i32>(
        r#"
        INSERT INTO entries (kind, title, author, language, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
    )
    .bind(&body.kind)
    .bind(&body.title)
    .bind(&body.author)
    .bind(&body.language)
    .bind(&status)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(id) => id,
        Err(e) => {
            let _ = tx.rollback().await;
            return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
        }
    };

    let child_insert = match body.kind {
        Kind::Book => {
            sqlx::query(
                "INSERT INTO books (entry_id, isbn, pages, publisher, rating) VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(entry_id)
            .bind(&body.isbn)
            .bind(body.pages)
            .bind(&body.publisher)
            .bind(body.rating)
            .execute(&mut *tx)
            .await
        }
        Kind::ShortText => {
            sqlx::query(
                "INSERT INTO short_texts (entry_id, doi, url) VALUES ($1, $2, $3)",
            )
            .bind(entry_id)
            .bind(&body.doi)
            .bind(&body.short_text_url)
            .execute(&mut *tx)
            .await
        }
        Kind::Article => {
            sqlx::query(
                "INSERT INTO articles (entry_id, journal, issue, url) VALUES ($1, $2, $3, $4)",
            )
            .bind(entry_id)
            .bind(&body.journal)
            .bind(&body.issue)
            .bind(&body.article_url)
            .execute(&mut *tx)
            .await
        }
        Kind::Media => {
            sqlx::query(
                "INSERT INTO media_items (entry_id, media_subtype, url) VALUES ($1, $2, $3)",
            )
            .bind(entry_id)
            .bind(&body.media_subtype)
            .bind(&body.media_url)
            .execute(&mut *tx)
            .await
        }
    };

    if let Err(e) = child_insert {
        let _ = tx.rollback().await;
        return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    }

    if let Err(e) = tx.commit().await {
        return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    }

    Json(serde_json::json!({ "id": entry_id })).into_response()
}

/// PATCH /api/admin/entries/:id
/// Fetches the entry, applies overrides, updates entries + child table in a tx.
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

    let existing_rating = if existing.kind == Kind::Book {
        match sqlx::query_scalar::<_, Option<i32>>("SELECT rating FROM books WHERE entry_id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
        {
            Ok(Some(rating)) => rating,
            Ok(None) => None,
            Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        }
    } else {
        None
    };

    let title = body.title.unwrap_or(existing.title);
    let author = body.author.or(existing.author);
    let language = body.language.or(existing.language);
    let status = body.status.unwrap_or(existing.status);
    let completed_at = if status == Status::Completed {
        body.completed_at.or(existing.completed_at)
    } else {
        None
    };
    let rating = body.rating.or(existing_rating);

    if let Err(msg) = validate_book_rating(&status, &existing.kind, rating) {
        return err(StatusCode::BAD_REQUEST, msg);
    }

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    };

    let update_result = sqlx::query(
        r#"
        UPDATE entries
        SET title = $1, author = $2, language = $3, status = $4, completed_at = $5, edited_at = NOW()
        WHERE id = $6
        "#,
    )
    .bind(&title)
    .bind(&author)
    .bind(&language)
    .bind(&status)
    .bind(&completed_at)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = update_result {
        let _ = tx.rollback().await;
        return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    }

    let child_result = match existing.kind {
        Kind::Book => {
            sqlx::query(
                "INSERT INTO books (entry_id, isbn, pages, publisher, rating) VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (entry_id) DO UPDATE SET isbn=EXCLUDED.isbn, pages=EXCLUDED.pages, publisher=EXCLUDED.publisher, rating=EXCLUDED.rating",
            )
            .bind(id)
            .bind(&body.isbn)
            .bind(body.pages)
            .bind(&body.publisher)
            .bind(rating)
            .execute(&mut *tx)
            .await
        }
        Kind::ShortText => {
            sqlx::query(
                "INSERT INTO short_texts (entry_id, doi, url) VALUES ($1, $2, $3)
                 ON CONFLICT (entry_id) DO UPDATE SET doi=EXCLUDED.doi, url=EXCLUDED.url",
            )
            .bind(id)
            .bind(&body.doi)
            .bind(&body.short_text_url)
            .execute(&mut *tx)
            .await
        }
        Kind::Article => {
            sqlx::query(
                "INSERT INTO articles (entry_id, journal, issue, url) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (entry_id) DO UPDATE SET journal=EXCLUDED.journal, issue=EXCLUDED.issue, url=EXCLUDED.url",
            )
            .bind(id)
            .bind(&body.journal)
            .bind(&body.issue)
            .bind(&body.article_url)
            .execute(&mut *tx)
            .await
        }
        Kind::Media => {
            sqlx::query(
                "INSERT INTO media_items (entry_id, media_subtype, url) VALUES ($1, $2, $3)
                 ON CONFLICT (entry_id) DO UPDATE SET media_subtype=EXCLUDED.media_subtype, url=EXCLUDED.url",
            )
            .bind(id)
            .bind(&body.media_subtype)
            .bind(&body.media_url)
            .execute(&mut *tx)
            .await
        }
    };

    if let Err(e) = child_result {
        let _ = tx.rollback().await;
        return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    }

    if let Err(e) = tx.commit().await {
        return err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string());
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({ "message": "updated" })),
    )
        .into_response()
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
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "saved" })),
        )
            .into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}
