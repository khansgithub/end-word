-- Members must read archived rows to receive Realtime game-over updates.
DROP POLICY IF EXISTS "rooms_member_select" ON public.rooms;
CREATE POLICY "rooms_member_select"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (
    host_user_id = auth.uid()
    OR player_user_map ? auth.uid()::text
  );
