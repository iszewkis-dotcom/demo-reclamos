/*
 * PÁGINA "INGRESAR RECLAMO"
 * --------------------------
 * Lee lo que escribe el usuario, valida los campos y guarda el reclamo.
 */

const formulario = document.getElementById("formulario-reclamo");
const confirmacion = document.getElementById("confirmacion");

// Valida un RUT chileno calculando su dígito verificador (algoritmo módulo 11).
function rutEsValido(rut) {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

// Da formato 12.345.678-5 al RUT.
function formatearRut(rut) {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${limpio.slice(-1)}`;
}

function mostrarError(campo, mensaje) {
  document.getElementById(`error-${campo}`).textContent = mensaje;
  document.getElementById(campo).classList.toggle("invalido", Boolean(mensaje));
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault(); // Evita que el navegador recargue la página.

  const datos = {
    nombre: formulario.nombre.value.trim(),
    rut: formulario.rut.value.trim(),
    producto: formulario.producto.value,
    descripcion: formulario.descripcion.value.trim(),
  };

  // Validaciones simples
  let hayErrores = false;
  const validar = (campo, condicion, mensaje) => {
    mostrarError(campo, condicion ? "" : mensaje);
    if (!condicion) hayErrores = true;
  };
  validar("nombre", datos.nombre.length >= 3, "Ingresa tu nombre completo.");
  validar("rut", rutEsValido(datos.rut), "Ingresa un RUT válido (ej: 12.345.678-5).");
  validar("producto", datos.producto !== "", "Selecciona un producto.");
  validar("descripcion", datos.descripcion.length >= 10, "Describe tu reclamo (mínimo 10 caracteres).");
  if (hayErrores) return;

  datos.rut = formatearRut(datos.rut);

  // Clasificamos y guardamos.
  const clasificacion = clasificarReclamo(datos);
  const reclamo = guardarReclamo({ ...datos, ...clasificacion });

  formulario.reset();
  confirmacion.hidden = false;
  confirmacion.innerHTML =
    `<strong>¡Reclamo recibido!</strong> Tu número de seguimiento es ` +
    `<code>${reclamo.id.toUpperCase()}</code>. Te contactaremos pronto.`;
});
