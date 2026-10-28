create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Configurações gerais da área de membros editadas no painel /admin/settings (ex.: terms_html = texto dos Termos de uso).';

-- Sem políticas: leitura e escrita só pelo servidor (service_role).
alter table public.app_settings enable row level security;
