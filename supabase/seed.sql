-- Solo para la base local (`supabase db reset` / primer `supabase start`).
-- Las versiones nuevas de Supabase no le dan permisos sobre las tablas de public a service_role
-- por defecto; producción sí los tiene (ver los ALTER DEFAULT PRIVILEGES del proyecto).
grant select, insert, update, delete on all tables in schema public to service_role;
