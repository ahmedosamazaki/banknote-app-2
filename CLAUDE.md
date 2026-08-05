# Banknote — Delivery Rep Transfer Tracking App

RTL Arabic web app for **Banknote** (an Egyptian cash-collection/e-payment
company). Delivery representatives submit InstaPay / Vodafone Cash transfer
receipts from the field; a super admin (and optionally per-branch managers)
reviews and approves/rejects them from a dashboard.

Tagline: "FROM CASH TO CASHLESS"

## Stack

- React + TypeScript + Vite + Tailwind CSS, RTL layout
- Supabase: Postgres + Row Level Security, Auth, Storage (receipt images),
  Edge Functions (Deno)
- Hosting: Vercel project `banknote-app-2` (team `banknote`), auto-deploys
  from GitHub `ahmedosamazaki/banknote-app-2` on push to `main`
- Supabase project: `ckqifrsahlpzuhhjhpxc` ("banknote")

## Production links

- App (reps): https://banknote-app-2.vercel.app
- Admin/manager login: https://banknote-app-2.vercel.app/admin
- Vercel dashboard: https://vercel.com/banknote/banknote-app-2
- Supabase dashboard: https://supabase.com/dashboard/project/ckqifrsahlpzuhhjhpxc

## Auth model — read this before touching login/RLS

There are **two kinds of admin-side accounts**, both logging in at the same
`/admin` URL (not separate links — a deliberate choice):

1. **Super admin** — one shared account, `admin@banknote.internal`. Its
   password is the `ADMIN_PASSWORD` secret (Supabase → Edge Functions →
   Secrets), NOT a normal Supabase Auth password reset flow. The
   `admin-login` edge function checks the submitted password against that
   secret and self-provisions/rotates the `admin@banknote.internal` Auth
   user to match. Login form: leave the username field empty.
2. **Branch managers** — created by the super admin via the "+" button in
   the dashboard (`create-branch-manager` edge function). Each gets an Auth
   user `{username}@banknote-manager.internal` plus a row in
   `branch_managers` (`user_id`, `branch_name`, `username`, `full_name`).
   Login form: fill in the username.

**The row in `branch_managers` IS the authorization signal.** Client and RLS
logic both use "does this authenticated user have a `branch_managers` row?"
to decide manager-vs-super-admin. This means: **an account with no
`branch_managers` row is treated as the super admin (full access).** If
manager provisioning ever partially fails (Auth user created, insert
failed), that account would silently have full admin rights — this bit us
once already. `create-branch-manager` now rolls back (deletes the Auth user)
if the `branch_managers` insert fails, specifically to prevent that. Keep
that invariant if you touch this function.

Branch managers are **read-only**: they see only their branch's transfers,
no approve/reject. Super admin can approve/reject and reset any manager's
password (`reset-manager-password` edge function).

## Two Postgres gotchas already hit in this project — avoid repeating them

1. **"Automatically expose new tables" is disabled on this project.** Every
   new table needs explicit `GRANT ... TO service_role` (and `authenticated`
   if the client reads it directly) — RLS policies alone are not enough,
   you'll get `permission denied for table X` even from a service-role edge
   function. Hit this for both `transfers` and `branch_managers`.
2. **Never write an RLS policy whose `USING` clause subqueries the same
   table it's attached to.** Postgres re-applies RLS to that inner query,
   which needs to evaluate the same policy again — infinite recursion
   (`42P17`), and it breaks not just that table but anything whose own RLS
   policies subquery it. If you need "is this row's owner also a row in
   this same table" logic, wrap the check in a `SECURITY DEFINER STABLE`
   SQL function (see `is_super_admin()` in
   `supabase/migrations/20260805120000_fix_branch_managers_recursion.sql`)
   — the function body bypasses RLS instead of re-triggering it.

## Data model

- `transfers` — the core table. Rep-submitted fields (name, phone, branch,
  amount, reference number, bank/wallet, receipt image URL) plus
  `status` (pending/approved/rejected), `reviewed_at`, and AI verification
  flags (`ai_verified`, `ai_flagged`, `ai_flag_reason`).
- `branch_managers` — `user_id` (PK, FK to `auth.users`), `branch_name`,
  `username`, `full_name`.

RLS: `anon` + `authenticated` can INSERT transfers (reps don't log in).
SELECT/UPDATE/DELETE require an authenticated session, scoped by branch for
managers via a subquery against `branch_managers` (not self-referential, so
no recursion issue there — only `branch_managers`' own policies needed the
`SECURITY DEFINER` workaround).

## Edge functions (`supabase/functions/`)

- `admin-login` — super admin password check (see Auth model above)
- `create-branch-manager` — super-admin-gated manager account creation
- `reset-manager-password` — super-admin-gated password reset for a manager
- `verify-receipt` — real AI receipt verification (replaced an earlier fake
  OCR simulation). Submission is blocked client-side if the AI flags the
  receipt as suspicious.
- `search-my-transfers`, `sync-to-sheets` — supporting functions

All of them share an error-handling pattern: `err instanceof Error` is not
enough (PostgrestError and some other thrown values are plain objects), so
catch blocks also check `typeof err === 'object' && 'message' in err`, with
a final `JSON.stringify(err)` fallback so a truly odd thrown value still
surfaces something diagnosable instead of a generic message.

## Frontend notes

- `src/config.ts` — company name/branding, WhatsApp support number, fixed
  12-branch list, `MANAGER_EMAIL_DOMAIN`. Branch list is a closed dropdown,
  not free text.
- Rep form (`TransferForm.tsx`): receipt photo, reference number, and bank
  name are mandatory. Egyptian phone format enforced
  (`/^01[0125]\d{8}$/`). Rep's name/phone/branch are remembered on-device
  (localStorage) so repeat submissions don't require retyping. Receipt
  images are compressed client-side (`src/lib/image.ts`) before upload to
  conserve the free Storage tier.
- `AdminDashboard.tsx` — approve/reject with confirmation dialogs,
  pagination, per-bank / per-branch / per-rep report tools, QR code
  generator for the app link, branch-manager list + password reset.
- PWA-installable (manifest + icons) for "Add to Home Screen" on mobile.

## Known constraints / workflow quirks

- **This Claude Code session cannot `git push`** — every attempt returns a
  403 from the GitHub proxy, for both `git push` and the GitHub API. The
  working pattern: commit locally, then hand the user the changed files
  (renamed `.txt` so they don't get misidentified as video files on
  upload) plus direct GitHub web-UI links
  (`/edit/main/<path>` or `/new/main?filename=<path>`) so they upload
  manually. SQL migrations get sent as clean snippets (no `/* */` comment
  blocks) because comment blocks have caused paste errors in the Supabase
  SQL Editor before.
- Deploying a new/changed **edge function** requires pasting the code into
  the Supabase dashboard and clicking Deploy — pushing to GitHub alone does
  not deploy it (GitHub here is just a source mirror, not wired to
  Supabase CI).
- Vercel occasionally serves a stale build even after a manual Redeploy —
  the reliable fix is an actual new commit (or Redeploy with "Use existing
  Build Cache" unchecked).

## Deferred / explicitly not doing yet

- Dark/light mode toggle — user asked, then explicitly said not to build it
  yet.
- Native Android APK (Bubblewrap/TWA) — not sideloaded to reps yet, blocked
  in the agent sandbox by network egress policy; user has a written guide
  to run it themselves if they want it.
- Self-hosting on the company's own Windows Server (domain + SSL cert are
  ready) — deliberately deferred in favor of shipping on free-tier
  Supabase/Vercel first and revisiting once there's real usage data.
- Branch managers currently cannot approve/reject their own branch's
  transfers (read-only by design) — could be added if requested.
- A separate, unstarted request: an Excel export (name, employee number,
  date, check-in/check-out) linked to a ZKTeco fingerprint attendance
  device. Not part of this app's codebase yet.
