/*
 * PÁGINA "BACKOFFICE"
 * --------------------
 * Muestra todos los reclamos en una tabla y permite aprobarlos.
 */

const cuerpoTabla = document.getElementById("cuerpo-tabla");
const mensajeVacio = document.getElementById("sin-reclamos");
const resumen = document.getElementById("resumen");

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

function mostrarTabla() {
  const reclamos = obtenerReclamos().sort((a, b) =>
    ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia] || b.fecha.localeCompare(a.fecha)
  );

  mostrarResumen(reclamos);
  mensajeVacio.hidden = reclamos.length > 0;

  cuerpoTabla.innerHTML = reclamos.map((r) => `
    <tr class="${r.estado === "Aprobado" ? "fila--aprobada" : ""}">
      <td class="nowrap">${formatearFecha(r.fecha)}</td>
      <td><strong>${escaparHtml(r.nombre)}</strong><br><span class="tenue">${escaparHtml(r.rut)}</span></td>
      <td>${escaparHtml(r.producto)}</td>
      <td class="texto-largo">${escaparHtml(r.descripcion)}</td>
      <td>
        <span class="etiqueta">${escaparHtml(r.tipo)}</span><br>
        <span class="urgencia urgencia--${r.urgencia.toLowerCase()}">Urgencia ${r.urgencia.toLowerCase()}</span>
      </td>
      <td class="texto-largo respuesta">${escaparHtml(r.respuestaSugerida)}</td>
      <td>
        ${r.estado === "Aprobado"
          ? `<span class="estado-aprobado">✓ Aprobado</span>`
          : `<button class="boton boton--primario boton--chico" data-id="${r.id}">Aprobar</button>`}
      </td>
    </tr>`).join("");
}

// Un solo "escuchador" para todos los botones Aprobar de la tabla.
cuerpoTabla.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-id]");
  if (!boton) return;
  aprobarReclamo(boton.dataset.id);
  mostrarTabla();
});

document.getElementById("borrar-todo").addEventListener("click", () => {
  if (confirm("¿Seguro que quieres borrar todos los reclamos de este navegador?")) {
    borrarReclamos();
    mostrarTabla();
  }
});

// Datos de ejemplo para probar rápidamente la clasificación.
const EJEMPLOS = [
  { nombre: "María González", rut: "12.345.678-5", producto: "Tarjeta de crédito", descripcion: "Aparecen compras en el extranjero que no reconozco. Creo que mi tarjeta fue clonada, es urgente." },
  { nombre: "Juan Pérez", rut: "11.111.111-1", producto: "Cuenta corriente", descripcion: "Me cobraron dos veces la comisión de mantención este mes." },
  { nombre: "Camila Rojas", rut: "9.876.543-3", producto: "Crédito de consumo", descripcion: "Hice el pago de la cuota hace una semana y todavía no ha llegado el abono a mi crédito." },
  { nombre: "Pedro Soto", rut: "7.654.321-6", producto: "Cuenta corriente", descripcion: "Fui a la sucursal y esperé más de una hora, el ejecutivo no me supo dar una solución." },
];

document.getElementById("cargar-ejemplos").addEventListener("click", () => {
  EJEMPLOS.forEach((ejemplo) => guardarReclamo({ ...ejemplo, ...clasificarReclamo(ejemplo) }));
  mostrarTabla();
});

mostrarTabla();
