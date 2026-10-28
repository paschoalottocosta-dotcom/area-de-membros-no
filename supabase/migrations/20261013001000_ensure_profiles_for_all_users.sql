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
