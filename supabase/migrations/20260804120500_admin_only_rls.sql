/*
# Restrict transfers read/update/delete to authenticated admin only

## Problem
Previously, SELECT/UPDATE/DELETE on `transfers` were open to the `anon` role.
Since the Supabase URL and anon key ship inside the public JS bundle, anyone
could read every transfer (names, phone numbers, amounts, receipt images) or
even approve/reject/delete records directly through the Supabase client —
regardless of the admin panel's password screen.

## Fix
- Reps keep submitting without login: INSERT stays open to anon + authenticated.
- SELECT/UPDATE/DELETE now require an authenticated session. The only account
  that ever authenticates is the shared admin login (provisioned by the
  `admin-login` edge function), so `authenticated` effectively means "admin".
*/

DROP POLICY IF EXISTS "anon_select_transfers" ON transfers;
DROP POLICY IF EXISTS "anon_update_transfers" ON transfers;
DROP POLICY IF EXISTS "anon_delete_transfers" ON transfers;

CREATE POLICY "admin_select_transfers" ON transfers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_update_transfers" ON transfers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_delete_transfers" ON transfers FOR DELETE
  TO authenticated USING (true);
