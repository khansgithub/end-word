-- Track words already played in a room so they cannot be submitted again
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS used_words jsonb NOT NULL DEFAULT '[]'::jsonb;
