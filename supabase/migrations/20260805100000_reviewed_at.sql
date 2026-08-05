/*
# Track when a transfer was approved/rejected

## Summary
Adds `reviewed_at` so the admin dashboard can show when a decision was
made on a transfer, not just what the decision was.

## Changes
- `transfers.reviewed_at` (timestamptz, nullable) — set when status
  moves to approved/rejected
*/

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
