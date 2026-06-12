-- Add per-player timer duration (in seconds) configurable at room creation
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS timer_duration integer NOT NULL DEFAULT 60;
