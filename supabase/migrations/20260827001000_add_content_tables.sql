create table public.modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_files enable row level security;

create policy "Authenticated users can view accessible modules"
  on public.modules for select to authenticated
  using (exists (select 1 from public.user_access where user_access.user_id = auth.uid() and user_access.product_id = modules.product_id));

create policy "Authenticated users can view accessible lessons"
  on public.lessons for select to authenticated
  using (exists (select 1 from public.modules join public.user_access on user_access.product_id = modules.product_id where modules.id = lessons.module_id and user_access.user_id = auth.uid()));

create policy "Authenticated users can view accessible lesson files"
  on public.lesson_files for select to authenticated
  using (exists (select 1 from public.lessons join public.modules on modules.id = lessons.module_id join public.user_access on user_access.product_id = modules.product_id where lessons.id = lesson_files.lesson_id and user_access.user_id = auth.uid()));