use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone, PartialEq)]
#[sqlx(type_name = "entry_kind", rename_all = "snake_case")]
pub enum Kind {
    Book,
    ShortText,
    Article,
    Media,
}

#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone, PartialEq)]
#[sqlx(type_name = "entry_status", rename_all = "snake_case")]
pub enum Status {
    Tbr,
    InProgress,
    Completed,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Entry {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub status: Status,
    pub completed_at: Option<NaiveDate>,
    pub created_at: NaiveDateTime,
    pub edited_at: NaiveDateTime,
}

/// Slim shape for list views - no need to ship every field to a tight list row.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntryListItem {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub completed_at: Option<NaiveDate>,
    pub has_commentary: bool,
    pub journal: Option<String>,
    pub article_url: Option<String>,
    pub media_url: Option<String>,
    pub rating: Option<i32>,
}

/// Slim shape for the admin dashboard list.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AdminEntryListItem {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub status: Status,
    pub completed_at: Option<NaiveDate>,
    pub has_commentary: bool,
    pub rating: Option<i32>,
}

/// Child-table model: books
#[allow(dead_code)]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Book {
    pub entry_id: i32,
    pub isbn: Option<String>,
    pub pages: Option<i32>,
    pub publisher: Option<String>,
    pub rating: Option<i32>,
}

pub fn validate_book_rating(
    status: &Status,
    kind: &Kind,
    rating: Option<i32>,
) -> Result<(), String> {
    if kind != &Kind::Book {
        return Ok(());
    }

    match status {
        Status::Completed => match rating {
            Some(value) if (1..=5).contains(&value) => Ok(()),
            Some(_) => Err("Book rating must be between 1 and 5".to_string()),
            None => Err("Book rating is required when a book is completed".to_string()),
        },
        _ => {
            if rating.is_some() {
                Err("Book rating is only allowed when a book is completed".to_string())
            } else {
                Ok(())
            }
        }
    }
}

/// Child-table model: short_texts
#[allow(dead_code)]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ShortText {
    pub entry_id: i32,
    pub doi: Option<String>,
    pub url: Option<String>,
}

/// Child-table model: articles
#[allow(dead_code)]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Article {
    pub entry_id: i32,
    pub journal: Option<String>,
    pub issue: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone, PartialEq)]
#[sqlx(type_name = "media_subtype", rename_all = "snake_case")]
pub enum MediaSubtype {
    Video,
    Audio,
}

/// Child-table model: media
#[allow(dead_code)]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MediaItem {
    pub entry_id: i32,
    pub media_subtype: MediaSubtype,
    pub url: String,
    pub created_at: NaiveDateTime,
}

/// Flat shape returned by get_entry / admin_get_entry queries that LEFT JOIN
/// every child table. The handler maps this into an EntryDetail.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntryWithDetailsRow {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub status: Status,
    pub completed_at: Option<NaiveDate>,
    pub created_at: NaiveDateTime,
    pub edited_at: NaiveDateTime,
    // Book
    pub isbn: Option<String>,
    pub pages: Option<i32>,
    pub publisher: Option<String>,
    pub rating: Option<i32>,
    // ShortText
    pub doi: Option<String>,
    pub short_text_url: Option<String>,
    // Article
    pub journal: Option<String>,
    pub issue: Option<String>,
    pub article_url: Option<String>,
    // Media
    pub media_subtype: Option<MediaSubtype>,
    pub media_url: Option<String>,
}

/// Full detail shape returned to the frontend.
#[derive(Debug, Serialize)]
pub struct EntryDetail {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub status: Status,
    pub completed_at: Option<NaiveDate>,
    pub created_at: NaiveDateTime,
    pub edited_at: NaiveDateTime,
    pub isbn: Option<String>,
    pub pages: Option<i32>,
    pub publisher: Option<String>,
    pub rating: Option<i32>,
    pub doi: Option<String>,
    pub short_text_url: Option<String>,
    pub journal: Option<String>,
    pub issue: Option<String>,
    pub article_url: Option<String>,
    pub media_subtype: Option<MediaSubtype>,
    pub media_url: Option<String>,
    pub commentary: Option<Commentary>,
}

#[derive(Debug, Deserialize)]
pub struct NewEntry {
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    #[serde(default)]
    pub status: Option<Status>,
    // Book
    pub isbn: Option<String>,
    pub pages: Option<i32>,
    pub publisher: Option<String>,
    pub rating: Option<i32>,
    // ShortText
    pub doi: Option<String>,
    pub short_text_url: Option<String>,
    // Article
    pub journal: Option<String>,
    pub issue: Option<String>,
    pub article_url: Option<String>,
    // Media
    pub media_subtype: Option<MediaSubtype>,
    pub media_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntry {
    pub title: Option<String>,
    pub author: Option<String>,
    pub language: Option<String>,
    pub status: Option<Status>,
    pub completed_at: Option<NaiveDate>,
    // Book
    pub isbn: Option<String>,
    pub pages: Option<i32>,
    pub publisher: Option<String>,
    pub rating: Option<i32>,
    // ShortText
    pub doi: Option<String>,
    pub short_text_url: Option<String>,
    // Article
    pub journal: Option<String>,
    pub issue: Option<String>,
    pub article_url: Option<String>,
    // Media
    pub media_subtype: Option<MediaSubtype>,
    pub media_url: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Commentary {
    pub id: i32,
    pub entry_id: i32,
    pub title: Option<String>,
    pub body: Option<String>,
    pub is_published: bool,
    pub created_at: NaiveDateTime,
    pub edited_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct UpsertCommentary {
    pub title: Option<String>,
    pub body: String,
    #[serde(default = "default_true")]
    pub is_published: bool,
}

fn default_true() -> bool {
    true
}
