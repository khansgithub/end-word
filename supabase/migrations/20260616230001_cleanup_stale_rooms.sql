CREATE OR REPLACE FUNCTION public.cleanup_stale_rooms()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.rooms
  WHERE (
    updated_at < now() - interval '30 minutes'
    OR playercount = 0
  );
$$;
