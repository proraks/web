# Reading List Tracker

A full-stack application for managing a reading list.

## Project Structure

- `/backend`: Rust web API built with Axum, SQLx, and PostgreSQL.
- `/frontend`: Single-page application built with React, TypeScript, and Vite.

## Getting Started

### 1. Database Setup

Initialize the PostgreSQL database using the migrations (in order):

```bash
psql -h <host> -U <user> -d <db_name> -f backend/migrations/001_init.sql
psql -h <host> -U <user> -d <db_name> -f backend/migrations/002_kind_video_longtext.sql
```

### 2. Backend Configuration

1. Navigate to `/backend`.
2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `SESSION_SECRET`: A secure random string for signing cookie sessions.
   - `ADMIN_PASSWORD_HASH`: Argon2 hash of your admin password.
   - `CORS_ORIGINS`: Comma-separated list of frontend origins allowed to call the
     API directly. Each entry can be exact (`https://sub1.ralfjka.sk`) or a
     sub-domain wildcard (`https://*.ralfjka.sk`). Skip when serving the frontend
     through the nginx proxy (Docker), which is same-origin.
3. Generate the admin password hash:
   ```bash
   cargo run --bin hash-password
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

## Docker

```bash
docker compose up --build
```

- Backend runs on `http://localhost:8080`.
- Frontend runs on `http://localhost:8084` (nginx) and reverse-proxies `/api/*`
  to the backend, so no separate `VITE_API_URL` is needed.
- To point the frontend at an absolute API URL instead, build with:
  `docker build --build-arg VITE_API_URL=https://api.example.com ./frontend`
- To run the frontend against a host-run backend:
  `docker run -p 8084:80 -e BACKEND_UPSTREAM=http://host.docker.internal:8080 ralfjka-frontend`
