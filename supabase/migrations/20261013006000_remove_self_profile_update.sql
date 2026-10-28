-- A policy permitia ao aluno alterar QUALQUER coluna do próprio perfil (inclusive is_admin,
-- unlimited_access e blocked) direto pelo navegador. A bio agora é salva pelo servidor
-- (Server Action com service_role), então o aluno não precisa mais de permissão de escrita.
drop policy if exists "Users can update their own profile" on public.profiles;
