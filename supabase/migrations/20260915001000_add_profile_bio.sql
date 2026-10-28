alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is 'Texto biográfico escrito pelo próprio usuário.';

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);