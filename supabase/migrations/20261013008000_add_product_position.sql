alter table public.products
  add column if not exists position integer not null default 0;

comment on column public.products.position is 'Ordem do produto no Início (dentro da categoria), definida arrastando os cards no modo Organizar do admin.';

-- Mantém a ordem atual (por data de criação) como ponto de partida.
update public.products as p
set position = ordered.rn
from (select id, row_number() over (order by created_at) as rn from public.products) as ordered
where p.id = ordered.id;
