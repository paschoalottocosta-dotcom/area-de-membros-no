create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  yampi_product_id text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.combos is 'Combos vendidos na Yampi como um único produto (SKU) que liberam vários produtos da área.';
comment on column public.combos.yampi_product_id is 'SKU ID do produto do combo na Yampi.';

create table if not exists public.combo_items (
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (combo_id, product_id)
);

comment on table public.combo_items is 'Produtos liberados por cada combo.';

-- Sem políticas: só o service_role (Server Actions do admin e webhook) lê e escreve.
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
