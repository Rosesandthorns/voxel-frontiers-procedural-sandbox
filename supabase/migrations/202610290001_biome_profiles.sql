-- Biome public identities contain no email addresses or authentication secrets.
begin;
create table public.biome_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index biome_profiles_username_key on public.biome_profiles (lower(username));
alter table public.biome_profiles enable row level security;
revoke all on public.biome_profiles from anon, authenticated;
grant select on public.biome_profiles to authenticated;
grant insert (id, username) on public.biome_profiles to authenticated;
grant update (username) on public.biome_profiles to authenticated;
create policy biome_profiles_read on public.biome_profiles for select to authenticated using (true);
create policy biome_profiles_create on public.biome_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy biome_profiles_edit on public.biome_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create function public.biome_profile_timestamps() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then NEW.created_at := now(); end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
revoke all on function public.biome_profile_timestamps() from public;
create trigger biome_profile_timestamps before insert or update on public.biome_profiles for each row execute function public.biome_profile_timestamps();
comment on table public.biome_profiles is 'Biome account IDs and unique public usernames. Authentication and private email addresses remain in Supabase Auth.';
commit;
select c.relrowsecurity as row_security_enabled, (select count(*) from pg_policies where schemaname='public' and tablename='biome_profiles') as policy_count, (select indexdef from pg_indexes where schemaname='public' and indexname='biome_profiles_username_key') as unique_username_index from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='biome_profiles';
