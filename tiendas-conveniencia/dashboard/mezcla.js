/*
 * PESTAÑA "MEZCLA POR TIENDA" (gráfico Marimekko)
 * ------------------------------------------------
 * Cada tienda es una barra dividida por categoría:
 *   - en modo "%": cada barra suma 100 % y se ve QUÉ vende cada tienda;
 *   - en modo "$": el largo de la barra es la venta, se ve CUÁNTO vende.
 * Si "Grosor según venta" está activo, el grosor de cada barra es
 * proporcional a la venta total de esa tienda (o segmento).
 *
 * Este gráfico se dibuja con HTML y CSS (no con Chart.js), porque Chart.js
 * no permite barras de distinto grosor.
 * Usa funciones y datos de dashboard.js (D, F, pesos, colorCategoria...).
 */

// Opciones de vista de esta pestaña
const MK = {
  modo: "pct",          // "pct" = porcentaje, "monto" = pesos
  agrupar: false,       // agrupar tiendas por segmento
  grosor: true,         // grosor proporcional a la venta
  orden: "venta",       // "venta", "codigo" o "cat0".."cat4"
  cerrados: new Set(),  // segmentos cerrados (cuando se agrupa)
};

function configurarMezcla() {
  const sel = document.getElementById("mk-orden");
  sel.add(new Option("Venta total", "venta"));
  sel.add(new Option("Código de tienda", "codigo"));
  D.categorias.forEach((c, i) => sel.add(new Option(`% de ${c}`, "cat" + i)));
  sel.addEventListener("change", () => { MK.orden = sel.value; dibujarMezcla(ultimo); });

  document.querySelectorAll("[data-modo]").forEach((boton) => boton.addEventListener("click", () => {
    MK.modo = boton.dataset.modo;
    document.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
    dibujarMezcla(ultimo);
  }));
  document.getElementById("mk-agrupar").addEventListener("change", (e) => {
    MK.agrupar = e.target.checked;
    dibujarMezcla(ultimo);
  });
  document.getElementById("mk-grosor").addEventListener("change", (e) => {
    MK.grosor = e.target.checked;
    dibujarMezcla(ultimo);
  });
  document.getElementById("mk-expandir").addEventListener("click", (e) => {
    const accion = e.target.dataset.accion;
    if (!accion) return;
    if (accion === "contraer") D.segmentos.forEach((s) => MK.cerrados.add(s));
    else MK.cerrados.clear();
    dibujarMezcla(ultimo);
  });

  // Al tocar fuera de una barra (en el celular) se esconde la ayuda.
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".mk-seg")) ocultarAyuda();
  });
  addEventListener("scroll", ocultarAyuda, { passive: true });
}

// ---------------------------------------------------------------------------
// Ayuda flotante (tooltip) al pasar el mouse o tocar una barra
// ---------------------------------------------------------------------------
const ayuda = document.createElement("div");
ayuda.className = "mk-ayuda";
ayuda.hidden = true;
document.body.append(ayuda);

function mostrarAyuda(evento, titulo, lineas) {
  const cabeza = document.createElement("div");
  cabeza.className = "mk-ayuda__titulo";
  cabeza.textContent = titulo;
  const filas = lineas.map(([fuerte, suave, colorLinea]) => {
    const fila = document.createElement("div");
    fila.className = "mk-ayuda__fila";
    if (colorLinea) {
      const marca = document.createElement("span");
      marca.className = "mk-ayuda__marca";
      marca.style.background = colorLinea;
      fila.append(marca);
    }
    const b = document.createElement("strong");
    b.textContent = fuerte;
    fila.append(b, document.createTextNode(" " + suave));
    return fila;
  });
  ayuda.replaceChildren(cabeza, ...filas);
  ayuda.hidden = false;
  let x = evento.clientX + 14;
  let y = evento.clientY + 14;
  if (x + ayuda.offsetWidth > innerWidth - 8) x = Math.max(8, evento.clientX - ayuda.offsetWidth - 14);
  if (y + ayuda.offsetHeight > innerHeight - 8) y = evento.clientY - ayuda.offsetHeight - 14;
  ayuda.style.left = `${x}px`;
  ayuda.style.top = `${y}px`;
}
function ocultarAyuda() { ayuda.hidden = true; }

// ---------------------------------------------------------------------------
// Escala "bonita" para el modo $ (ej: 0, 50, 100, 150, 200 MM)
// ---------------------------------------------------------------------------
function escalaBonita(maximo, divisiones = 4) {
  const bruto = maximo / divisiones;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const tope = Math.ceil(maximo / paso) * paso;
  const marcas = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) marcas.push(v);
  return { tope, marcas };
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
function dibujarMezcla(r) {
  if (!r) return;
  const cats = D.categorias.map((c, i) => i);
  const suma = (arr) => arr.reduce((a, b) => a + b, 0);
  const esMovil = innerWidth < 560;
  const ALTO_MAX = esMovil ? 30 : 40;   // grosor de la barra más grande (px)
  const ALTO_FIJO = esMovil ? 18 : 22;  // grosor cuando "Grosor según venta" está apagado

  // 1) Tiendas visibles según los filtros de arriba
  let tiendas = D.tiendas.map((t, ti) => ({
    nombre: `${t.id_tienda} ${t.comuna}`,
    nombreLargo: `${t.id_tienda} · ${t.nombre}`,
    id: t.id_tienda,
    segmento: t.segmento,
    valores: r.ventaTiendaCat[ti],
    total: suma(r.ventaTiendaCat[ti]),
    visible: tiendaOk(ti),
  })).filter((t) => t.visible && t.total > 0);

  // 2) Orden
  const ordenar = (lista) => lista.sort((a, b) => {
    if (MK.orden === "codigo") return a.id ? a.id.localeCompare(b.id) : 0;
    if (MK.orden.startsWith("cat")) {
      const ci = Number(MK.orden.slice(3));
      return b.valores[ci] / b.total - a.valores[ci] / a.total;
    }
    return b.total - a.total;
  });
  tiendas = ordenar(tiendas);

  // 3) Grupos por segmento (si corresponde)
  const grupos = D.segmentos.map((s) => {
    const suyas = tiendas.filter((t) => t.segmento === s);
    const valores = cats.map((ci) => suma(suyas.map((t) => t.valores[ci])));
    return { nombre: s, nombreLargo: `Segmento ${s}`, tiendas: suyas, valores, total: suma(valores) };
  }).filter((g) => g.tiendas.length);

  // 4) Escalas
  const maxTienda = Math.max(1, ...tiendas.map((t) => t.total));
  const maxGrupo = Math.max(1, ...grupos.map((g) => g.total));
  // En el celular se usan menos marcas en el eje para que no se superpongan.
  const escala = MK.modo === "monto" ? escalaBonita(maxTienda, esMovil ? 2 : 4)
    : { tope: 1, marcas: esMovil ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1] };
  const alto = (total, max) => (MK.grosor ? Math.max(6, (ALTO_MAX * total) / max) : ALTO_FIJO);

  // Textos de apoyo
  texto("mk-sub", (MK.modo === "pct" ? "% de la venta de cada tienda" : "Venta del mes por categoría")
    + (MK.grosor ? " · el grosor de cada barra es proporcional a su venta total" : "")
    + (MK.agrupar && MK.modo === "monto" ? " · los segmentos muestran su total en texto" : ""));
  document.getElementById("mk-expandir").hidden = !MK.agrupar;
  leyenda("l-mk", cats.map((ci) => ({ label: D.categorias[ci], color: colorCategoria(ci) })));

  const cont = document.getElementById("mk");
  cont.dataset.modo = MK.modo;
  cont.replaceChildren();
  const plot = document.createElement("div");
  plot.className = "mk-plot";

  // Líneas de la grilla
  const grilla = document.createElement("div");
  grilla.className = "mk-grilla";
  grilla.setAttribute("aria-hidden", "true");
  for (const m of escala.marcas) {
    const l = document.createElement("span");
    l.style.left = `${(m / escala.tope) * 100}%`;
    grilla.append(l);
  }
  plot.append(grilla);

  // Crea una fila (tienda o segmento)
  function crearFila(item, { esGrupo = false, esHija = false } = {}) {
    const fila = document.createElement("div");
    fila.className = "mk-fila" + (esGrupo ? " mk-fila--grupo" : "") + (esHija ? " mk-fila--hija" : "");
    fila.setAttribute("role", "listitem");
    fila.setAttribute("aria-label", `${item.nombreLargo}: venta ${pesos(item.total)}. `
      + cats.map((ci) => `${D.categorias[ci]} ${pct(item.valores[ci] / item.total)}`).join(", "));

    // Etiqueta
    const etiqueta = document.createElement("div");
    etiqueta.className = "mk-etiqueta";
    const nombre = document.createElement(esGrupo ? "button" : "span");
    nombre.className = "mk-nombre";
    if (esGrupo) {
      const abierto = !MK.cerrados.has(item.nombre);
      nombre.type = "button";
      nombre.setAttribute("aria-expanded", String(abierto));
      nombre.textContent = `${abierto ? "▾" : "▸"} ${item.nombre}`;
      nombre.addEventListener("click", () => {
        if (abierto) MK.cerrados.add(item.nombre); else MK.cerrados.delete(item.nombre);
        dibujarMezcla(ultimo);
      });
    } else {
      nombre.textContent = item.nombre;
      nombre.title = item.nombreLargo;
    }
    const sub = document.createElement("span");
    sub.className = "mk-subtexto";
    // En modo $ el total ya aparece al final de la barra, así que no se repite.
    sub.textContent = esGrupo ? `${item.tiendas.length} tiendas · ${pesosCorto(item.total)}`
      : MK.modo === "pct" ? pesosCorto(item.total) : "";
    etiqueta.append(nombre, sub);

    // Barra
    const pista = document.createElement("div");
    pista.className = "mk-pista";
    if (!(esGrupo && MK.modo === "monto")) {
      const barra = document.createElement("div");
      barra.className = "mk-barra";
      barra.style.height = `${alto(item.total, esGrupo ? maxGrupo : maxTienda)}px`;
      const ancho = MK.modo === "pct" ? 100 : (item.total / escala.tope) * 100;
      barra.style.width = `${ancho}%`;
      for (const ci of cats) {
        const v = item.valores[ci];
        if (v <= 0) continue;
        const seg = document.createElement("div");
        seg.className = "mk-seg";
        if (F.cat !== "" && ci !== Number(F.cat)) seg.classList.add("mk-seg--tenue");
        seg.style.flex = `${v} 1 0px`;
        seg.style.background = colorCategoria(ci);
        if (MK.modo === "pct") {
          const etiq = document.createElement("span");
          etiq.className = "mk-seg__texto" + (ci === 3 ? " mk-seg__texto--oscuro" : "");
          etiq.textContent = nf((v / item.total) * 100, 0) + "%";
          seg.append(etiq);
        }
        const mostrar = (e) => mostrarAyuda(e, item.nombreLargo, [
          [pesos(v), D.categorias[ci], colorCategoria(ci)],
          [pct(v / item.total), `de la venta de ${esGrupo ? "el segmento" : "la tienda"}`],
        ]);
        seg.addEventListener("pointermove", mostrar);
        seg.addEventListener("pointerdown", mostrar);
        seg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") ocultarAyuda(); });
        barra.append(seg);
      }
      pista.append(barra);
      if (MK.modo === "monto") {
        const total = document.createElement("span");
        total.className = "mk-total";
        total.textContent = pesosCorto(item.total);
        total.style.left = `calc(${ancho}% + 6px)`;
        pista.append(total);
      }
    }
    fila.append(etiqueta, pista);
    return fila;
  }

  // 5) Filas
  if (MK.agrupar) {
    for (const g of grupos) {
      plot.append(crearFila(g, { esGrupo: true }));
      if (!MK.cerrados.has(g.nombre)) g.tiendas.forEach((t) => plot.append(crearFila(t, { esHija: true })));
    }
  } else {
    tiendas.forEach((t) => plot.append(crearFila(t)));
  }

  // 6) Eje con valores
  const eje = document.createElement("div");
  eje.className = "mk-fila mk-fila--eje";
  eje.setAttribute("aria-hidden", "true");
  const vacio = document.createElement("div");
  const marcas = document.createElement("div");
  marcas.className = "mk-pista mk-marcas";
  escala.marcas.forEach((m, i) => {
    const s = document.createElement("span");
    s.textContent = MK.modo === "pct" ? pct(m, 0) : pesosCorto(m);
    s.style.left = `${(m / escala.tope) * 100}%`;
    if (i === 0) s.classList.add("mk-marca--inicio");
    if (i === escala.marcas.length - 1) s.classList.add("mk-marca--fin");
    marcas.append(s);
  });
  eje.append(vacio, marcas);
  plot.append(eje);
  cont.append(plot);

  // 7) Los % dentro de la barra solo se muestran si caben
  cont.querySelectorAll(".mk-seg__texto").forEach((t) => {
    const seg = t.parentElement;
    if (t.offsetWidth + 8 > seg.clientWidth || seg.clientHeight < 16) t.hidden = true;
  });

  // 8) Tabla con los datos
  const filasTabla = [];
  const agregar = (item) => filasTabla.push([item.nombreLargo, item.segmento || "—", pesos(item.total),
    ...cats.map((ci) => (MK.modo === "pct" ? pct(item.valores[ci] / item.total) : pesos(item.valores[ci])))]);
  if (MK.agrupar) grupos.forEach((g) => { agregar(g); g.tiendas.forEach(agregar); });
  else tiendas.forEach(agregar);
  tabla("t-mk", ["Tienda", "Segmento", "Venta total", ...cats.map((ci) => D.categorias[ci])], filasTabla);
}
