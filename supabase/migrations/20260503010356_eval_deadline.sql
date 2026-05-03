-- Adds a 7-day eval submission deadline to matches and an `eval_expired`
-- terminal stage for rows that miss it.
--
-- Spec: docs/superpowers/specs/2026-05-02-anti-fraud.md (Phase 7h)
--
-- Rationale: a creator who marks a product `received` has 7 days to land
-- their eval video. After that, brand inventory shouldn't keep sitting in
-- "eval limbo" and the data product gets stale. The cron-driven auto-expire
-- (flipping rows to `eval_expired`) is deferred to a later phase; the
-- application enforces the rejection at the `submitEval` server action so
-- nothing slips through in the meantime.
--
-- Existing rows that already sat at `received` before this migration won't
-- have an `eval_deadline_at` populated. The app treats null as
-- "no deadline" — those rows remain submittable until an admin intervenes.
-- Only the `markReceived` transition writes the column.

alter table public.matches add column eval_deadline_at timestamptz;

-- Drop the existing anonymous CHECK constraint (system-named
-- `matches_stage_check`, verified via pg_constraint) and re-add with
-- `eval_expired` included.
alter table public.matches drop constraint matches_stage_check;
alter table public.matches add constraint matches_stage_check
  check (stage in ('proposed', 'accepted', 'shipped', 'declined', 'received',
                   'declined_after_receipt', 'still_trying',
                   'eval_submitted', 'eval_complete', 'eval_expired'));
