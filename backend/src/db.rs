use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

pub async fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .idle_timeout(Duration::from_secs(300)) // Retires idle connections after 5 mins
        .connect(database_url)
        .await
}
