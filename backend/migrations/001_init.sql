CREATE TABLE entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('book', 'short_text') NOT NULL,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300),
  language VARCHAR(10),        -- language the work itself is in, e.g. 'et', 'en', 'ru', 'de'
  year_written INT,            -- year originally written/composed
  year_published INT,          -- year it came out / was published
  image_url VARCHAR(1000),     -- FTP'd cover, or own upload for short texts; NULL is fine
  status ENUM('to_read', 'reading', 'read') NOT NULL DEFAULT 'to_read',
  read_at DATE,                -- when actually finished, only set once status='read'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE commentaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL UNIQUE,  -- one commentary per entry; a re-read is a new `entries` row entirely
  title VARCHAR(500),
  body TEXT,                     -- single text block, Estonian. Lead with **bold** for the
                                  -- news-style standfirst instead of a separate summary column —
                                  -- render as markdown/HTML on the frontend.
  is_published BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_kind ON entries(kind);
