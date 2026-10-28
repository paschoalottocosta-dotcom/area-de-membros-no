alter table public.profiles
  add column blocked boolean not null default false,
  add column unlimited_access boolean not null default false;

alter table public.user_access
  add column status text not null default 'active',
  add constraint user_access_status_check check (status in ('active', 'disabled'));