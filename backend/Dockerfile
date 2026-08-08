# ---- build stage ----
FROM rust:1.82 AS builder
WORKDIR /app
# cache dependencies first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY . .
RUN cargo build --release

# ---- runtime stage ----
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/reading-backend /usr/local/bin/reading-backend
EXPOSE 8080
CMD ["reading-backend"]
