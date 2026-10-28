alter table public.products
  add column if not exists is_visible boolean not null default true;

alter table public.products
  add column if not exists sales_url text;

comment on column public.products.is_visible is 'Indica se o produto aparece na vitrine para clientes sem acesso.';
comment on column public.products.sales_url is 'URL para a página de vendas do produto.';
