-- Accounts that existed in auth.users before the profiles trigger was installed have no
-- profile, which the app needs to open the dashboard. Create the missing ones.
insert into public.profiles (id, email, full_name)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
