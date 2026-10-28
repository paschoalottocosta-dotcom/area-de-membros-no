alter table public.products
  add column if not exists onboarding_html text;

comment on column public.products.onboarding_html is 'Texto de onboarding do produto (HTML do editor do admin). Ainda não é exibido ao aluno.';

alter table public.lesson_files
  add column if not exists position integer not null default 0;

comment on column public.lesson_files.position is 'Ordem do arquivo dentro da aula.';
