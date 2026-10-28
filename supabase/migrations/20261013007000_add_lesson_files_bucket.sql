-- Bucket PRIVADO para os materiais das aulas enviados pelo admin (PDF, Word, Excel...).
-- Sem policies: o upload usa um link assinado gerado pelo servidor e o download passa por
-- /api/files/[id], que confere se o aluno tem acesso ao produto antes de liberar o arquivo.
-- Limite de 50 MB por arquivo (máximo do plano gratuito do Supabase).
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

comment on column public.lesson_files.file_url is 'Link externo (https://...) ou arquivo enviado ao bucket lesson-files, no formato storage:<caminho>.';
