-- Bump the eval-videos bucket to 500 MB (Phase 7g).
-- 100 MB didn't fit a 5+ min 1080p phone video. Mirrors the new
-- `SUBMIT_LIMITS.MAX_BYTES` in app/portal/creator/_actions.ts and the
-- `experimental.serverActions.bodySizeLimit` raise in next.config.mjs.

update storage.buckets
set file_size_limit = 524288000  -- 500 MB
where id = 'eval-videos';
