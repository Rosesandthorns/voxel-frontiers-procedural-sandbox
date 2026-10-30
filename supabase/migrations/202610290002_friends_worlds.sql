begin;
create table public.biome_friends (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester<>recipient)
);
create unique index biome_friends_pair on public.biome_friends(least(requester,recipient),greatest(requester,recipient));
alter table public.biome_friends enable row level security;
revoke all on public.biome_friends from anon,authenticated;
grant select on public.biome_friends to authenticated;
create policy biome_friends_private on public.biome_friends for select to authenticated using((select auth.uid()) in (requester,recipient));
create table public.biome_friend_limits(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null default now(),attempts integer not null default 0);
alter table public.biome_friend_limits enable row level security;
revoke all on public.biome_friend_limits from anon,authenticated;
create function public.biome_is_friend(other uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.biome_friends where status='accepted' and ((requester=auth.uid() and recipient=other) or (recipient=auth.uid() and requester=other)))
$$;
revoke all on function public.biome_is_friend(uuid) from public;
grant execute on function public.biome_is_friend(uuid) to authenticated;
create function public.biome_request_friend(player_name text) returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); target uuid; tries integer;
begin
 if who is null then raise exception 'Sign in first.'; end if;
 select id into target from public.biome_profiles where lower(username)=lower(trim(player_name));
 if target is null then raise exception 'No player has that Biome username.'; end if;
 if target=who then raise exception 'Choose another player.'; end if;
 insert into public.biome_friend_limits(user_id,window_start,attempts) values(who,now(),1)
 on conflict(user_id) do update set attempts=case when biome_friend_limits.window_start<now()-interval '1 hour' then 1 else biome_friend_limits.attempts+1 end,window_start=case when biome_friend_limits.window_start<now()-interval '1 hour' then now() else biome_friend_limits.window_start end returning attempts into tries;
 if tries>20 then raise exception 'Too many friend requests. Try again later.'; end if;
 insert into public.biome_friends(requester,recipient) values(who,target) on conflict do nothing;
end;
$$;
create function public.biome_accept_friend(request_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.biome_friends set status='accepted' where id=request_id and recipient=auth.uid() and status='pending'; if not found then raise exception 'This request is no longer available.'; end if; end;
$$;
create function public.biome_remove_friend(request_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin delete from public.biome_friends where id=request_id and auth.uid() in(requester,recipient); end;
$$;
revoke all on function public.biome_request_friend(text),public.biome_accept_friend(uuid),public.biome_remove_friend(uuid) from public;
grant execute on function public.biome_request_friend(text),public.biome_accept_friend(uuid),public.biome_remove_friend(uuid) to authenticated;
create table public.biome_world_invites (
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(host_id,guest_id),check(host_id<>guest_id)
);
alter table public.biome_world_invites enable row level security;
revoke all on public.biome_world_invites from anon,authenticated;
grant select,delete on public.biome_world_invites to authenticated;
grant insert(host_id,guest_id) on public.biome_world_invites to authenticated;
create policy biome_invites_read on public.biome_world_invites for select to authenticated using(auth.uid() in(host_id,guest_id));
create policy biome_invites_create on public.biome_world_invites for insert to authenticated with check(host_id=(select auth.uid()) and public.biome_is_friend(guest_id));
create policy biome_invites_remove on public.biome_world_invites for delete to authenticated using(auth.uid() in(host_id,guest_id));
create table public.biome_online_worlds (
 host_id uuid primary key references auth.users(id) on delete cascade,
 lobby_id text not null check(lobby_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 world_name text not null check(char_length(world_name) between 1 and 48),
 access text not null check(access in('friends','invite')),
 updated_at timestamptz not null default now()
);
alter table public.biome_online_worlds enable row level security;
revoke all on public.biome_online_worlds from anon,authenticated;
grant select,delete on public.biome_online_worlds to authenticated;
grant insert(host_id,lobby_id,world_name,access),update(lobby_id,world_name,access) on public.biome_online_worlds to authenticated;
create policy biome_worlds_read on public.biome_online_worlds for select to authenticated using(host_id=(select auth.uid()) or (updated_at>now()-interval '90 seconds' and public.biome_is_friend(host_id) and (access='friends' or exists(select 1 from public.biome_world_invites where guest_id=(select auth.uid()) and host_id=biome_online_worlds.host_id))));
create policy biome_worlds_create on public.biome_online_worlds for insert to authenticated with check(host_id=(select auth.uid()));
create policy biome_worlds_edit on public.biome_online_worlds for update to authenticated using(host_id=(select auth.uid())) with check(host_id=(select auth.uid()));
create policy biome_worlds_remove on public.biome_online_worlds for delete to authenticated using(host_id=(select auth.uid()));
create function public.biome_world_heartbeat() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at:=now();return new;end; $$;
revoke all on function public.biome_world_heartbeat() from public;
create trigger biome_world_heartbeat before insert or update on public.biome_online_worlds for each row execute function public.biome_world_heartbeat();
commit;
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename like 'biome_%' order by tablename;
