/*
# Add wallet_provider to transfers

## Summary
Adds a `wallet_provider` column so e-wallet transfers (Vodafone Cash, Etisalat Cash,
Orange Cash, or any other wallet like OVO) record which wallet the customer used.

## Changes
- `transfers.wallet_provider` (text, nullable) — wallet name for e-wallet transfers
*/

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS wallet_provider text;
