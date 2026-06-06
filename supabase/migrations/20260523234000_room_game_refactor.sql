-- Room-based multiplayer game state for end-word (Vercel + Supabase Realtime)

-- Extend rooms with game + lobby fields
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'ko',
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.gamestateenum NOT NULL DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS match_letter jsonb,
  ADD COLUMN IF NOT EXISTS turn integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS players jsonb NOT NULL DEFAULT '[null,null,null,null]'::jsonb,
  ADD COLUMN IF NOT EXISTS player_user_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS connected_players integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_language_check;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_language_check CHECK (language IN ('en', 'ko'));

-- Backfill invite codes for existing rows
UPDATE public.rooms
SET invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE invite_code IS NULL;

ALTER TABLE public.rooms ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_invite_code_key ON public.rooms (invite_code);

-- Default match letter for rows missing game state
UPDATE public.rooms
SET
  match_letter = COALESCE(
    match_letter,
    jsonb_build_object(
      'block', 'a',
      'steps', jsonb_build_array('a'),
      'value', 'a',
      'next', 0
    )
  ),
  players = COALESCE(players, '[null,null,null,null]'::jsonb),
  player_user_map = COALESCE(player_user_map, '{}'::jsonb)
WHERE match_letter IS NULL;

-- Realtime
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
END $$;

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_lobby_public_select" ON public.rooms;
CREATE POLICY "rooms_lobby_public_select"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    AND status IN ('waiting', 'playing')
    AND archived_at IS NULL
  );

DROP POLICY IF EXISTS "rooms_member_select" ON public.rooms;
CREATE POLICY "rooms_member_select"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL
    AND (
      host_user_id = auth.uid()
      OR player_user_map ? auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "rooms_private_invite_select" ON public.rooms;
CREATE POLICY "rooms_private_invite_select"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    is_private = true
    AND archived_at IS NULL
    AND status IN ('waiting', 'playing')
    AND player_user_map ? auth.uid()::text
  );

DROP POLICY IF EXISTS "rooms_insert_host" ON public.rooms;
CREATE POLICY "rooms_insert_host"
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (host_user_id = auth.uid());

-- Legacy tables kept for now; app uses rooms as source of truth
COMMENT ON TABLE public.rooms IS 'Active game rooms; authoritative state for multiplayer matches';
