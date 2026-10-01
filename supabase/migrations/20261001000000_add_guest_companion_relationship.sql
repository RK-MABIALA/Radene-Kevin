-- Migration: Add companion linking and relationship fields to guests
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS companion_id UUID REFERENCES guests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS relation_type TEXT DEFAULT 'conjoint';

CREATE INDEX IF NOT EXISTS idx_guests_companion_id ON guests(companion_id);
