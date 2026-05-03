-- Storage bucket for creator eval videos.
-- Plan: docs/superpowers/plans/2026-05-01-creator-portal.md (Task 0.4)
-- Spec: docs/superpowers/specs/2026-05-01-creator-portal-design.md §9
--
-- Object key convention: {match_id}/{uuid}.{ext}. Policies depend on
-- the leading path segment being the match_id, so the upload code in
-- Task 5.2 (submitEval) must respect this.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eval-videos',
  'eval-videos',
  false,
  104857600, -- 100 MB
  array['video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

-- Admin: full access to objects in the bucket
create policy eval_videos_obj_admin_all on storage.objects
  for all
  using (bucket_id = 'eval-videos' and is_team_member())
  with check (bucket_id = 'eval-videos' and is_team_member());

-- Creator: read objects whose leading path segment is one of their match ids
create policy eval_videos_obj_creator_read on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'eval-videos'
    and exists (
      select 1
      from matches m
      join creators c on c.id = m.creator_id
      where c.auth_user_id = auth.uid()
        and m.id::text = split_part(name, '/', 1)
    )
  );

-- Creator: insert under their own match's prefix
create policy eval_videos_obj_creator_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'eval-videos'
    and exists (
      select 1
      from matches m
      join creators c on c.id = m.creator_id
      where c.auth_user_id = auth.uid()
        and m.id::text = split_part(name, '/', 1)
    )
  );
