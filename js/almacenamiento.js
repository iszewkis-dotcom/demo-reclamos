/*
 * ALMACENAMIENTO
 * ---------------
 * Este archivo es la ÚNICA parte de la aplicación que sabe dónde se guardan
 * los datos. Hoy usamos localStorage (una pequeña "bodega" dentro del
 * navegador). Cuando tengamos una base de datos real, solo habrá que cambiar
 * este archivo: el resto de la aplicación seguirá llamando a las mismas
 * funciones (obtenerReclamos, guardarReclamo, aprobarReclamo...).
 */

const CLAVE_ALMACENAMIENTO = "reclamos_banco";

// Devuelve la lista de reclamos guardados (o una lista vacía si no hay).
function obtenerReclamos() {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    return texto ? JSON.parse(texto) : [];
  } catch (error) {
    console.error("No se pudieron leer los reclamos:", error);
    return [];
  }
}

// Guarda la lista completa. localStorage solo guarda texto, por eso usamos JSON.
function guardarTodos(reclamos) {
  localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(reclamos));
}

// Agrega un reclamo nuevo y lo devuelve con su id y fecha.
function guardarReclamo(datos) {
  const reclamos = obtenerReclamos();
  const nuevo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fecha: new Date().toISOString(),
    estado: "Pendiente",
    ...datos,
  };
  reclamos.push(nuevo);
  guardarTodos(reclamos);
  return nuevo;
}

// Marca un reclamo como aprobado.
function aprobarReclamo(id) {
  const reclamos = obtenerReclamos();
  const reclamo = reclamos.find((r) => r.id === id);
  if (reclamo) {
    reclamo.estado = "Aprobado";
    reclamo.fechaAprobacion = new Date().toISOString();
    guardarTodos(reclamos);
  }
}

// Elimina todos los reclamos (útil para empezar de cero en la demo).
function borrarReclamos() {
  localStorage.removeItem(CLAVE_ALMACENAMIENTO);
}
