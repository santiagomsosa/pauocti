-- Elimina desafíos duplicados, conservando el registro más antiguo de cada título
delete from public.challenges
where id not in (
  select min(id)
  from public.challenges
  group by title
);

-- Garantiza que no se puedan insertar duplicados en el futuro
alter table public.challenges
  add constraint challenges_title_unique unique (title);
