/*
 * CONFIGURACIÓN DE LA BASE DE DATOS (Supabase)
 * ---------------------------------------------
 * Si estos dos valores están vacíos, la app funciona en "modo local":
 * los reclamos se guardan solo en el navegador (como antes).
 *
 * Para conectar Supabase, copia aquí los datos de tu proyecto:
 *   Supabase > Project Settings > API Keys (o Data API).
 *
 * La clave PUBLICABLE ("publishable" o "anon public") está hecha para ir en
 * páginas web: la seguridad la dan las reglas de la base de datos (RLS).
 * ⚠️ NUNCA pongas aquí la clave "secret" ni la "service_role".
 */
const SUPABASE_URL = "";            // ej: "https://abcdefghijkl.supabase.co"
const SUPABASE_CLAVE_PUBLICA = "";  // ej: "sb_publishable_..." o "eyJhbGciOi..."
