-- Public bucket for company logos. Only the app's server writes to it (service role, after
-- checking the caller is an admin of the company); anyone can read a logo by its URL, which
-- is what lets simulation emails show it. Images only, at most 512 KB. Additive only.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('branding', 'branding', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
