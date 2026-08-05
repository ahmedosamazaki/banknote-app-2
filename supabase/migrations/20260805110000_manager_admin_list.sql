/*
# Let the super admin list and manage branch managers

## Summary
- Adds `username` to branch_managers so the dashboard can display it
  without needing access to auth.users.
- Adds an RLS policy so an account with NO branch_managers row (the
  super admin) can read every row, while a branch manager still only
  sees their own (existing self-read policy, combined with OR).
*/

ALTER TABLE branch_managers ADD COLUMN IF NOT EXISTS username text;

DROP POLICY IF EXISTS "admin_read_all_branch_managers" ON branch_managers;
CREATE POLICY "admin_read_all_branch_managers" ON branch_managers FOR SELECT
  TO authenticated
  USING (NOT EXISTS (SELECT 1 FROM branch_managers bm WHERE bm.user_id = auth.uid()));
