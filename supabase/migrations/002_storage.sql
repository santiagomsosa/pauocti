-- Crear bucket para fotos del casamiento (idempotente)
insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do update set public = true;

-- Políticas (idempotentes)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'wedding-photos are publicly accessible'
  ) then
    create policy "wedding-photos are publicly accessible"
      on storage.objects for select
      using (bucket_id = 'wedding-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'service role can manage wedding-photos'
  ) then
    create policy "service role can manage wedding-photos"
      on storage.objects for all
      using (bucket_id = 'wedding-photos');
  end if;
end $$;
