ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS spectators jsonb NOT NULL DEFAULT '[]'::jsonb;
