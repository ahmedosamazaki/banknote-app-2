/*
# Add AI receipt verification flags to transfers

## Summary
Stores the outcome of the AI receipt check (`verify-receipt` edge function) so
admins can see which receipts were flagged as potentially fake and still make
the final call manually from the dashboard.

## Changes
- `transfers.ai_verified` (boolean, default false) — AI check ran successfully
- `transfers.ai_flagged` (boolean, default false) — AI thinks the receipt looks suspicious
- `transfers.ai_flag_reason` (text, nullable) — AI's explanation when flagged
*/

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS ai_verified boolean DEFAULT false;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS ai_flagged boolean DEFAULT false;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS ai_flag_reason text;
