
create or replace function public.insert_analysis_with_quota(
  p_input_method text,
  p_source_excerpt text,
  p_source_full text,
  p_github_path text,
  p_language text,
  p_functionality jsonb,
  p_purpose text
)
returns public.analyses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_used int;
  v_row public.analyses;
  v_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Per-user transactional lock prevents race conditions across concurrent calls
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select count(*) into v_used
  from public.analyses
  where user_id = v_user
    and created_at >= v_start;

  if v_used >= 30 then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  insert into public.analyses (
    user_id, input_method, source_excerpt, source_full,
    github_path, language, functionality, purpose
  ) values (
    v_user, p_input_method, p_source_excerpt, p_source_full,
    p_github_path, p_language, p_functionality, p_purpose
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.insert_analysis_with_quota(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.insert_analysis_with_quota(text, text, text, text, text, jsonb, text) to authenticated;
