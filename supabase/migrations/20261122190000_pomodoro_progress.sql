begin;

create table public.pomodoro_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object'),
  audio jsonb not null default '{}' check (jsonb_typeof(audio) = 'object'),
  world jsonb not null default '{}' check (jsonb_typeof(world) = 'object'),
  island jsonb not null default '{"progress":0,"completedAt":null}' check (jsonb_typeof(island) = 'object'),
  biome text not null default 'meadow'
    check (biome in ('meadow','desert','snow','cherry','forest','autumn','tropical','mushroom')),
  generation integer not null default 0 check (generation >= 0)
);

create table public.pomodoro_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  duration_minutes integer not null check (duration_minutes between 1 and 180),
  elapsed_ms integer not null check (elapsed_ms between 0 and duration_minutes * 60000),
  biome text not null check (biome in ('meadow','desert','snow','cherry','forest','autumn','tropical','mushroom')),
  status text not null check (status in ('completed','aborted')),
  primary key (user_id, id)
);
create index pomodoro_sessions_recent_idx on public.pomodoro_sessions(user_id, ended_at desc, id desc);

alter table public.pomodoro_state enable row level security;
alter table public.pomodoro_sessions enable row level security;
revoke all on public.pomodoro_state, public.pomodoro_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.pomodoro_state, public.pomodoro_sessions to authenticated;

create policy state_select on public.pomodoro_state for select to authenticated using ((select auth.uid()) = user_id);
create policy state_insert on public.pomodoro_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy state_update on public.pomodoro_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy state_delete on public.pomodoro_state for delete to authenticated using ((select auth.uid()) = user_id);
create policy sessions_select on public.pomodoro_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert on public.pomodoro_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sessions_update on public.pomodoro_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sessions_delete on public.pomodoro_sessions for delete to authenticated using ((select auth.uid()) = user_id);

-- Counts and per-biome progression are derived from the same rows as the journal.
create function public.pomodoro_snapshot(p_user uuid) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'state', (select to_jsonb(s) - 'user_id' from public.pomodoro_state s where s.user_id = p_user),
    'stats', (select jsonb_build_object('completed', count(*), 'totalFocusMs', coalesce(sum(elapsed_ms), 0))
      from public.pomodoro_sessions where user_id = p_user and status = 'completed'),
    'byBiome', coalesce((select jsonb_object_agg(biome, total) from (
      select biome, count(*) as total from public.pomodoro_sessions
      where user_id = p_user and status = 'completed' group by biome
    ) counts), '{}'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'startedAt', started_at, 'endedAt', ended_at,
      'durationMinutes', duration_minutes, 'elapsedMs', elapsed_ms, 'biome', biome, 'status', status
    ) order by ended_at desc, id desc) from (
      select * from public.pomodoro_sessions where user_id = p_user
      order by ended_at desc, id desc limit 20
    ) recent), '[]'::jsonb)
  )
  where p_user = (select auth.uid());
$$;

-- A row lock orders changes for this user. The insert and island update commit together.
create function public.pomodoro_write(
  p_user uuid, p_patch jsonb default '{}'::jsonb, p_session jsonb default null,
  p_reset boolean default false, p_generation integer default null
) returns jsonb
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  generation_now integer;
  inserted integer;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user then
    raise exception 'Account mismatch' using errcode = '42501';
  end if;

  insert into public.pomodoro_state(user_id) values (p_user)
  on conflict (user_id) do nothing;
  select generation into generation_now from public.pomodoro_state
    where user_id = p_user for update;

  if (p_reset or p_session is not null) and p_generation is distinct from generation_now then
    return public.pomodoro_snapshot(p_user);
  end if;

  if p_reset then
    delete from public.pomodoro_sessions where user_id = p_user;
    update public.pomodoro_state
      set generation = generation + 1, island = '{"progress":0,"completedAt":null}'::jsonb,
          biome = case when biome in ('meadow','desert','snow') then biome else 'meadow' end
      where user_id = p_user;
  elsif p_session is not null then
    insert into public.pomodoro_sessions(user_id,id,started_at,ended_at,duration_minutes,elapsed_ms,biome,status)
      values (p_user,(p_session->>'id')::uuid,(p_session->>'startedAt')::timestamptz,
        (p_session->>'endedAt')::timestamptz,(p_session->>'durationMinutes')::integer,
        (p_session->>'elapsedMs')::integer,p_session->>'biome',p_session->>'status')
      on conflict (user_id,id) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then
      update public.pomodoro_state set island = case when p_session->>'status' = 'completed'
        then jsonb_build_object('progress', 1, 'completedAt', p_session->>'endedAt')
        else '{"progress":0,"completedAt":null}'::jsonb end
      where user_id = p_user;
    end if;
  else
    update public.pomodoro_state set
      settings = settings || coalesce(p_patch->'settings','{}'::jsonb),
      audio = audio || coalesce(p_patch->'audio','{}'::jsonb),
      world = world || coalesce(p_patch->'world','{}'::jsonb),
      island = coalesce(p_patch->'island', island),
      biome = coalesce(p_patch->>'biome', biome)
    where user_id = p_user;
    return null;
  end if;

  return public.pomodoro_snapshot(p_user);
end;
$$;

revoke all on function public.pomodoro_snapshot(uuid), public.pomodoro_write(uuid,jsonb,jsonb,boolean,integer)
  from public, anon, authenticated;
grant execute on function public.pomodoro_snapshot(uuid), public.pomodoro_write(uuid,jsonb,jsonb,boolean,integer)
  to authenticated;
notify pgrst, 'reload schema';
commit;
