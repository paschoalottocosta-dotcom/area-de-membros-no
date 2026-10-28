alter table public.products
  add column if not exists cover_image_url text;

comment on column public.products.cover_image_url is 'URL pública da imagem de capa do produto.';

insert into storage.buckets (id, name, public)
values ('product-covers', 'product-covers', true)
on conflict (id) do update set public = true;