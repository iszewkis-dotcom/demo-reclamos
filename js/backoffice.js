/*
 * PÁGINA "BACKOFFICE"
 * --------------------
 * Muestra todos los reclamos en una tabla y permite aprobarlos.
 * Si la app está conectada a Supabase (modo nube), primero pide iniciar sesión.
 */

const cuerpoTabla = document.getElementById("cuerpo-tabla");
const mensajeVacio = document.getElementById("sin-reclamos");
const errorTabla = document.getElementById("error-tabla");
const resumen = document.getElementById("resumen");
const seccionLogin = document.getElementById("seccion-login");
const contenido = document.getElementById("contenido");

// Evita que texto escrito por usuarios se interprete como HTML (seguridad básica).
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

// Ordena: primero urgencia alta, luego los más recientes.
const ORDEN_URGENCIA = { Alta: 0, Media: 1, Baja: 2 };

function mostrarResumen(reclamos) {
  const pendientes = reclamos.filter((r) => r.estado === "Pendiente").length;
  const urgentes = reclamos.filter((r) => r.urgencia === "Alta" && r.estado === "Pendiente").length;
  const aprobados = reclamos.length - pendientes;
  resumen.innerHTML = `
    <div class="indicador"><span>Total</span><strong>${reclamos.length}</strong></div>
    <div class="indicador"><span>Pendientes</span><strong>${pendientes}</strong></div>
    <div class="indicador indicador--alerta"><span>Urgentes pendientes</span><strong>${urgentes}</strong></div>
    <div class="indicador indicador--ok"><span>Aprobados</span><strong>${aprobados}</strong></div>`;
}

async function mostrarTabla() {
  errorTabla.hidden = true;
  let reclamos;
  try {
    reclamos = await obtenerReclamos();
  } catch (error) {
    console.error(error);
    errorTabla.hidden = false;
    errorTabla.textContent = "No se pudieron cargar los reclamos: " + error.message;
    return;
  }
  reclamos.sort((a, b) =>
    ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia] || b.fecha.localeCompare(a.fecha)
  );

  mostrarResumen(reclamos);
  mensajeVacio.hidden = reclamos.length > 0;
  if (MODO_NUBE && reclamos.length === 0) {
    mensajeVacio.textContent = "Aún no hay reclamos. Si sabes que hay reclamos ingresados, revisa que tu " +
      "usuario esté agregado al equipo de backoffice (paso 4 de la guía de Supabase).";
  }

  cuerpoTabla.innerHTML = reclamos.map((r) => `
    <tr class="${r.estado === "Aprobado" ? "fila--aprobada" : ""}">
      <td class="nowrap">${formatearFecha(r.fecha)}</td>
      <td><strong>${escaparHtml(r.nombre)}</strong><br><span class="tenue">${escaparHtml(r.rut)}</span></td>
      <td>${escaparHtml(r.producto)}</td>
      <td class="texto-largo">${escaparHtml(r.descripcion)}</td>
      <td>
        <span class="etiqueta">${escaparHtml(r.tipo)}</span><br>
        <span class="urgencia urgencia--${escaparHtml(r.urgencia.toLowerCase())}">Urgencia ${escaparHtml(r.urgencia.toLowerCase())}</span>
      </td>
      <td class="texto-largo respuesta">${escaparHtml(r.respuestaSugerida)}</td>
      <td>
        ${r.estado === "Aprobado"
          ? `<span class="estado-aprobado">✓ Aprobado</span>`
          : `<button class="boton boton--primario boton--chico" data-id="${escaparHtml(r.id)}">Aprobar</button>`}
      </td>
    </tr>`).join("");
}

// Un solo "escuchador" para todos los botones Aprobar de la tabla.
cuerpoTabla.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-id]");
  if (!boton) return;
  boton.disabled = true;
  boton.textContent = "Aprobando…";
  try {
    await aprobarReclamo(boton.dataset.id);
    await mostrarTabla();
  } catch (error) {
    alert("No se pudo aprobar: " + error.message);
    boton.disabled = false;
    boton.textContent = "Aprobar";
  }
});

document.getElementById("borrar-todo").addEventListener("click", async () => {
  if (confirm("¿Seguro que quieres borrar todos los reclamos de este navegador?")) {
    await borrarReclamos();
    await mostrarTabla();
  }
});

// Datos de ejemplo para probar rápidamente la clasificación.
const EJEMPLOS = [
  { nombre: "María González", rut: "12.345.678-5", producto: "Tarjeta de crédito", descripcion: "Aparecen compras en el extranjero que no reconozco. Creo que mi tarjeta fue clonada, es urgente." },
  { nombre: "Juan Pérez", rut: "11.111.111-1", producto: "Cuenta corriente", descripcion: "Me cobraron dos veces la comisión de mantención este mes." },
  { nombre: "Camila Rojas", rut: "9.876.543-3", producto: "Crédito de consumo", descripcion: "Hice el pago de la cuota hace una semana y todavía no ha llegado el abono a mi crédito." },
  { nombre: "Pedro Soto", rut: "7.654.321-6", producto: "Cuenta corriente", descripcion: "Fui a la sucursal y esperé más de una hora, el ejecutivo no me supo dar una solución." },
];

document.getElementById("cargar-ejemplos").addEventListener("click", async (evento) => {
  const boton = evento.currentTarget;
  boton.disabled = true;
  try {
    for (const ejemplo of EJEMPLOS) {
      await guardarReclamo({ ...ejemplo, ...clasificarReclamo(ejemplo) });
    }
  } catch (error) {
    alert("No se pudieron cargar los ejemplos: " + error.message);
  }
  boton.disabled = false;
  await mostrarTabla();
});

// ---------------------------------------------------------------------------
// Inicio de sesión (modo nube)
// ---------------------------------------------------------------------------
function mostrarContenido(correo) {
  seccionLogin.hidden = true;
  contenido.hidden = false;
  const usuario = document.getElementById("usuario");
  usuario.hidden = !correo;
  usuario.textContent = correo || "";
  document.getElementById("cerrar-sesion").hidden = !MODO_NUBE;
  document.getElementById("borrar-todo").hidden = MODO_NUBE;
}

function mostrarLogin() {
  contenido.hidden = true;
  seccionLogin.hidden = false;
  document.getElementById("correo").focus();
}

document.getElementById("formulario-login").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const errorLogin = document.getElementById("error-login");
  const boton = evento.target.querySelector("button");
  errorLogin.hidden = true;
  boton.disabled = true;
  try {
    const sesion = await iniciarSesion(
      document.getElementById("correo").value.trim(),
      document.getElementById("clave").value
    );
    document.getElementById("clave").value = "";
    mostrarContenido(sesion.user.email);
    await mostrarTabla();
  } catch (error) {
    errorLogin.hidden = false;
    errorLogin.textContent = error.message;
  }
  boton.disabled = false;
});

document.getElementById("cerrar-sesion").addEventListener("click", async () => {
  await cerrarSesion();
  cuerpoTabla.innerHTML = "";
  mostrarLogin();
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
async function iniciar() {
  const aviso = document.getElementById("aviso-modo");
  if (!MODO_NUBE) {
    aviso.hidden = false;
    aviso.textContent = "Modo local: los reclamos se guardan solo en este navegador. " +
      "Para usar la base de datos en la nube, completa js/config.js (ver la guía de Supabase en el README).";
    mostrarContenido(null);
    await mostrarTabla();
    return;
  }
  try {
    const sesion = await sesionActual();
    if (!sesion) return mostrarLogin();
    mostrarContenido(sesion.user.email);
    await mostrarTabla();
  } catch (error) {
    aviso.hidden = false;
    aviso.className = "aviso aviso--error";
    aviso.textContent = error.message;
  }
}

iniciar();
