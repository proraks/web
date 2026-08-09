# Reading List Tracker

A full-stack application for managing a reading list.

## Project Structure

- `/backend`: Rust web API built with Axum, SQLx, and MySQL.
- `/frontend`: Single-page application built with React, TypeScript, and Vite.

## Getting Started

### 1. Database Setup

Initialize the MySQL database using the initial schema:

```bash
mysql -h <host> -u <user> -p <db_name> < backend/migrations/001_init.sql
```

Or for PostgreSQL:

```bash
psql -h <host> -U <user> -d <db_name> -f backend/migrations/001_init.sql
```

### 2. Backend Configuration

1. Navigate to `/backend`.
2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL`: Your MySQL connection string.
   - `SESSION_SECRET`: A secure random string for signing cookie sessions.
   - `ADMIN_PASSWORD_HASH`: Argon2 hash of your admin password.
3. Generate the admin password hash:
   ```bash
   cargo run --bin hash_password
   ```
4. Run the API server:
   ```bash
   cargo run --bin reading-backend
   ```

### 3. Frontend Configuration

1. Navigate to `/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
