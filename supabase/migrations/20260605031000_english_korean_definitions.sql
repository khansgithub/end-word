-- Cache Korean explanations for English words submitted in-game
CREATE TABLE IF NOT EXISTS public.english_korean_definitions (
  word text PRIMARY KEY,
  definition text NOT NULL,
  source text NOT NULL DEFAULT 'naver',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.english_korean_definitions ENABLE ROW LEVEL SECURITY;
