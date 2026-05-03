-- Adds a creator-stated sentiment column to eval_videos. Captured client-side
-- before recording so the creator commits to "positive" or "negative" before
-- submitting the take. Two effects:
--   1. Primes the creator to be honest with themselves up-front.
--   2. Admin can compare this against the LLM-extracted sentiment and flag
--      mismatches as suspicious (creator says positive, video reads negative).
--
-- Spec: docs/superpowers/specs/2026-05-02-anti-fraud.md (Phase 7f)
--
-- Strict binary — no "mixed" option for creator-stated. The LLM-extracted
-- `extracted.sentiment` field can still be 'positive' | 'mixed' | 'negative'
-- | null; that's a separate signal.
--
-- Nullable for backwards compatibility with existing rows submitted before
-- this column existed. Enforce non-null at the app layer for new submissions.

alter table public.eval_videos
  add column creator_stated_sentiment text
  check (creator_stated_sentiment in ('positive', 'negative'));
