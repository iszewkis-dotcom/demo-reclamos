-- =============================================================================
-- BASE DE DATOS DE LA APP DE RECLAMOS (Supabase / PostgreSQL)
-- =============================================================================
-- Cómo usarlo: en Supabase, abre "SQL Editor", pega TODO este archivo y
-- presiona "Run". Se puede ejecutar más de una vez sin problemas.
--
-- Reglas de seguridad (RLS = Row Level Security):
--   * Cualquier persona (sin iniciar sesión) puede ENVIAR un reclamo nuevo,
--     pero no puede leer ni modificar los reclamos de otros.
--   * Solo las personas del equipo de backoffice (usuarios con sesión iniciada
--     y registrados en la tabla equipo_backoffice) pueden VER y APROBAR reclamos.
-- =============================================================================

-- 1) Tabla de reclamos ---------------------------------------------------------
create table if not exists public.reclamos (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  nombre             text not null check (char_length(nombre) between 3 and 120),
  rut                text not null check (char_length(rut) between 9 and 12),
  producto           text not null check (producto in ('Tarjeta de crédito', 'Cuenta corriente', 'Crédito de consumo')),
  descripcion        text not null check (char_length(descripcion) between 10 and 3000),
  tipo               text not null check (char_length(tipo) <= 60),
  urgencia           text not null check (urgencia in ('Alta', 'Media', 'Baja')),
  respuesta_sugerida text not null check (char_length(respuesta_sugerida) <= 2000),
  estado             text not null default 'Pendiente' check (estado in ('Pendiente', 'Aprobado')),
  aprobado_en        timestamptz
);

-- 2) Equipo de backoffice: quiénes pueden ver y aprobar reclamos -------------
create table if not exists public.equipo_backoffice (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- 3) Activar la seguridad por filas (sin reglas = nadie puede hacer nada) -----
alter table public.reclamos enable row level security;
alter table public.equipo_backoffice enable row level security;

-- 4) Función que responde: ¿la persona con sesión iniciada es del equipo? ----
--    "security definer" le permite revisar la tabla equipo_backoffice, que
--    nadie puede leer directamente desde la página web.
create or replace function public.es_backoffice()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.equipo_backoffice where user_id = auth.uid());
$$;

-- 5) Permisos básicos por tipo de usuario ------------------------------------
--    anon          = visitante sin sesión (el cliente que llena el formulario)
--    authenticated = usuario con sesión iniciada
revoke all on public.reclamos from anon, authenticated;
revoke all on public.equipo_backoffice from anon, authenticated;
grant insert on public.reclamos to anon, authenticated;
grant select, update on public.reclamos to authenticated;

-- 6) Reglas (políticas) -------------------------------------------------------
drop policy if exists "clientes_envian_reclamos" on public.reclamos;
drop policy if exists "backoffice_ve_reclamos" on public.reclamos;
drop policy if exists "backoffice_aprueba_reclamos" on public.reclamos;

-- Cualquiera puede enviar un reclamo, pero solo como "Pendiente".
create policy "clientes_envian_reclamos" on public.reclamos
  for insert to anon, authenticated
  with check (estado = 'Pendiente' and aprobado_en is null);

-- Solo el equipo de backoffice puede ver los reclamos.
create policy "backoffice_ve_reclamos" on public.reclamos
  for select to authenticated
  using (public.es_backoffice());

-- Solo el equipo de backoffice puede aprobar (modificar) reclamos.
create policy "backoffice_aprueba_reclamos" on public.reclamos
  for update to authenticated
  using (public.es_backoffice())
  with check (public.es_backoffice());

-- =============================================================================
-- DESPUÉS de crear tu usuario en Authentication > Users, agrégalo al equipo
-- ejecutando esto (cambia el correo por el tuyo):
--
--   insert into public.equipo_backoffice (user_id)
--   select id from auth.users where email = 'tu-correo@ejemplo.com';
-- =============================================================================
