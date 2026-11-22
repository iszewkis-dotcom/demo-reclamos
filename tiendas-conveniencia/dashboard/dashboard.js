/*
 * DASHBOARD DE VENTAS · TIENDAS AL PASO
 * --------------------------------------
 * 1. Carga datos.json (resúmenes ya calculados por preparar_dashboard.py).
 * 2. Cada vez que cambia un filtro, recalcula los números (función calcular).
 * 3. Dibuja los indicadores, los gráficos (con Chart.js) y las tablas.
 */

let D = null;                                   // los datos cargados
const F = { seg: "", tienda: "", cat: "" };     // filtros seleccionados
const graficos = {};                            // gráficos dibujados (para poder borrarlos)
let pestanaActiva = "ventas";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ---------------------------------------------------------------------------
// Formatos de números (estilo chileno: 1.234.567)
// ---------------------------------------------------------------------------
const nf = (n, dec = 0) => n.toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const pesos = (n) => "$" + nf(Math.round(n));
function pesosCorto(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + nf(n / 1e6, a >= 1e8 || Number.isInteger(n / 1e6) ? 0 : 1) + " MM";
  if (a >= 1e3) return "$" + nf(n / 1e3) + " mil";
  return "$" + nf(n);
}
const pct = (n, dec = 1) => nf(n * 100, dec) + " %";

// Lee un color definido en estilos.css (así funcionan el modo claro y oscuro).
const color = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const colorCategoria = (ci) => color(`--serie-${ci + 1}`);
const colorSegmento = (si) => color(`--serie-${si + 1}`);

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------
const tiendaOk = (ti) => {
  const t = D.tiendas[ti];
  return (!F.seg || t.segmento === F.seg) && (!F.tienda || t.id_tienda === F.tienda);
};
const catOk = (ci) => F.cat === "" || ci === Number(F.cat);

function llenarFiltros() {
  const selSeg = document.getElementById("f-segmento");
  const selTienda = document.getElementById("f-tienda");
  const selCat = document.getElementById("f-categoria");

  D.segmentos.forEach((s) => selSeg.add(new Option(s, s)));
  D.categorias.forEach((c, i) => selCat.add(new Option(c, String(i))));

  const llenarTiendas = () => {
    selTienda.length = 1; // deja solo "Todas"
    D.tiendas.filter((t) => !F.seg || t.segmento === F.seg)
      .forEach((t) => selTienda.add(new Option(`${t.id_tienda} · ${t.nombre.replace("Al Paso ", "")}`, t.id_tienda)));
    selTienda.value = F.tienda;
  };
  llenarTiendas();

  selSeg.addEventListener("change", () => {
    F.seg = selSeg.value;
    const t = D.tiendas.find((x) => x.id_tienda === F.tienda);
    if (t && F.seg && t.segmento !== F.seg) F.tienda = "";
    llenarTiendas();
    actualizar();
  });
  selTienda.addEventListener("change", () => { F.tienda = selTienda.value; actualizar(); });
  selCat.addEventListener("change", () => { F.cat = selCat.value; actualizar(); });
  document.getElementById("f-limpiar").addEventListener("click", () => {
    F.seg = F.tienda = F.cat = "";
    selSeg.value = selCat.value = "";
    llenarTiendas();
    actualizar();
  });
}

// ---------------------------------------------------------------------------
// Cálculos: recorre los resúmenes y suma lo que cumple con los filtros
// ---------------------------------------------------------------------------
function calcular() {
  const nF = D.fechas.length, nC = D.categorias.length, nS = D.segmentos.length;
  const segDeTienda = D.tiendas.map((t) => D.segmentos.indexOf(t.segmento));
  const diaSemana = D.fechas.map((f) => (new Date(f + "T12:00:00").getDay() + 6) % 7);
  const cero = (n) => new Array(n).fill(0);

  const r = {
    venta: 0, costo: 0, unidades: 0, tx: 0,
    ventaDia: cero(nF),
    ventaTienda: cero(D.tiendas.length),
    ventaSegDow: D.segmentos.map(() => cero(7)),
    ventaCat: cero(nC), costoCat: cero(nC),
    ventaSegCat: D.segmentos.map(() => cero(nC)), // sin filtro de categoría
    ventaTiendaCat: D.tiendas.map(() => cero(nC)), // sin filtro de categoría
    txHoraSeg: D.segmentos.map(() => cero(24)),
    ventaHoraCat: D.categorias.map(() => cero(24)),
    txMedio: cero(D.medios.length),
    tiendasSeg: cero(nS),
    diasSemana: cero(7),
  };
  diaSemana.forEach((d) => r.diasSemana[d]++);
  D.tiendas.forEach((t, ti) => { if (tiendaOk(ti)) r.tiendasSeg[segDeTienda[ti]]++; });
  r.nTiendas = r.tiendasSeg.reduce((a, b) => a + b, 0);

  for (const [f, ti, ci, venta, costo, unid, tx] of D.diario) {
    if (!tiendaOk(ti)) continue;
    r.ventaSegCat[segDeTienda[ti]][ci] += venta;
    r.ventaTiendaCat[ti][ci] += venta;
    if (!catOk(ci)) continue;
    r.venta += venta; r.costo += costo; r.unidades += unid;
    r.ventaDia[f] += venta;
    r.ventaTienda[ti] += venta;
    r.ventaSegDow[segDeTienda[ti]][diaSemana[f]] += venta;
    r.ventaCat[ci] += venta; r.costoCat[ci] += costo;
    if (F.cat !== "") r.tx += tx;
  }
  if (F.cat === "") for (const [, ti, tx] of D.diario_tx) if (tiendaOk(ti)) r.tx += tx;

  for (const [ti, h, ci, venta, tx] of D.horas) {
    if (!tiendaOk(ti) || !catOk(ci)) continue;
    r.ventaHoraCat[ci][h] += venta;
    if (F.cat !== "") r.txHoraSeg[segDeTienda[ti]][h] += tx;
  }
  if (F.cat === "") for (const [ti, h, tx] of D.horas_tx) if (tiendaOk(ti)) r.txHoraSeg[segDeTienda[ti]][h] += tx;

  if (F.cat === "") {
    for (const [ti, m, tx] of D.pagos_tx) if (tiendaOk(ti)) r.txMedio[m] += tx;
  } else {
    for (const [ti, m, ci, , tx] of D.pagos) if (tiendaOk(ti) && catOk(ci)) r.txMedio[m] += tx;
  }

  const porProducto = new Map();
  for (const [ti, pi, unid, venta] of D.productos_venta) {
    if (!tiendaOk(ti) || !catOk(D.productos[pi][1])) continue;
    const p = porProducto.get(pi) || { unid: 0, venta: 0 };
    p.unid += unid; p.venta += venta;
    porProducto.set(pi, p);
  }
  r.top = [...porProducto.entries()].sort((a, b) => b[1].venta - a[1].venta).slice(0, 10);
  r.nDias = nF;
  r.diaSemana = diaSemana;
  return r;
}

// ---------------------------------------------------------------------------
// Ayudantes de dibujo
// ---------------------------------------------------------------------------
function texto(id, valor) { document.getElementById(id).textContent = valor; }

function leyenda(id, items, tipo = "rect") {
  const cont = document.getElementById(id);
  cont.replaceChildren();
  if (items.length < 2) return; // una sola serie: el título ya la nombra
  for (const it of items) {
    const span = document.createElement("span");
    span.className = "leyenda__item";
    const muestra = document.createElement("span");
    muestra.className = "leyenda__muestra" + (tipo === "linea" ? " leyenda__muestra--linea" : "");
    muestra.style.background = it.color;
    span.append(muestra, document.createTextNode(it.label));
    cont.append(span);
  }
}

// Crea una tabla HTML con textContent (seguro ante texto extraño).
function tabla(id, encabezados, filas) {
  const t = document.createElement("table");
  t.className = "datos";
  const trh = t.createTHead().insertRow();
  encabezados.forEach((h) => { const th = document.createElement("th"); th.textContent = h; trh.append(th); });
  const tb = t.createTBody();
  filas.forEach((fila) => {
    const tr = tb.insertRow();
    fila.forEach((v) => {
      const td = tr.insertCell();
      if (v instanceof Node) td.append(v); else td.textContent = v;
    });
  });
  document.getElementById(id).replaceChildren(t);
}

function opcionesBase({ horizontal = false, apilado = false, ejeValor = pesosCorto, tooltipValor = pesos } = {}) {
  const grilla = color("--grilla"), tenue = color("--tenue");
  const ejeV = {
    beginAtZero: true, stacked: apilado,
    grid: { color: grilla, drawTicks: false }, border: { display: false },
    ticks: { color: tenue, padding: 6, callback: (v) => ejeValor(v), maxRotation: 0,
             maxTicksLimit: horizontal && innerWidth < 560 ? 4 : 6 },
  };
  const ejeC = {
    stacked: apilado,
    grid: { display: false }, border: { color: color("--eje") },
    ticks: { color: tenue, autoSkip: true, maxRotation: 0 },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    indexAxis: horizontal ? "y" : "x",
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: color("--superficie"), titleColor: color("--texto-2"),
        bodyColor: color("--texto"), borderColor: color("--eje"), borderWidth: 1,
        padding: 10, boxPadding: 4, usePointStyle: true,
        bodyFont: { weight: "600" },
        callbacks: {
          label: (ctx) => ` ${tooltipValor(horizontal ? ctx.parsed.x : ctx.parsed.y)}  ${ctx.dataset.label || ""}`,
        },
      },
    },
    scales: horizontal ? { x: ejeV, y: ejeC } : { x: ejeC, y: ejeV },
  };
}

function dibujar(id, config) {
  if (graficos[id]) graficos[id].destroy();
  graficos[id] = new Chart(document.getElementById(id), config);
}

const barra = (extra) => ({ borderRadius: 4, borderSkipped: "start", maxBarThickness: 24, ...extra });
const linea = (extra) => ({
  borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBorderWidth: 2,
  pointHoverBorderColor: color("--superficie"), cubicInterpolationMode: "monotone", fill: false, ...extra,
});

// ---------------------------------------------------------------------------
// Indicadores (KPI)
// ---------------------------------------------------------------------------
function dibujarKpis(r) {
  const tiendaDias = Math.max(1, r.nTiendas * r.nDias);
  const nombreCat = F.cat === "" ? "" : D.categorias[Number(F.cat)];
  texto("k-venta", pesosCorto(r.venta));
  texto("k-venta-nota", `${pesosCorto(r.venta / r.nDias)} por día · ${r.nTiendas} ${r.nTiendas === 1 ? "tienda" : "tiendas"}`);
  texto("k-tx", nf(r.tx));
  texto("k-tx-nota", nombreCat ? `con ${nombreCat} · ${nf(r.tx / tiendaDias)} por tienda al día`
                                : `${nf(r.tx / tiendaDias)} por tienda al día`);
  texto("k-ticket-etiqueta", nombreCat ? `Gasto promedio en ${nombreCat}` : "Ticket promedio");
  texto("k-ticket", r.tx ? pesos(r.venta / r.tx) : "–");
  texto("k-ticket-nota", nombreCat ? "por transacción con la categoría" : "por transacción");
  texto("k-margen", r.venta ? pct((r.venta - r.costo) / r.venta) : "–");
  texto("k-margen-nota", `${pesosCorto(r.venta - r.costo)} de ganancia bruta`);
  texto("k-unidades", nf(r.unidades));
  texto("k-unidades-nota", r.tx ? `${nf(r.unidades / r.tx, 1)} por transacción` : "");
}

// ---------------------------------------------------------------------------
// Dashboard 1: Ventas y tiendas
// ---------------------------------------------------------------------------
function dibujarVentas(r) {
  // Venta diaria: días hábiles vs fin de semana / feriado
  const etiquetas = D.fechas.map((f) => String(Number(f.slice(8))));
  const especial = D.fechas.map((f, i) => r.diaSemana[i] >= 5 || D.feriados[f]);
  const cHabil = color("--serie-1"), cEspecial = color("--serie-claro");
  leyenda("l-diaria", [{ label: "Lunes a viernes", color: cHabil }, { label: "Fin de semana o feriado", color: cEspecial }]);
  const opDiaria = opcionesBase();
  opDiaria.plugins.tooltip.callbacks.title = (items) => {
    const i = items[0].dataIndex, f = D.fechas[i];
    return `${DIAS[r.diaSemana[i]]} ${Number(f.slice(8))} oct` + (D.feriados[f] ? ` · Feriado: ${D.feriados[f]}` : "");
  };
  opDiaria.plugins.tooltip.callbacks.label = (ctx) => ` ${pesos(ctx.parsed.y)}  vendido`;
  dibujar("g-diaria", {
    type: "bar",
    data: { labels: etiquetas, datasets: [barra({ label: "Venta", data: r.ventaDia,
      backgroundColor: especial.map((e) => (e ? cEspecial : cHabil)), hoverBackgroundColor: especial.map((e) => (e ? cEspecial : cHabil)) })] },
    options: opDiaria,
  });
  tabla("t-diaria", ["Fecha", "Día", "Venta"], D.fechas.map((f, i) =>
    [f + (D.feriados[f] ? " (feriado)" : ""), DIAS[r.diaSemana[i]], pesos(r.ventaDia[i])]));

  // Segmentos visibles con el filtro actual
  const segs = D.segmentos.map((s, si) => si).filter((si) => r.tiendasSeg[si] > 0);
  leyenda("l-semana", segs.map((si) => ({ label: D.segmentos[si], color: colorSegmento(si) })));
  leyenda("l-horas", segs.map((si) => ({ label: D.segmentos[si], color: colorSegmento(si) })), "linea");

  // Día de la semana: promedio diario por tienda
  const promDow = (si, d) => r.ventaSegDow[si][d] / (r.tiendasSeg[si] * r.diasSemana[d]);
  dibujar("g-semana", {
    type: "bar",
    data: { labels: DIAS_CORTO, datasets: segs.map((si) => barra({
      label: D.segmentos[si], data: DIAS.map((_, d) => promDow(si, d)), backgroundColor: colorSegmento(si) })) },
    options: opcionesBase(),
  });
  tabla("t-semana", ["Día", ...segs.map((si) => D.segmentos[si])],
    DIAS.map((dia, d) => [dia, ...segs.map((si) => pesos(promDow(si, d)))]));

  // Transacciones por hora: promedio diario por tienda
  const horas = [...Array(24).keys()];
  const promHora = (si, h) => r.txHoraSeg[si][h] / (r.tiendasSeg[si] * r.nDias);
  const opHoras = opcionesBase({ ejeValor: (v) => nf(v), tooltipValor: (v) => nf(v, 1) + " transacciones" });
  opHoras.plugins.tooltip.callbacks.title = (items) => `${items[0].label}:00 – ${items[0].label}:59`;
  dibujar("g-horas", {
    type: "line",
    data: { labels: horas.map((h) => String(h).padStart(2, "0")), datasets: segs.map((si) => linea({
      label: D.segmentos[si], data: horas.map((h) => promHora(si, h)),
      borderColor: colorSegmento(si), backgroundColor: colorSegmento(si) })) },
    options: opHoras,
  });
  tabla("t-horas", ["Hora", ...segs.map((si) => D.segmentos[si])],
    horas.map((h) => [`${String(h).padStart(2, "0")}:00`, ...segs.map((si) => nf(promHora(si, h), 1))]));

  // Ranking de tiendas
  const ranking = D.tiendas.map((t, ti) => ({ t, ti, venta: r.ventaTienda[ti] }))
    .filter((x) => tiendaOk(x.ti)).sort((a, b) => b.venta - a.venta);
  document.getElementById("c-ranking").style.height = `${Math.max(120, ranking.length * 30 + 40)}px`;
  leyenda("l-ranking", segs.map((si) => ({ label: D.segmentos[si], color: colorSegmento(si) })));
  const opRank = opcionesBase({ horizontal: true });
  opRank.interaction = { mode: "nearest", axis: "y", intersect: false };
  opRank.plugins.tooltip.callbacks.title = (items) => ranking[items[0].dataIndex].t.nombre;
  opRank.plugins.tooltip.callbacks.label = (ctx) => ` ${pesos(ctx.parsed.x)}  ·  ${ranking[ctx.dataIndex].t.segmento}`;
  dibujar("g-ranking", {
    type: "bar",
    data: { labels: ranking.map((x) => x.t.id_tienda + " " + x.t.comuna),
      datasets: [barra({ label: "Venta", data: ranking.map((x) => x.venta), maxBarThickness: 18,
        backgroundColor: ranking.map((x) => colorSegmento(D.segmentos.indexOf(x.t.segmento))) })] },
    options: opRank,
  });
  tabla("t-ranking", ["Tienda", "Segmento", "Comuna", "Venta"],
    ranking.map((x) => [`${x.t.id_tienda} · ${x.t.nombre}`, x.t.segmento, x.t.comuna, pesos(x.venta)]));

  // Medios de pago
  const totalTx = r.txMedio.reduce((a, b) => a + b, 0) || 1;
  const orden = D.medios.map((m, i) => i).sort((a, b) => r.txMedio[b] - r.txMedio[a]);
  dibujar("g-pagos", {
    type: "bar",
    data: { labels: orden.map((i) => D.medios[i]), datasets: [barra({ label: "de las transacciones",
      data: orden.map((i) => r.txMedio[i] / totalTx), backgroundColor: color("--serie-1"), maxBarThickness: 22 })] },
    options: opcionesBase({ horizontal: true, ejeValor: (v) => pct(v, 0), tooltipValor: (v) => pct(v) }),
  });
  tabla("t-pagos", ["Medio de pago", "Transacciones", "%"],
    orden.map((i) => [D.medios[i], nf(r.txMedio[i]), pct(r.txMedio[i] / totalTx)]));
}

// ---------------------------------------------------------------------------
// Dashboard 2: Categorías y productos
// ---------------------------------------------------------------------------
function dibujarCategorias(r) {
  const cats = D.categorias.map((c, ci) => ci);
  const catsFiltro = cats.filter(catOk);

  // Mezcla de categorías por segmento (100 % apilado)
  const filas = D.segmentos.map((s, si) => si).filter((si) => r.tiendasSeg[si] > 0);
  const etiquetasMix = filas.map((si) => D.segmentos[si]);
  const totalesMix = filas.map((si) => r.ventaSegCat[si].reduce((a, b) => a + b, 0) || 1);
  if (filas.length > 1) {
    etiquetasMix.push("Total");
    totalesMix.push(totalesMix.reduce((a, b) => a + b, 0));
  }
  const valorMix = (fi, ci) => (fi < filas.length ? r.ventaSegCat[filas[fi]][ci]
    : filas.reduce((a, si) => a + r.ventaSegCat[si][ci], 0)) / totalesMix[fi];
  document.getElementById("c-mix").style.height = `${etiquetasMix.length * 44 + 40}px`;
  leyenda("l-mix", cats.map((ci) => ({ label: D.categorias[ci], color: colorCategoria(ci) })));
  const opMix = opcionesBase({ horizontal: true, apilado: true, ejeValor: (v) => pct(v, 0), tooltipValor: (v) => pct(v) });
  opMix.scales.x.max = 1;
  opMix.interaction = { mode: "nearest", axis: "y", intersect: true };
  dibujar("g-mix", {
    type: "bar",
    data: { labels: etiquetasMix, datasets: cats.map((ci) => ({
      label: D.categorias[ci], data: etiquetasMix.map((_, fi) => valorMix(fi, ci)),
      backgroundColor: colorCategoria(ci), borderColor: color("--superficie"),
      borderWidth: { left: 1, right: 1, top: 0, bottom: 0 }, borderSkipped: false, maxBarThickness: 28 })) },
    options: opMix,
  });
  tabla("t-mix", ["Segmento", ...cats.map((ci) => D.categorias[ci])],
    etiquetasMix.map((s, fi) => [s, ...cats.map((ci) => pct(valorMix(fi, ci)))]));

  // Venta y margen por categoría
  const cVenta = color("--serie-1"), cMargen = color("--serie-3");
  leyenda("l-margen", [{ label: "Venta", color: cVenta }, { label: "Margen bruto", color: cMargen }]);
  const opMargen = opcionesBase();
  opMargen.plugins.tooltip.callbacks.afterBody = (items) => {
    const ci = catsFiltro[items[0].dataIndex];
    return r.ventaCat[ci] ? `Margen: ${pct((r.ventaCat[ci] - r.costoCat[ci]) / r.ventaCat[ci])}` : "";
  };
  dibujar("g-margen", {
    type: "bar",
    data: { labels: catsFiltro.map((ci) => D.categorias[ci]), datasets: [
      barra({ label: "venta", data: catsFiltro.map((ci) => r.ventaCat[ci]), backgroundColor: cVenta }),
      barra({ label: "margen", data: catsFiltro.map((ci) => r.ventaCat[ci] - r.costoCat[ci]), backgroundColor: cMargen }),
    ] },
    options: opMargen,
  });
  tabla("t-margen", ["Categoría", "Venta", "Margen", "Margen %"], catsFiltro.map((ci) => [
    D.categorias[ci], pesos(r.ventaCat[ci]), pesos(r.ventaCat[ci] - r.costoCat[ci]),
    r.ventaCat[ci] ? pct((r.ventaCat[ci] - r.costoCat[ci]) / r.ventaCat[ci]) : "–"]));

  // Venta por hora y categoría
  const horas = [...Array(24).keys()];
  leyenda("l-hora-cat", catsFiltro.map((ci) => ({ label: D.categorias[ci], color: colorCategoria(ci) })), "linea");
  const opHC = opcionesBase();
  opHC.plugins.tooltip.callbacks.title = (items) => `${items[0].label}:00 – ${items[0].label}:59`;
  dibujar("g-hora-cat", {
    type: "line",
    data: { labels: horas.map((h) => String(h).padStart(2, "0")), datasets: catsFiltro.map((ci) => linea({
      label: D.categorias[ci], data: r.ventaHoraCat[ci].map((v) => v / r.nDias),
      borderColor: colorCategoria(ci), backgroundColor: colorCategoria(ci) })) },
    options: opHC,
  });
  tabla("t-hora-cat", ["Hora", ...catsFiltro.map((ci) => D.categorias[ci])],
    horas.map((h) => [`${String(h).padStart(2, "0")}:00`, ...catsFiltro.map((ci) => pesos(r.ventaHoraCat[ci][h] / r.nDias))]));

  // Top 10 productos
  const max = r.top.length ? r.top[0][1].venta : 1;
  tabla("t-top", ["#", "Producto", "Categoría", "Unidades", "Venta", ""], r.top.map(([pi, p], i) => {
    const [nombre, ci] = D.productos[pi];
    const cat = document.createElement("span");
    const punto = document.createElement("span");
    punto.className = "punto";
    punto.style.background = colorCategoria(ci);
    cat.append(punto, document.createTextNode(D.categorias[ci]));
    const fondo = document.createElement("div");
    fondo.className = "barra-fondo";
    const b = document.createElement("div");
    b.className = "barra";
    b.style.width = `${(p.venta / max) * 100}%`;
    fondo.append(b);
    return [String(i + 1), nombre, cat, nf(p.unid), pesos(p.venta), fondo];
  }));
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------
let ultimo = null;
function actualizar() {
  ultimo = calcular();
  dibujarKpis(ultimo);
  if (pestanaActiva === "ventas") dibujarVentas(ultimo);
  else if (pestanaActiva === "categorias") dibujarCategorias(ultimo);
  else dibujarMezcla(ultimo); // está en mezcla.js
}

function configurarPestanas() {
  document.querySelectorAll(".pestana").forEach((boton) => {
    boton.addEventListener("click", () => {
      pestanaActiva = boton.dataset.tab;
      document.querySelectorAll(".pestana").forEach((b) => b.setAttribute("aria-selected", String(b === boton)));
      document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== `tab-${pestanaActiva}`; });
      actualizar();
    });
  });
}

async function iniciar() {
  try {
    const resp = await fetch("dashboard/datos.json");
    if (!resp.ok) throw new Error(resp.status);
    D = await resp.json();
  } catch (e) {
    document.querySelector(".kpis").outerHTML =
      '<div class="aviso">No se pudieron cargar los datos. Si abriste el archivo con doble clic, ' +
      "publícalo en GitHub Pages o ábrelo con un servidor local (ver README).</div>";
    return;
  }
  if (typeof Chart === "undefined") return;
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  Chart.defaults.font.size = 12;
  texto("periodo", D.periodo);
  llenarFiltros();
  configurarPestanas();
  configurarMezcla();
  actualizar();
  // Al cambiar el tamaño de la ventana (o girar el celular) se redibuja la mezcla.
  let espera;
  addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => { if (pestanaActiva === "mezcla") dibujarMezcla(ultimo); }, 150);
  });
  // Si el usuario cambia entre modo claro y oscuro, se redibujan los colores.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", actualizar);
}

iniciar();
