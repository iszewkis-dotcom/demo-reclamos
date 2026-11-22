"""
Prepara los datos del dashboard web.

Los CSV completos pesan ~60 MB: demasiado para abrirlos en un celular.
Este script calcula los resúmenes que necesita el dashboard y los guarda en
un archivo liviano: dashboard/datos.json.

Ejecutar después de generar_datos.py:   python3 preparar_dashboard.py
"""

import json
from pathlib import Path

import pandas as pd

BASE = Path(__file__).parent
DATOS = BASE / "datos"
SALIDA = BASE / "dashboard" / "datos.json"

CATEGORIAS = ["Tabaco", "Café", "Comida", "Góndola", "Cooler"]
SEGMENTOS = ["Carretera", "Residencial", "Comercial"]
MEDIOS = ["Débito", "Crédito", "Efectivo", "App / QR"]

tiendas = pd.read_csv(DATOS / "tiendas.csv")
productos = pd.read_csv(DATOS / "productos.csv")
feriados = pd.read_csv(DATOS / "feriados.csv")
tx = pd.read_csv(DATOS / "transacciones.csv")
det = pd.read_csv(DATOS / "detalle_transacciones.csv")

fechas = sorted(tx.fecha.unique())
i_fecha = {f: i for i, f in enumerate(fechas)}
i_tienda = {t: i for i, t in enumerate(tiendas.id_tienda)}
i_cat = {c: i for i, c in enumerate(CATEGORIAS)}
i_medio = {m: i for i, m in enumerate(MEDIOS)}
i_sku = {s: i for i, s in enumerate(productos.sku)}

tx["hora_n"] = tx.hora.str[:2].astype(int)
d = det.merge(productos[["sku", "categoria"]], on="sku").merge(
    tx[["id_transaccion", "id_tienda", "fecha", "hora_n", "medio_pago"]], on="id_transaccion")


def filas(df, columnas):
    """Convierte la tabla en listas de números (formato compacto)."""
    out = df.copy()
    for col, mapa in [("fecha", i_fecha), ("id_tienda", i_tienda), ("categoria", i_cat),
                      ("medio_pago", i_medio), ("sku", i_sku)]:
        if col in out:
            out[col] = out[col].map(mapa)
    return out[columnas].astype(int).values.tolist()


# Por categoría: venta, costo, unidades y n° de transacciones que incluyen la categoría.
def por_categoria(claves):
    return (d.groupby(claves + ["categoria"])
            .agg(venta=("total_linea", "sum"), costo=("costo_linea", "sum"),
                 unidades=("cantidad", "sum"), tx=("id_transaccion", "nunique"))
            .reset_index())


# Totales (sin separar por categoría): n° de transacciones reales.
def totales(claves):
    return tx.groupby(claves).agg(tx=("id_transaccion", "size")).reset_index()


diario = por_categoria(["fecha", "id_tienda"])
horas = por_categoria(["id_tienda", "hora_n"])
pagos = por_categoria(["id_tienda", "medio_pago"])
prod = (d.groupby(["id_tienda", "sku"])
        .agg(unidades=("cantidad", "sum"), venta=("total_linea", "sum")).reset_index())

salida = {
    "periodo": "Octubre 2026",
    "fechas": fechas,
    "feriados": dict(zip(feriados.fecha, feriados.feriado)),
    "categorias": CATEGORIAS,
    "segmentos": SEGMENTOS,
    "medios": MEDIOS,
    "tiendas": tiendas[["id_tienda", "nombre", "segmento", "comuna"]].to_dict("records"),
    "productos": [[r.nombre, i_cat[r.categoria]] for r in productos.itertuples()],
    # [fecha, tienda, categoría, venta, costo, unidades, transacciones con la categoría]
    "diario": filas(diario, ["fecha", "id_tienda", "categoria", "venta", "costo", "unidades", "tx"]),
    # [fecha, tienda, transacciones totales]
    "diario_tx": filas(totales(["fecha", "id_tienda"]), ["fecha", "id_tienda", "tx"]),
    # [tienda, hora, categoría, venta, transacciones con la categoría]
    "horas": filas(horas, ["id_tienda", "hora_n", "categoria", "venta", "tx"]),
    "horas_tx": filas(totales(["id_tienda", "hora_n"]), ["id_tienda", "hora_n", "tx"]),
    # [tienda, medio de pago, categoría, venta, transacciones con la categoría]
    "pagos": filas(pagos, ["id_tienda", "medio_pago", "categoria", "venta", "tx"]),
    "pagos_tx": filas(tx.groupby(["id_tienda", "medio_pago"]).agg(tx=("total", "size"))
                      .reset_index(), ["id_tienda", "medio_pago", "tx"]),
    # [tienda, producto, unidades, venta]
    "productos_venta": filas(prod, ["id_tienda", "sku", "unidades", "venta"]),
}

SALIDA.parent.mkdir(exist_ok=True)
SALIDA.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Listo: {SALIDA} ({SALIDA.stat().st_size / 1024:.0f} KB)")
