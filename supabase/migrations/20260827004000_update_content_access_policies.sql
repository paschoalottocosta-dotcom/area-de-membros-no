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