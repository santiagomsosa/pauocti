-- Texto opcional que escribe el invitado al subir una foto; se muestra en la polaroid de la galería.
alter table public.photos add column if not exists caption text;
