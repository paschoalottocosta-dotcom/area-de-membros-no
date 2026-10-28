-- SETUP COMPLETO DE UM PROJETO SUPABASE NOVO (gerado juntando supabase/migrations em ordem).
-- Rode UMA vez só, inteiro, no SQL Editor de um projeto vazio.

-- ===== migrations/20260826000000_create_products_and_user_access.sql =====
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


-- ===== migrations/20260827000000_add_yampi_product_id_to_products.sql =====
alter table public.products
  add column yampi_product_id text;

alter table public.products
  add constraint products_yampi_product_id_key unique (yampi_product_id);

comment on column public.products.yampi_product_id is 'SKU ID da Yampi usado para casar itens do webhook com o produto do catálogo.';

-- ===== migrations/20260827001000_add_content_tables.sql =====
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

-- ===== migrations/20260827002000_add_profiles.sql =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

-- ===== migrations/20260827003000_add_member_access_controls.sql =====
alter table public.profiles
  add column blocked boolean not null default false,
  add column unlimited_access boolean not null default false;

alter table public.user_access
  add column status text not null default 'active',
  add constraint user_access_status_check check (status in ('active', 'disabled'));

-- ===== migrations/20260827004000_update_content_access_policies.sql =====
drop policy "Authenticated users can view accessible modules" on public.modules;
drop policy "Authenticated users can view accessible lessons" on public.lessons;
drop policy "Authenticated users can view accessible lesson files" on public.lesson_files;

create policy "Authenticated users can view accessible modules"
  on public.modules for select to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.blocked = false
        and profiles.unlimited_access = true
    )
    or exists (
      select 1
      from public.profiles
      join public.user_access on user_access.user_id = profiles.id
      where profiles.id = auth.uid()
        and profiles.blocked = false
        and user_access.product_id = modules.product_id
        and user_access.status = 'active'
    )
  );

create policy "Authenticated users can view accessible lessons"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1
      from public.modules
      where modules.id = lessons.module_id
        and exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.blocked = false and profiles.unlimited_access = true
        )
    )
    or exists (
      select 1
      from public.modules
      join public.profiles on profiles.id = auth.uid()
      join public.user_access on user_access.product_id = modules.product_id and user_access.user_id = profiles.id
      where modules.id = lessons.module_id
        and profiles.blocked = false
        and user_access.status = 'active'
    )
  );

create policy "Authenticated users can view accessible lesson files"
  on public.lesson_files for select to authenticated
  using (
    exists (
      select 1
      from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.profiles on profiles.id = auth.uid()
      where lessons.id = lesson_files.lesson_id
        and profiles.blocked = false
        and profiles.unlimited_access = true
    )
    or exists (
      select 1
      from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.profiles on profiles.id = auth.uid()
      join public.user_access on user_access.product_id = modules.product_id and user_access.user_id = profiles.id
      where lessons.id = lesson_files.lesson_id
        and profiles.blocked = false
        and user_access.status = 'active'
    )
  );

-- ===== migrations/20260827005000_add_product_visibility_and_sales_url.sql =====
alter table public.products
  add column if not exists is_visible boolean not null default true;

alter table public.products
  add column if not exists sales_url text;

comment on column public.products.is_visible is 'Indica se o produto aparece na vitrine para clientes sem acesso.';
comment on column public.products.sales_url is 'URL para a página de vendas do produto.';


-- ===== migrations/20260915000000_add_product_covers.sql =====
alter table public.products
  add column if not exists cover_image_url text;

comment on column public.products.cover_image_url is 'URL pública da imagem de capa do produto.';

insert into storage.buckets (id, name, public)
values ('product-covers', 'product-covers', true)
on conflict (id) do update set public = true;

-- ===== migrations/20260915001000_add_profile_bio.sql =====
alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is 'Texto biográfico escrito pelo próprio usuário.';

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===== migrations/20260915002000_add_product_categories.sql =====
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

-- ===== migrations/20261013000000_add_lesson_progress.sql =====
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

comment on table public.lesson_progress is 'Aulas marcadas como concluídas por cada aluno.';

alter table public.lesson_progress enable row level security;

create policy "Users can view their own lesson progress"
  on public.lesson_progress for select to authenticated
  using (auth.uid() = user_id);


-- ===== migrations/20261013001000_ensure_profiles_for_all_users.sql =====
-- As policies de módulos/aulas/arquivos exigem uma linha em profiles para o aluno.
-- Usuários criados sem perfil (ex.: direto no painel do Supabase) ficavam sem ver as aulas.

-- 1) Cria o perfil que estiver faltando para usuários já existentes.
insert into public.profiles (id)
select users.id from auth.users as users
where not exists (select 1 from public.profiles where profiles.id = users.id);

-- 2) Daqui para frente, todo usuário novo ganha um perfil automaticamente.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();


-- ===== migrations/20261013002000_add_combos.sql =====
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


-- ===== migrations/20261013003000_add_onboarding_and_file_positions.sql =====
alter table public.products
  add column if not exists onboarding_html text;

comment on column public.products.onboarding_html is 'Texto de onboarding do produto (HTML do editor do admin). Ainda não é exibido ao aluno.';

alter table public.lesson_files
  add column if not exists position integer not null default 0;

comment on column public.lesson_files.position is 'Ordem do arquivo dentro da aula.';


-- ===== migrations/20261013004000_add_terms_acceptance.sql =====
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_accepted_at is 'Data em que o aluno leu e aceitou os Termos e condições de uso (pop-up do primeiro acesso). Nulo = ainda não aceitou.';


-- ===== migrations/20261013005000_add_app_settings.sql =====
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Configurações gerais da área de membros editadas no painel /admin/settings (ex.: terms_html = texto dos Termos de uso).';

-- Sem políticas: leitura e escrita só pelo servidor (service_role).
alter table public.app_settings enable row level security;


-- ===== migrations/20261013006000_remove_self_profile_update.sql =====
-- A policy permitia ao aluno alterar QUALQUER coluna do próprio perfil (inclusive is_admin,
-- unlimited_access e blocked) direto pelo navegador. A bio agora é salva pelo servidor
-- (Server Action com service_role), então o aluno não precisa mais de permissão de escrita.
drop policy if exists "Users can update their own profile" on public.profiles;


-- ===== migrations/20261013007000_add_lesson_files_bucket.sql =====
-- Bucket PRIVADO para os materiais das aulas enviados pelo admin (PDF, Word, Excel...).
-- Sem policies: o upload usa um link assinado gerado pelo servidor e o download passa por
-- /api/files/[id], que confere se o aluno tem acesso ao produto antes de liberar o arquivo.
-- Limite de 50 MB por arquivo (máximo do plano gratuito do Supabase).
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

comment on column public.lesson_files.file_url is 'Link externo (https://...) ou arquivo enviado ao bucket lesson-files, no formato storage:<caminho>.';


-- ===== migrations/20261013008000_add_product_position.sql =====
alter table public.products
  add column if not exists position integer not null default 0;

comment on column public.products.position is 'Ordem do produto no Início (dentro da categoria), definida arrastando os cards no modo Organizar do admin.';

-- Mantém a ordem atual (por data de criação) como ponto de partida.
update public.products as p
set position = ordered.rn
from (select id, row_number() over (order by created_at) as rn from public.products) as ordered
where p.id = ordered.id;


-- ===== migrations/20261017000000_add_branding_and_webhook_logs.sql =====
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

