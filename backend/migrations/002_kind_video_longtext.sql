-- Rename 'book' → 'long_text' (Postgres 10+)
ALTER TYPE kind RENAME VALUE 'book' TO 'long_text';

-- Add 'video' as a new allowed value
ALTER TYPE kind ADD VALUE IF NOT EXISTS 'video';
