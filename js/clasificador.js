/*
 * LÓGICA DE NEGOCIO: CLASIFICACIÓN AUTOMÁTICA
 * --------------------------------------------
 * Por ahora clasificamos con reglas simples: buscamos palabras clave en la
 * descripción. Más adelante reemplazaremos la función clasificarReclamo()
 * por una llamada a un LLM (modelo de lenguaje). Mientras devuelva el mismo
 * formato { tipo, urgencia, respuestaSugerida }, el resto de la app no cambia.
 */

// Cada tipo tiene una lista de palabras clave. Gana el tipo con más coincidencias.
const REGLAS_TIPO = [
  { tipo: "Fraude / cargo no reconocido", palabras: ["fraude", "no reconozco", "no reconocido", "robo", "robaron", "clonada", "clonaron", "suplantación", "phishing", "estafa", "hackearon"] },
  { tipo: "Cobro indebido", palabras: ["cobro", "cobraron", "comisión", "comision", "cargo", "doble", "dos veces", "interés", "interes", "mantención", "mantencion", "seguro"] },
  { tipo: "Bloqueo o acceso", palabras: ["bloqueo", "bloqueada", "bloqueado", "bloquearon", "clave", "contraseña", "acceso", "no puedo entrar", "app", "aplicación"] },
  { tipo: "Transferencias y pagos", palabras: ["transferencia", "transferí", "pago", "pagué", "abono", "depósito", "deposito", "no llegó", "no ha llegado"] },
  { tipo: "Atención al cliente", palabras: ["atención", "atencion", "ejecutivo", "sucursal", "esperé", "espera", "mal trato", "nadie responde", "no me responden"] },
];

// Palabras que indican que el caso es urgente o de prioridad media.
const PALABRAS_URGENCIA_ALTA = ["urgente", "fraude", "robo", "robaron", "clonada", "no reconozco", "estafa", "hackearon", "sin dinero", "inmediato", "suplantación"];
const PALABRAS_URGENCIA_MEDIA = ["cobro", "cobraron", "bloqueada", "bloqueado", "no puedo", "doble", "dos veces", "no llegó", "no ha llegado"];

// Plantillas de respuesta según el tipo detectado.
const PLANTILLAS = {
  "Fraude / cargo no reconocido": "hemos recibido su reporte de posibles cargos no reconocidos. Por su seguridad, recomendamos bloquear preventivamente su producto desde la app o llamando al 600 000 0000. Un analista de nuestro equipo de fraudes revisará las transacciones y le contactará dentro de 24 horas.",
  "Cobro indebido": "hemos recibido su reclamo por un cobro que considera indebido. Revisaremos el detalle de los movimientos y, si corresponde, realizaremos la reversa del cargo en un plazo máximo de 5 días hábiles.",
  "Bloqueo o acceso": "lamentamos los inconvenientes para acceder a su producto. Puede restablecer su clave desde la app o en cualquier sucursal con su cédula de identidad. Si el problema persiste, un ejecutivo le contactará para ayudarle.",
  "Transferencias y pagos": "hemos recibido su reclamo sobre una transferencia o pago. Verificaremos el estado de la operación con las entidades involucradas y le informaremos el resultado en un plazo máximo de 3 días hábiles.",
  "Atención al cliente": "lamentamos que su experiencia no haya sido la esperada. Hemos registrado sus comentarios y un supervisor revisará su caso para contactarle y buscar una solución.",
  "Consulta general": "hemos recibido su reclamo y lo derivamos al área correspondiente. Un ejecutivo revisará su caso y le contactará dentro de los próximos 5 días hábiles.",
};

// Pasa el texto a minúsculas para comparar sin importar mayúsculas.
function normalizar(texto) {
  return texto.toLowerCase();
}

function contarCoincidencias(texto, palabras) {
  return palabras.filter((palabra) => texto.includes(palabra)).length;
}

// Función principal: recibe el reclamo y devuelve su clasificación.
function clasificarReclamo(reclamo) {
  const texto = normalizar(reclamo.descripcion || "");

  // 1) Tipo: el que tenga más palabras clave encontradas.
  let tipo = "Consulta general";
  let mejorPuntaje = 0;
  for (const regla of REGLAS_TIPO) {
    const puntaje = contarCoincidencias(texto, regla.palabras);
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      tipo = regla.tipo;
    }
  }

  // 2) Urgencia: alta, media o baja.
  let urgencia = "Baja";
  if (contarCoincidencias(texto, PALABRAS_URGENCIA_ALTA) > 0) {
    urgencia = "Alta";
  } else if (contarCoincidencias(texto, PALABRAS_URGENCIA_MEDIA) > 0) {
    urgencia = "Media";
  }

  // 3) Respuesta sugerida a partir de la plantilla.
  const primerNombre = (reclamo.nombre || "").trim().split(" ")[0] || "cliente";
  const respuestaSugerida =
    `Estimado/a ${primerNombre}: en relación con su ${reclamo.producto.toLowerCase()}, ` +
    PLANTILLAS[tipo] +
    " Atentamente, Banco Andino.";

  return { tipo, urgencia, respuestaSugerida };
}
