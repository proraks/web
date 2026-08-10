-- Enum types
CREATE TYPE entry_kind AS ENUM ('book', 'short_text', 'article', 'media');
CREATE TYPE entry_status AS ENUM ('tbr', 'in_progress', 'completed');
CREATE TYPE media_subtype AS ENUM ('video', 'audio');

-- Base entries table - common fields for all types
CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  kind entry_kind NOT NULL,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300),
  language VARCHAR(10),
  year_written INT,
  year_published INT,
  image_url VARCHAR(1000),
  status entry_status NOT NULL DEFAULT 'tbr',
  completed_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Type-specific table: books
CREATE TABLE books (
  entry_id INT PRIMARY KEY,
  isbn VARCHAR(20),
  pages INT,
  publisher VARCHAR(300),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Type-specific table: short_texts
CREATE TABLE short_texts (
  entry_id INT PRIMARY KEY,
  doi VARCHAR(100),
  url VARCHAR(1000),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Type-specific table: articles
CREATE TABLE articles (
  entry_id INT PRIMARY KEY,
  journal VARCHAR(300),
  issue VARCHAR(50),
  url VARCHAR(1000),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Type-specific table: media (videos or audio files)
CREATE TABLE media_items (
  entry_id INT PRIMARY KEY,
  media_subtype media_subtype NOT NULL,
  url VARCHAR(1000) NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Commentary - 1:1 with entries
CREATE TABLE commentaries (
  id SERIAL PRIMARY KEY,
  entry_id INT NOT NULL UNIQUE,
  title VARCHAR(500),
  body TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_kind ON entries(kind);
CREATE INDEX idx_entries_status_kind_completed 
  ON entries(status, kind, completed_at DESC, created_at DESC);
CREATE INDEX idx_commentaries_entry_id ON commentaries(entry_id);
ALTER TABLE books ADD COLUMN rating INT;
ALTER TABLE books
  ADD CONSTRAINT books_rating_range_check
  CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
CREATE INDEX idx_entries_kind_status_completed
  ON entries(kind, status, completed_at DESC, created_at DESC);
CREATE INDEX idx_entries_completed_at
  ON entries(completed_at DESC, created_at DESC);
