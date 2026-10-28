-- Tabelas base do catálogo e dos acessos. No projeto original elas foram criadas direto no painel
-- do Supabase, por isso as migrations seguintes só adicionam colunas a elas.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_bundle boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Authenticated users can view products"
  on public.products for select to authenticated
  using (true);

create table if not exists public.user_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists user_access_product_id_idx on public.user_access(product_id);

alter table public.user_access enable row level security;

create policy "Users can view their own access"
  on public.user_access for select to authenticated
  using (auth.uid() = user_id);
