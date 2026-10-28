alter table public.products
  add column yampi_product_id text;

alter table public.products
  add constraint products_yampi_product_id_key unique (yampi_product_id);

comment on column public.products.yampi_product_id is 'SKU ID da Yampi usado para casar itens do webhook com o produto do catálogo.';