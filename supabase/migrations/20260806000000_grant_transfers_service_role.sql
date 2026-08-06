/*
# Grant service_role privileges on transfers

## Problem
"permission denied for table transfers" from the search-my-transfers
edge function, which reads transfers using service_role. Every earlier
edge function either wrote to a different table (branch_managers) or
never needed a direct service_role SELECT on transfers, so this gap
never surfaced — the same class of bug documented for branch_managers
in 20260805130000_grant_branch_managers.sql. RLS policies don't
substitute for the base GRANT a role needs before RLS is evaluated,
and "Automatically expose new tables" is disabled on this project.

## Fix
Explicitly grant full privileges on transfers to service_role.
*/

GRANT ALL ON TABLE transfers TO service_role;
