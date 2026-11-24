# Demo Reclamos · Banco Andino (ficticio)

Aplicación web simple para ingresar y gestionar reclamos de clientes de un banco ficticio.
Hecha con **HTML, CSS y JavaScript**, con base de datos en la nube (**Supabase**).

## Páginas

- **`index.html` – Ingresar reclamo:** formulario con nombre, RUT, producto y descripción.
- **`backoffice.html` – Backoffice:** tabla con todos los reclamos, clasificación automática
  (tipo y urgencia), respuesta sugerida y botón "Aprobar". Pide usuario y contraseña.

## Estructura

| Archivo | Qué hace | Concepto |
|---|---|---|
| `index.html`, `backoffice.html` | Estructura de cada página | Frontend (estructura) |
| `css/estilos.css` | Colores, tipografía y diseño | Frontend (presentación) |
| `js/formulario.js` | Valida y envía el formulario | Frontend (interacción) |
| `js/backoffice.js` | Inicio de sesión, tabla y botón Aprobar | Frontend (interacción) |
| `js/clasificador.js` | Reglas de palabras clave para tipo, urgencia y respuesta | Lógica de negocio |
| `js/config.js` | Dirección y clave pública de Supabase | Configuración |
| `js/almacenamiento.js` | Lee y guarda reclamos (Supabase o, si no está configurado, el navegador) | Almacenamiento / datos |
| `supabase/esquema.sql` | Crea la tabla de reclamos y las reglas de seguridad | Base de datos |

## Modo local y modo nube

- **Modo local** (si `js/config.js` está vacío): los reclamos se guardan solo en tu navegador.
- **Modo nube** (con Supabase configurado): los reclamos se guardan en una base de datos real.
  Se pueden ingresar desde un celular y aprobar desde un computador.

## Guía: conectar Supabase (una sola vez)

1. **Crear el proyecto.** Entra a [supabase.com](https://supabase.com), crea una cuenta gratis
   (puedes usar "Continue with GitHub") y pulsa **New project**:
   - Name: `demo-reclamos` · Region: la más cercana (por ejemplo *South America (São Paulo)*).
   - Inventa una contraseña para la base de datos y guárdala (no la necesitaremos en la página).
2. **Crear la tabla y las reglas.** En el menú izquierdo abre **SQL Editor** → **New query**,
   pega todo el contenido de `supabase/esquema.sql` y pulsa **Run**. Debe decir *Success*.
3. **Crear tu usuario del backoffice.** Ve a **Authentication → Users → Add user → Create new user**,
   escribe tu correo y una contraseña, y marca **Auto Confirm User**.
4. **Agregarte al equipo.** Vuelve al **SQL Editor** y ejecuta (con tu correo):
   ```sql
   insert into public.equipo_backoffice (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com';
   ```
5. **Cerrar el registro público.** En **Authentication → Sign In / Providers**, desactiva
   **Allow new users to sign up**. (Aunque alguien cree una cuenta, igual no podría ver los
   reclamos sin estar en el equipo; esto es una protección extra.)
6. **Conectar la página.** En **Project Settings → API Keys** copia la **Publishable key**
   (o la *anon public* si ves claves antiguas), y en **Project Settings → Data API** copia la
   **Project URL**. Pégalas en `js/config.js` y sube el número `?v=` en los HTML.

> 🔒 **¿Es seguro poner la clave en la página?** Sí: la clave *publishable/anon* está hecha para ser
> pública. La seguridad la dan las reglas de `esquema.sql` (RLS): los visitantes solo pueden *enviar*
> reclamos; para verlos o aprobarlos hay que iniciar sesión y estar en el equipo.
> ⚠️ **Nunca** pongas la clave *secret* / *service_role* en la página ni la compartas.

## Cómo probarla en tu computador

Desde la carpeta del repositorio ejecuta `python3 -m http.server` y abre `http://localhost:8000`.

## Publicar en GitHub Pages

En el repositorio: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

## Próximos pasos

- Reemplazar `clasificarReclamo()` en `js/clasificador.js` por una llamada a un LLM.
