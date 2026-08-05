/*
# Branch-scoped manager accounts

## Summary
Lets the super admin create per-branch manager accounts that can only
see transfers for their own branch, while the super admin (the shared
admin@banknote.internal account) keeps seeing everything.

## New Tables
### branch_managers
- `user_id` (uuid, PK, references auth.users) — the manager's auth account
- `branch_name` (text) — the branch this manager is scoped to
- `full_name` (text) — display name
- `created_at` (timestamptz)

## Security
- A manager can read their own row (so the client can tell which branch
  it's scoped to).
- `transfers` SELECT: accounts NOT in branch_managers (i.e. the super
  admin) see every row; accounts that ARE in branch_managers only see
  rows matching their branch_name.
- `transfers` UPDATE/DELETE (approve/reject/delete): stays super-admin
  only — branch managers get read-only visibility into their branch.
*/

CREATE TABLE IF NOT EXISTS branch_managers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branch_managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_read_branch_managers" ON branch_managers;
CREATE POLICY "self_read_branch_managers" ON branch_managers FOR SELECT
  TO authenticated USING (user_id = auth.uid());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE branch_managers TO authenticated;

-- Re-scope transfers SELECT: super admin (no branch_managers row) sees
-- everything; a branch manager only sees their own branch's rows.
DROP POLICY IF EXISTS "admin_select_transfers" ON transfers;
CREATE POLICY "admin_select_transfers" ON transfers FOR SELECT
  TO authenticated USING (
    NOT EXISTS (SELECT 1 FROM branch_managers WHERE user_id = auth.uid())
    OR branch_name = (SELECT branch_name FROM branch_managers WHERE user_id = auth.uid())
  );

-- UPDATE/DELETE (approve/reject/delete) stay super-admin only.
DROP POLICY IF EXISTS "admin_update_transfers" ON transfers;
CREATE POLICY "admin_update_transfers" ON transfers FOR UPDATE
  TO authenticated
  USING (NOT EXISTS (SELECT 1 FROM branch_managers WHERE user_id = auth.uid()))
  WITH CHECK (NOT EXISTS (SELECT 1 FROM branch_managers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_delete_transfers" ON transfers;
CREATE POLICY "admin_delete_transfers" ON transfers FOR DELETE
  TO authenticated
  USING (NOT EXISTS (SELECT 1 FROM branch_managers WHERE user_id = auth.uid()));
