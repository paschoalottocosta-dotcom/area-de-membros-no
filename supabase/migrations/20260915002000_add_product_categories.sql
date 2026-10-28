create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Authenticated users can view categories"
  on public.categories for select to authenticated
  using (true);

alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists categories_position_idx on public.categories(position);
create index if not exists products_category_id_idx on public.products(category_id);