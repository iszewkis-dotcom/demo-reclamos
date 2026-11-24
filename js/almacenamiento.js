/*
 * ALMACENAMIENTO
 * ---------------
 * Este archivo es la ÚNICA parte de la aplicación que sabe dónde se guardan
 * los datos. Tiene dos modos:
 *
 *   - MODO NUBE: si js/config.js tiene los datos de Supabase, los reclamos se
 *     guardan en una base de datos real en internet. Se ven desde cualquier
 *     computador o celular.
 *   - MODO LOCAL: si no, se guardan en el navegador (localStorage), como antes.
 *
 * El resto de la app llama siempre a las mismas funciones (guardarReclamo,
 * obtenerReclamos, aprobarReclamo...) sin saber qué modo se está usando.
 *
 * Las funciones son "async": hablar con internet toma tiempo, así que
 * devuelven una PROMESA y quien las usa debe esperar el resultado con "await".
 */

const MODO_NUBE = Boolean(SUPABASE_URL && SUPABASE_CLAVE_PUBLICA);

// Cliente de Supabase (la librería se carga desde internet en el HTML).
const nube = MODO_NUBE && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA)
  : null;

function revisarConexion() {
  if (MODO_NUBE && !nube) {
    throw new Error("No se pudo cargar la conexión con la base de datos. Revisa tu internet y recarga la página.");
  }
}

// Genera un identificador único (ej: "3f2a9c1e-...").
function nuevoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// En la base de datos las columnas usan_guiones_bajos; en JavaScript, camelCase.
function deFila(f) {
  return {
    id: f.id,
    fecha: f.creado_en,
    nombre: f.nombre,
    rut: f.rut,
    producto: f.producto,
    descripcion: f.descripcion,
    tipo: f.tipo,
    urgencia: f.urgencia,
    respuestaSugerida: f.respuesta_sugerida,
    estado: f.estado,
    fechaAprobacion: f.aprobado_en,
  };
}

// ---------------------------------------------------------------------------
// Reclamos
// ---------------------------------------------------------------------------

// Guarda un reclamo nuevo. Devuelve { id }.
async function guardarReclamo(datos) {
  const id = nuevoId();
  if (MODO_NUBE) {
    revisarConexion();
    const { error } = await nube.from("reclamos").insert({
      id,
      nombre: datos.nombre,
      rut: datos.rut,
      producto: datos.producto,
      descripcion: datos.descripcion,
      tipo: datos.tipo,
      urgencia: datos.urgencia,
      respuesta_sugerida: datos.respuestaSugerida,
    });
    if (error) throw new Error(error.message);
    return { id };
  }
  const reclamos = leerLocal();
  reclamos.push({ id, fecha: new Date().toISOString(), estado: "Pendiente", ...datos });
  guardarLocal(reclamos);
  return { id };
}

// Devuelve la lista de reclamos (solo el equipo de backoffice puede verlos).
async function obtenerReclamos() {
  if (MODO_NUBE) {
    revisarConexion();
    const { data, error } = await nube.from("reclamos").select("*").order("creado_en", { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(deFila);
  }
  return leerLocal();
}

// Marca un reclamo como aprobado.
async function aprobarReclamo(id) {
  const ahora = new Date().toISOString();
  if (MODO_NUBE) {
    revisarConexion();
    const { data, error } = await nube.from("reclamos")
      .update({ estado: "Aprobado", aprobado_en: ahora })
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data.length) throw new Error("No tienes permiso para aprobar este reclamo.");
    return;
  }
  const reclamos = leerLocal();
  const reclamo = reclamos.find((r) => r.id === id);
  if (reclamo) {
    reclamo.estado = "Aprobado";
    reclamo.fechaAprobacion = ahora;
    guardarLocal(reclamos);
  }
}

// Borra todo (solo en modo local; en la nube se hace desde Supabase).
async function borrarReclamos() {
  if (!MODO_NUBE) localStorage.removeItem(CLAVE_LOCAL);
}

// ---------------------------------------------------------------------------
// Sesión del backoffice (solo en modo nube)
// ---------------------------------------------------------------------------
async function sesionActual() {
  if (!MODO_NUBE) return null;
  revisarConexion();
  const { data } = await nube.auth.getSession();
  return data.session;
}

async function iniciarSesion(correo, clave) {
  revisarConexion();
  const { data, error } = await nube.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw new Error("Correo o contraseña incorrectos.");
  return data.session;
}

async function cerrarSesion() {
  if (nube) await nube.auth.signOut();
}

// ---------------------------------------------------------------------------
// Modo local (localStorage)
// ---------------------------------------------------------------------------
const CLAVE_LOCAL = "reclamos_banco";

function leerLocal() {
  try {
    const texto = localStorage.getItem(CLAVE_LOCAL);
    return texto ? JSON.parse(texto) : [];
  } catch (error) {
    console.error("No se pudieron leer los reclamos:", error);
    return [];
  }
}

function guardarLocal(reclamos) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(reclamos));
}
