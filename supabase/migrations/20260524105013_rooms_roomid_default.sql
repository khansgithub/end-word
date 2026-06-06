-- Room inserts must supply roomid; default for rows created without an explicit id.
ALTER TABLE public.rooms
  ALTER COLUMN roomid SET DEFAULT gen_random_uuid();
