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
