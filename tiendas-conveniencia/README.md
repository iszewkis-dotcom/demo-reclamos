# Tiendas "Al Paso" · Base de datos ficticia para practicar dashboards

Datos **inventados pero coherentes** de una cadena de 20 tiendas de conveniencia en la
Región Metropolitana, con todas las ventas de **octubre de 2026**.

## Cifras principales

| Indicador | Valor |
|---|---|
| Tiendas | 20 (5 carretera, 8 residenciales, 7 comerciales) |
| Productos (SKU) | 1.500 en 5 categorías |
| Transacciones del mes | 622.369 (≈ 1.004 por tienda al día) |
| Ticket promedio | ≈ $4.995 |
| Venta total del mes | ≈ $3.109 millones |
| Margen bruto | ≈ 37,8 % |

## Archivos (carpeta `datos/`)

Las tablas siguen un **modelo estrella**: hay tablas de *hechos* (lo que pasó: las ventas) y
tablas de *dimensiones* (quién, qué, dónde). Se conectan entre sí mediante los campos `id_…` y `sku`.

```
tiendas ──(id_tienda)── transacciones ──(id_transaccion)── detalle_transacciones ──(sku)── productos
```

| Archivo | Filas | Tipo | Contenido |
|---|---|---|---|
| `tiendas.csv` | 20 | Dimensión | id, nombre, segmento, comuna, horario, m², fecha de apertura |
| `productos.csv` | 1.500 | Dimensión | sku, categoría, subcategoría, nombre, marca, precio de venta, costo |
| `transacciones.csv` | 622.369 | Hechos | una fila por boleta: tienda, fecha, hora, medio de pago, n° de productos, total |
| `detalle_transacciones.csv` | 1.023.096 | Hechos | una fila por producto dentro de cada boleta: sku, cantidad, precio, total, costo |
| `ventas_diarias_categoria.csv` | 3.100 | Resumen | ventas por día × tienda × categoría (transacciones, unidades, venta, costo, margen) |
| `feriados.csv` | 2 | Calendario | feriados del mes |
| `tiendas_al_paso_resumen.xlsx` | — | Excel | resumen diario, tiendas, productos y feriados en un solo archivo |

> **¿Por dónde empiezo?** Usa `tiendas_al_paso_resumen.xlsx` o `ventas_diarias_categoria.csv`.
> Son pequeños y bastan para un primer dashboard. Los archivos grandes (`transacciones` y
> `detalle_transacciones`) sirven para análisis por hora, por producto o por medio de pago.
> `detalle_transacciones.csv` casi llega al límite de filas de Excel (1.048.576): para trabajar
> con él conviene usar Power BI, Looker Studio, Python o SQL.

Todos los montos están en **pesos chilenos, IVA incluido**, sin decimales.

## Supuestos usados para inventar los datos

**Por segmento**

| | Carretera | Residencial | Comercial |
|---|---|---|---|
| Horario | 24 horas | 07:00–23:00 | 07:00–23:00 |
| Transacciones/día | ≈ 1.060 | ≈ 970 | ≈ 1.000 |
| Ticket promedio | ≈ $5.590 (viajeros compran más) | ≈ $4.880 | ≈ $4.680 |
| Categorías fuertes | Comida 31 %, Cooler 22 %, Café 20 % | Góndola 39 %, Tabaco 24 %, Cooler 23 % | Comida 31 %, Café 27 % |
| Días fuertes | Viernes a domingo y feriados | Viernes y sábado | Lunes a viernes (fin de semana cae a la mitad) |
| Horas punta | Almuerzo y tarde | 18:00–21:00 | 08:00–09:00 y 12:00–14:00 |

**Por categoría**

| Categoría | SKU | Margen aprox. | Comportamiento |
|---|---|---|---|
| Tabaco | 60 | 7–11 % | Mucha venta, poco margen; más fuerte de noche |
| Café | 40 | 62–74 % | Pico en la mañana; el más rentable |
| Comida | 200 | 38–55 % | Pico al almuerzo |
| Góndola | 800 | 24–36 % | Snacks, abarrotes, aseo, farmacia; más en barrios |
| Cooler | 400 | 28–42 % | Bebidas, lácteos, helados; más en la tarde |

**Otros detalles**
- Pocos productos venden mucho y muchos venden poco (ley de Pareto).
- Días de pago de sueldo (1 al 5 y 28 al 31): +5 % de transacciones.
- Medios de pago: débito ≈ 48 %, efectivo ≈ 21 %, crédito ≈ 17 %, app/QR ≈ 15 %.
- Octubre 2026 empieza en jueves, así que hay 5 jueves, viernes y sábados.
  Para comparar días de la semana, usa **promedios por día**, no totales.

## 🔍 Eventos escondidos para descubrir en tu dashboard

1. **Feriado del lunes 12 de octubre:** la carretera vende +50 % y las tiendas comerciales caen a menos de la mitad.
2. **Máquina de café averiada:** una tienda comercial no vendió café durante 3 días.
3. **Corte de luz:** una tienda residencial cerró a mitad de día.
4. **Halloween (31 de octubre):** en los barrios suben las ventas de góndola (dulces).

(Las respuestas exactas están en `generar_datos.py`. ¡Intenta encontrarlas primero con el dashboard!)

## Volver a generar los datos

```bash
pip install numpy pandas openpyxl
python3 generar_datos.py
```

Siempre salen los mismos datos gracias a la "semilla" (`SEMILLA = 2026`). Cámbiala para obtener otra versión.
