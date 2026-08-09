use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone, PartialEq)]
#[sqlx(type_name = "kind", rename_all = "snake_case")]
pub enum Kind {
    LongText,
    ShortText,
    Video,
}

#[derive(Debug, Serialize, Deserialize, sqlx::Type, Clone, PartialEq)]
#[sqlx(type_name = "status", rename_all = "snake_case")]
pub enum Status {
    ToRead,
    Reading,
    Read,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Entry {
    pub id: i32,
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub year_written: Option<i32>,
    pub year_published: Option<i32>,
    pub image_url: Option<String>,
    pub status: Status,
    pub read_at: Option<NaiveDate>,
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
    pub year_published: Option<i32>,
    pub read_at: Option<NaiveDate>,
    pub has_commentary: bool,
}

#[derive(Debug, Deserialize)]
pub struct NewEntry {
    pub kind: Kind,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub year_written: Option<i32>,
    pub year_published: Option<i32>,
    pub image_url: Option<String>,
    #[serde(default)]
    pub status: Option<Status>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntry {
    pub title: Option<String>,
    pub author: Option<String>,
    pub language: Option<String>,
    pub year_written: Option<i32>,
    pub year_published: Option<i32>,
    pub image_url: Option<String>,
    pub status: Option<Status>,
    pub read_at: Option<NaiveDate>,
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

#[derive(Debug, Serialize)]
pub struct EntryDetail {
    #[serde(flatten)]
    pub entry: Entry,
    pub commentary: Option<Commentary>,
}
