-- Logo da área de membros enviada em /admin/settings (aparece no menu, login, e-mails e ícone da aba).
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

-- Histórico das compras recebidas pelo webhook da Yampi, exibido em /admin/settings.
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null check (status in ('liberado', 'alerta', 'erro', 'ignorado', 'recusado')),
  email text,
  message text not null
);

create index if not exists webhook_logs_created_at_idx on public.webhook_logs (created_at desc);

comment on table public.webhook_logs is 'Registro de cada chamada ao webhook da Yampi (liberado, alerta, erro, ignorado ou recusado).';

-- Sem políticas: leitura e escrita só pelo servidor (service_role).
alter table public.webhook_logs enable row level security;
