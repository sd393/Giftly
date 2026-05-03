-- Adds a `shipped` stage between `accepted` and `received` so that admins
-- (and later, the brand portal) confirm shipping before creators can mark
-- a gift as received. This closes the "got-it" fraud path where a creator
-- could click "I received it" before any package actually went out.
--
-- Spec: docs/superpowers/specs/2026-05-02-anti-fraud.md (Phase 7e)
--
-- Stage transitions after this migration:
--   proposed → accepted | declined
--   accepted → shipped (admin marks shipped)
--   shipped → received (creator marks received)
--   (decline-after-receipt and still_trying loops below `received` unchanged)
--
-- Three new columns capture admin-supplied shipping metadata. They are all
-- optional — the admin may flip stage to `shipped` without filling tracking,
-- in which case we simply show "in transit" without a tracking subtitle.

-- Drop the existing anonymous CHECK constraint (system-named
-- `matches_stage_check`) and re-add it with the new value included.
alter table public.matches drop constraint matches_stage_check;
alter table public.matches add constraint matches_stage_check
  check (stage in ('proposed', 'accepted', 'shipped', 'declined', 'received',
                   'declined_after_receipt', 'still_trying',
                   'eval_submitted', 'eval_complete'));

alter table public.matches add column shipped_at timestamptz;
alter table public.matches add column tracking_number text;
alter table public.matches add column tracking_carrier text;
