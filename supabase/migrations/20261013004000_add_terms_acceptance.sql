alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_accepted_at is 'Data em que o aluno leu e aceitou os Termos e condições de uso (pop-up do primeiro acesso). Nulo = ainda não aceitou.';
