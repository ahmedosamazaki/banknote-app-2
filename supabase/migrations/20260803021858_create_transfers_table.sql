/*
# Create transfers table for Banknotepay

## Summary
Creates the core data table for tracking delivery representative transfers
via InstaPay and Vodafone Cash, including all form fields and receipt image support.

## New Tables

### transfers
- `id` (uuid, primary key) — unique identifier
- `representative_name` (text, not null) — name of the delivery rep
- `branch_name` (text, not null) — branch the rep belongs to
- `transfer_amount` (numeric, not null) — the transfer amount in EGP
- `sender_phone` (text, not null) — phone number of the sender
- `reference_number` (text) — InstaPay/Vodafone Cash reference/operation number
- `transfer_type` (text) — 'instapay' or 'vodafone_cash'
- `bank_name` (text) — bank name extracted from receipt
- `transfer_date` (text) — date of transfer (from receipt or manual)
- `notes` (text) — optional notes
- `receipt_image_url` (text) — URL of uploaded receipt image in storage
- `status` (text, default 'pending') — pending/approved/rejected
- `created_at` (timestamptz) — submission timestamp

## Security
- RLS enabled
- anon + authenticated roles can INSERT (reps submit without login)
- anon + authenticated roles can SELECT (admin views all)
- anon + authenticated can UPDATE/DELETE (admin operations)
*/

CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_name text NOT NULL,
  branch_name text NOT NULL,
  transfer_amount numeric NOT NULL,
  sender_phone text NOT NULL,
  reference_number text,
  transfer_type text DEFAULT 'instapay',
  bank_name text,
  transfer_date text,
  notes text,
  receipt_image_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transfers" ON transfers;
CREATE POLICY "anon_select_transfers" ON transfers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transfers" ON transfers;
CREATE POLICY "anon_insert_transfers" ON transfers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transfers" ON transfers;
CREATE POLICY "anon_update_transfers" ON transfers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transfers" ON transfers;
CREATE POLICY "anon_delete_transfers" ON transfers FOR DELETE
  TO anon, authenticated USING (true);
