-- Rate limits shared by every server instance. Keys are hashed by the app (never raw IPs
-- or addresses). Only the service role can call this.
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Counts one hit for `bucket` in the current fixed window and says whether it is allowed.
create function public.rate_limit_hit(bucket text, max_hits integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  n integer;
begin
  if bucket is null or char_length(bucket) > 200 or max_hits < 1 or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit.';
  end if;
  insert into private.rate_limits (key, window_start, hits) values (bucket, w, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  -- Occasional cleanup of finished windows.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= max_hits;
end $$;
revoke all on private.rate_limits from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
