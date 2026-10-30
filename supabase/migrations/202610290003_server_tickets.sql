-- Single-use, audience-bound server join proofs. Never expose account bearer tokens to servers.
create table if not exists public.biome_server_tickets (
 ticket_hash text primary key check(ticket_hash ~ '^[0-9a-f]{64}$'),
 player_id uuid not null references auth.users(id) on delete cascade,
 audience text not null check(length(audience)=95),
 expires_at timestamptz not null default now()+interval '60 seconds'
);
alter table public.biome_server_tickets enable row level security;
revoke all on public.biome_server_tickets from anon,authenticated;
create index if not exists biome_ticket_expiry on public.biome_server_tickets(expires_at);
create or replace function public.biome_create_server_ticket(ticket_hash text,server_fingerprint text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if ticket_hash is null or server_fingerprint is null or ticket_hash !~ '^[0-9a-f]{64}$' or server_fingerprint !~ '^([0-9A-F]{2}:){31}[0-9A-F]{2}$' then raise exception 'Invalid ticket';end if;
 delete from public.biome_server_tickets where expires_at<now();
 -- Serializes the per-player outstanding ticket bound, including concurrent requests.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,4108));
 if (select count(*) from public.biome_server_tickets where player_id=auth.uid())>=10 then raise exception 'Wait a minute before joining again';end if;
 insert into public.biome_server_tickets(ticket_hash,player_id,audience)values(biome_create_server_ticket.ticket_hash,auth.uid(),server_fingerprint);
end;$$;
create or replace function public.biome_redeem_server_ticket(ticket_hash text,server_fingerprint text)
returns table(id uuid,username text) language sql security definer set search_path='' as $$
 with redeemed as (
  delete from public.biome_server_tickets t where t.ticket_hash=biome_redeem_server_ticket.ticket_hash and t.audience=server_fingerprint and t.expires_at>now() returning t.player_id
 ) select p.id,p.username from redeemed r join public.biome_profiles p on p.id=r.player_id;
$$;
revoke all on function public.biome_create_server_ticket(text,text) from public,anon;
grant execute on function public.biome_create_server_ticket(text,text) to authenticated;
revoke all on function public.biome_redeem_server_ticket(text,text) from public;
grant execute on function public.biome_redeem_server_ticket(text,text) to anon,authenticated;
select 'Single-use server tickets installed' as result;
