"""
Genera una base de datos FICTICIA de una cadena de tiendas de conveniencia
("Al Paso") para practicar análisis de datos y dashboards.

- 20 tiendas: 5 en carretera, 8 residenciales, 7 comerciales.
- 1.500 SKU en 5 categorías: Tabaco, Café, Comida, Góndola y Cooler.
- Todas las transacciones de octubre de 2026 (31 días).

Ejecutar:  python3 generar_datos.py
Requiere:  pip install numpy pandas openpyxl

La "semilla" (SEMILLA) hace que siempre salgan los mismos datos.
Cámbiala para obtener otra versión de la base de datos.
"""

from pathlib import Path
import itertools

import numpy as np
import pandas as pd

SEMILLA = 2026
rng = np.random.default_rng(SEMILLA)

CARPETA = Path(__file__).parent / "datos"
CARPETA.mkdir(exist_ok=True)

FECHAS = pd.date_range("2026-10-01", "2026-10-31", freq="D")
FERIADOS = {
    pd.Timestamp("2026-10-12"): "Encuentro de Dos Mundos",
    pd.Timestamp("2026-10-31"): "Día de las Iglesias Evangélicas",
}
CATEGORIAS = ["Tabaco", "Café", "Comida", "Góndola", "Cooler"]
SEGMENTOS = ["Carretera", "Residencial", "Comercial"]

# ---------------------------------------------------------------------------
# 1. TIENDAS
# ---------------------------------------------------------------------------
TIENDAS = [
    # id, nombre, segmento, comuna, horario, m2
    ("T01", "Al Paso Ruta 5 Sur km 40", "Carretera", "Paine", "24 horas", 180),
    ("T02", "Al Paso Ruta 68 km 25", "Carretera", "Curacaví", "24 horas", 160),
    ("T03", "Al Paso Ruta 5 Norte km 55", "Carretera", "Tiltil", "24 horas", 150),
    ("T04", "Al Paso Ruta 78 km 30", "Carretera", "Talagante", "24 horas", 140),
    ("T05", "Al Paso Ruta 57 km 18", "Carretera", "Colina", "24 horas", 170),
    ("T06", "Al Paso Pajaritos", "Residencial", "Maipú", "07:00-23:00", 120),
    ("T07", "Al Paso Vicuña Mackenna", "Residencial", "La Florida", "07:00-23:00", 130),
    ("T08", "Al Paso Plaza Puente Alto", "Residencial", "Puente Alto", "07:00-23:00", 110),
    ("T09", "Al Paso Irarrázaval", "Residencial", "Ñuñoa", "07:00-23:00", 100),
    ("T10", "Al Paso Grecia", "Residencial", "Peñalolén", "07:00-23:00", 105),
    ("T11", "Al Paso Larraín", "Residencial", "La Reina", "07:00-23:00", 95),
    ("T12", "Al Paso Gran Avenida", "Residencial", "San Miguel", "07:00-23:00", 115),
    ("T13", "Al Paso Quilicura Centro", "Residencial", "Quilicura", "07:00-23:00", 110),
    ("T14", "Al Paso Costanera", "Comercial", "Providencia", "07:00-23:00", 90),
    ("T15", "Al Paso El Golf", "Comercial", "Las Condes", "07:00-23:00", 85),
    ("T16", "Al Paso Ahumada", "Comercial", "Santiago", "07:00-23:00", 80),
    ("T17", "Al Paso Alameda", "Comercial", "Santiago", "07:00-23:00", 95),
    ("T18", "Al Paso Nueva Costanera", "Comercial", "Vitacura", "07:00-23:00", 90),
    ("T19", "Al Paso Apoquindo", "Comercial", "Las Condes", "07:00-23:00", 100),
    ("T20", "Al Paso Ciudad Empresarial", "Comercial", "Huechuraba", "07:00-23:00", 110),
]
tiendas = pd.DataFrame(
    TIENDAS, columns=["id_tienda", "nombre", "segmento", "comuna", "horario", "metros_cuadrados"]
)
tiendas["region"] = "Metropolitana"
tiendas["fecha_apertura"] = pd.to_datetime(
    rng.choice(pd.date_range("2012-01-01", "2024-06-30", freq="MS"), len(tiendas))
).strftime("%Y-%m-%d")
# Cada tienda vende un poco más o menos que el promedio de su segmento.
tiendas["factor_tamano"] = np.round(rng.uniform(0.82, 1.20, len(tiendas)), 3)

# ---------------------------------------------------------------------------
# 2. PRODUCTOS (catálogo de 1.500 SKU)
# ---------------------------------------------------------------------------
# Cada subcategoría tiene:
#   - productos base con su precio aproximado en pesos (IVA incluido),
#   - variantes (tamaño, formato) con un multiplicador de precio,
#   - marcas ficticias.
# Se generan todas las combinaciones y se elige al azar la cantidad necesaria.
MARCAS_A = ["Andina", "Del Valle Sur", "Costa"]
MARCAS_B = ["Montaña", "Austral", "Litoral"]
TODAS = MARCAS_A + MARCAS_B
SIN = [("", 1.0)]  # sin variantes

SUBCATEGORIAS = {
    "Tabaco": {
        "cantidad": 60, "margen": (0.07, 0.11),
        "sub": {
            "Cigarrillos": ([("Cigarrillos Andes", 6100), ("Cigarrillos Cordillera", 5900),
                             ("Cigarrillos Pacífico", 6300), ("Cigarrillos Volcán", 5700),
                             ("Cigarrillos Austral", 6000), ("Cigarrillos Litoral", 5800)],
                            [("Rojo 20u", 1.0), ("Azul 20u", 1.0), ("Gris 20u", 1.0), ("Mentol 20u", 1.03),
                             ("Rojo 10u", 0.53), ("Azul 10u", 0.53), ("Gris 10u", 0.53), ("Mentol 10u", 0.55)],
                            [""]),
            "Tabaco para armar": ([("Tabaco armar Andes", 4500), ("Tabaco armar Pampa", 4300),
                                   ("Tabaco armar Puerto", 4700), ("Tabaco armar Sur", 4400)],
                                  [("30g", 1.0), ("50g", 1.6)], [""]),
            "Accesorios": ([("Encendedor", 700), ("Papelillos", 600), ("Filtros", 900),
                            ("Encendedor recargable", 2500)], SIN, [""]),
        },
    },
    "Café": {
        "cantidad": 40, "margen": (0.62, 0.74),
        "sub": {
            "Café caliente": ([("Americano", 1700), ("Espresso", 1500), ("Cortado", 1800),
                               ("Cappuccino", 2200), ("Latte", 2200), ("Mocaccino", 2500),
                               ("Latte Vainilla", 2500), ("Latte Caramelo", 2500),
                               ("Chocolate caliente", 2100), ("Té", 1200)],
                              [("Chico", 0.85), ("Mediano", 1.0), ("Grande", 1.2)], [""]),
            "Bebida fría": ([("Frappé Café", 2900), ("Frappé Mocca", 3100), ("Café Helado", 2500),
                             ("Chai Latte", 2600), ("Matcha Latte", 2900)],
                            [("Mediano", 1.0), ("Grande", 1.2)], [""]),
        },
    },
    "Comida": {
        "cantidad": 200, "margen": (0.38, 0.55),
        "sub": {
            "Sándwiches": ([("Sándwich Ave Palta", 3300), ("Sándwich Ave Mayo", 2900),
                            ("Sándwich Jamón Queso", 2500), ("Barros Luco", 3900),
                            ("Churrasco Italiano", 4500), ("Sándwich Vegetariano", 3200),
                            ("Sándwich Mechada", 4200), ("Lomito Italiano", 4300),
                            ("Sándwich Atún", 3000), ("Sándwich Pollo Pesto", 3500)],
                           [("Pan frica", 1.0), ("Pan marraqueta", 1.0), ("Pan integral", 1.05),
                            ("Pan ciabatta", 1.1), ("Pan baguette", 1.1), ("Pan hallulla", 0.95),
                            ("Pan amasado", 1.0)], [""]),
            "Hot dogs": ([("Completo Italiano", 2200), ("Completo Clásico", 2000),
                          ("Completo Dinámico", 2400), ("Completo Tomate Mayo", 1900),
                          ("Vienesa Sola", 1300), ("As Italiano", 3500)],
                         [("Normal", 1.0), ("XL", 1.35), ("Doble", 1.7), ("Combo bebida", 1.45)], [""]),
            "Empanadas": ([("Empanada Pino", 2300), ("Empanada Queso", 1900), ("Empanada Napolitana", 2200),
                           ("Empanada Pollo", 2300), ("Empanada Camarón Queso", 2800),
                           ("Empanada Champiñón Queso", 2300)],
                          [("Horno", 1.0), ("Frita", 0.95), ("Cóctel x6", 1.3), ("Cóctel x12", 2.3)], [""]),
            "Pizza y wraps": ([("Pizza Pepperoni", 2500), ("Pizza Napolitana", 2300), ("Pizza Hawaiana", 2500),
                               ("Pizza Vegetariana", 2400), ("Wrap Pollo César", 3200),
                               ("Wrap Vegetariano", 2900), ("Wrap Carne Mexicana", 3400)],
                              [("Porción", 1.0), ("Individual", 1.6), ("Combo bebida", 1.4)], [""]),
            "Bollería": ([("Croissant Mantequilla", 1100), ("Croissant Jamón Queso", 1900),
                          ("Muffin Chocolate", 1400), ("Muffin Arándano", 1400), ("Medialuna", 700),
                          ("Berlín Crema", 1000), ("Queque Naranja", 1200), ("Brownie", 1300),
                          ("Cookie Chips", 1000), ("Donut Glaseado", 1100), ("Pan de Pascua Porción", 1300),
                          ("Cinnamon Roll", 1600)],
                         [("Unidad", 1.0), ("Pack x2", 1.85), ("Pack x4", 3.4), ("Bandeja x6", 4.8)], [""]),
            "Ensaladas y bowls": ([("Ensalada César", 3500), ("Ensalada Chilena", 2500),
                                   ("Ensalada Quínoa", 3800), ("Bowl Pollo Arroz", 4200),
                                   ("Bowl Vegano", 4000), ("Fruta Picada", 1900), ("Yogurt Parfait", 2100),
                                   ("Huevos Duros x2", 1100)],
                                  [("Chica", 0.8), ("Mediana", 1.0), ("Grande", 1.25)], [""]),
        },
    },
    "Góndola": {
        "cantidad": 800, "margen": (0.24, 0.36),
        "sub": {
            "Snacks salados": ([("Papas fritas Lisas", 1500), ("Papas fritas Onduladas", 1600),
                                ("Papas fritas Pimienta", 1600), ("Papas fritas Queso", 1600),
                                ("Ramitas", 1200), ("Maní Salado", 1300), ("Mix Frutos Secos", 2200),
                                ("Nachos Queso", 1700), ("Suflés", 1100), ("Palitos Salados", 1000),
                                ("Chips Camote", 1900)],
                               [("40g", 0.5), ("150g", 1.0), ("250g", 1.6)], TODAS),
            "Galletas": ([("Galletas Chocolate", 900), ("Galletas Vainilla", 800), ("Galletas Limón", 800),
                          ("Galletas Agua", 700), ("Galletas Soda", 700), ("Galletas Avena", 1000),
                          ("Galletas Rellenas Frutilla", 900), ("Wafer Chocolate", 700),
                          ("Wafer Vainilla", 700), ("Galletas Integrales", 1000)],
                         [("Unitaria", 1.0), ("Familiar", 2.4)], TODAS),
            "Chocolates y confites": ([("Chocolate Leche", 1200), ("Chocolate Amargo", 1400),
                                       ("Chocolate Almendras", 1500), ("Chocolate con Maní", 1200),
                                       ("Gomitas Frutales", 900), ("Caramelos Surtidos", 800),
                                       ("Chicle Menta", 500), ("Chicle Frutilla", 500), ("Alfajor", 700),
                                       ("Pastillas Menta", 600), ("Barra Cereal", 500)],
                                      [("Chico", 1.0), ("Grande", 2.2)], TODAS),
            "Abarrotes": ([("Arroz 1kg", 1600), ("Fideos Spaghetti 400g", 1000), ("Fideos Corbatas 400g", 1000),
                           ("Aceite 1L", 2900), ("Azúcar 1kg", 1400), ("Sal 1kg", 600), ("Harina 1kg", 1300),
                           ("Atún Lata", 1900), ("Jurel Lata", 2100), ("Salsa de Tomate", 600),
                           ("Mayonesa 250g", 1500), ("Ketchup 250g", 1300), ("Mostaza 250g", 1100),
                           ("Café Instantáneo 170g", 5500), ("Té 20 bolsitas", 1200),
                           ("Leche en Polvo 800g", 6900), ("Avena 500g", 1500), ("Cereal Chocolate", 3300),
                           ("Cereal Miel", 3300), ("Mermelada Frutilla", 1800), ("Manjar 400g", 2100),
                           ("Pan Molde Blanco", 2600), ("Pan Molde Integral", 2800),
                           ("Sopa Instantánea", 700), ("Puré Instantáneo", 1300), ("Lentejas 1kg", 2300),
                           ("Porotos 1kg", 2700), ("Garbanzos 1kg", 2500), ("Huevos 6u", 1900),
                           ("Huevos 12u", 3500), ("Fideos Instantáneos", 800)], SIN, TODAS),
            "Cuidado personal": ([("Shampoo 400ml", 3500), ("Acondicionador 400ml", 3500), ("Jabón x3", 2300),
                                  ("Pasta Dental", 1900), ("Cepillo Dental", 1500), ("Desodorante", 3200),
                                  ("Toallas Higiénicas", 2200), ("Papel Higiénico 4 rollos", 2400),
                                  ("Papel Higiénico 12 rollos", 6500), ("Pañales M", 9900),
                                  ("Pañales G", 10900), ("Pañales XG", 11900), ("Afeitadora Desechable", 1500),
                                  ("Preservativos x3", 2900), ("Pañuelos Desechables", 600),
                                  ("Toallas Húmedas", 1700), ("Protector Solar", 7900),
                                  ("Bálsamo Labial", 1900)], SIN, TODAS),
            "Limpieza y hogar": ([("Detergente Líquido 1L", 3500), ("Detergente Líquido 3L", 8900),
                                  ("Lavaloza 500ml", 1600), ("Cloro 1L", 1100), ("Limpiador Pisos 1L", 1800),
                                  ("Esponjas x3", 1300), ("Bolsas Basura x10", 1500), ("Servilletas", 900),
                                  ("Toalla de Papel", 2200), ("Insecticida", 3900), ("Fósforos", 400),
                                  ("Velas x6", 1500), ("Carbón 2.5kg", 3900), ("Pilas AA x2", 2500),
                                  ("Pilas AAA x2", 2500), ("Cable USB-C", 4900), ("Cargador Celular", 7900),
                                  ("Paraguas", 6900)], SIN, MARCAS_A),
            "Farmacia y mascotas": ([("Paracetamol 500mg", 1200), ("Ibuprofeno 400mg", 1500),
                                     ("Antiácido", 1900), ("Pastillas Garganta", 1600), ("Curitas x10", 1300),
                                     ("Alimento Perro 1kg", 3500), ("Alimento Gato 1kg", 3900),
                                     ("Snack Perro", 1900), ("Arena Gato 4kg", 4500)], SIN, MARCAS_B),
        },
    },
    "Cooler": {
        "cantidad": 400, "margen": (0.28, 0.42),
        "sub": {
            "Bebidas gaseosas": ([("Bebida Cola", 1000), ("Bebida Cola Zero", 1000), ("Bebida Naranja", 950),
                                  ("Bebida Lima Limón", 950), ("Bebida Piña", 950), ("Ginger Ale", 1000),
                                  ("Agua Tónica", 1050), ("Bebida Frambuesa", 950)],
                                 [("Lata 350ml", 0.9), ("500ml", 1.0), ("1.5L", 1.8), ("2L", 2.1), ("3L", 2.7)],
                                 MARCAS_A),
            "Aguas": ([("Agua Mineral Sin Gas", 800), ("Agua Mineral Con Gas", 850),
                       ("Agua Saborizada Limón", 950), ("Agua Saborizada Pomelo", 950),
                       ("Agua Saborizada Durazno", 950)],
                      [("500ml", 1.0), ("1.6L", 1.7), ("6L", 3.2)], MARCAS_B),
            "Energéticas e isotónicas": ([("Energética Original", 1500), ("Energética Sin Azúcar", 1500),
                                          ("Energética Tropical", 1500), ("Energética Berries", 1500),
                                          ("Isotónica Naranja", 1200), ("Isotónica Uva", 1200),
                                          ("Isotónica Limón", 1200)],
                                         [("250ml", 0.75), ("473ml", 1.0), ("750ml", 1.4)], MARCAS_B),
            "Jugos y tés fríos": ([("Jugo Naranja", 1300), ("Néctar Durazno", 1000), ("Néctar Piña", 1000),
                                   ("Jugo Manzana", 1100), ("Néctar Frutilla", 1000), ("Néctar Multifruta", 1000),
                                   ("Té Frío Limón", 1100), ("Té Frío Durazno", 1100),
                                   ("Limonada Menta Jengibre", 1400)],
                                  [("200ml", 0.55), ("500ml", 1.0), ("1.5L", 1.9)], MARCAS_A),
            "Lácteos": ([("Leche Entera", 1200), ("Leche Semidescremada", 1200), ("Leche Descremada", 1200),
                         ("Leche Sin Lactosa", 1400), ("Leche Chocolate", 1300), ("Leche Frutilla", 1300),
                         ("Bebida Almendra", 2300), ("Bebida Avena", 2200), ("Yogurt Frutilla", 450),
                         ("Yogurt Vainilla", 450), ("Yogurt Natural", 450), ("Yogurt Griego", 800),
                         ("Yogurt Batido", 500), ("Yogurt con Cereal", 700)],
                        [("Individual", 1.0), ("Pack x4", 3.4)], MARCAS_A),
            "Refrigerados": ([("Queso Laminado 250g", 3500), ("Jamón Pierna 250g", 3300),
                              ("Jamón Pavo 250g", 3100), ("Queso Mantecoso 250g", 3600), ("Salame 150g", 2900),
                              ("Mantequilla 250g", 2700), ("Flan", 700), ("Leche Asada", 900),
                              ("Arroz con Leche", 800), ("Mousse Chocolate", 900)], SIN, TODAS),
            "Helados y hielo": ([("Paleta Chocolate", 900), ("Paleta Frutilla", 800), ("Cono Vainilla", 1300),
                                 ("Cono Chocolate", 1300), ("Bombón Helado", 1500), ("Sándwich Helado", 1100),
                                 ("Helado 1L Chocolate", 3900), ("Helado 1L Vainilla", 3700),
                                 ("Helado 1L Tres Sabores", 3900), ("Hielo 2kg", 1500), ("Hielo 5kg", 2900)],
                                SIN, MARCAS_B),
        },
    },
}

# Qué tan popular es cada subcategoría en cada segmento (1 = normal).
POPULARIDAD_SUB = {
    "Carretera": {"Snacks salados": 1.6, "Chocolates y confites": 1.5, "Abarrotes": 0.4,
                  "Cuidado personal": 0.5, "Limpieza y hogar": 0.6, "Farmacia y mascotas": 0.6,
                  "Aguas": 1.5, "Energéticas e isotónicas": 1.8, "Lácteos": 0.6, "Refrigerados": 0.4,
                  "Hot dogs": 1.4, "Sándwiches": 1.3, "Ensaladas y bowls": 0.5},
    "Residencial": {"Snacks salados": 1.0, "Abarrotes": 2.2, "Cuidado personal": 1.6,
                    "Limpieza y hogar": 1.6, "Farmacia y mascotas": 1.4, "Lácteos": 1.8,
                    "Refrigerados": 1.8, "Helados y hielo": 1.3, "Energéticas e isotónicas": 0.7,
                    "Bollería": 1.4, "Ensaladas y bowls": 0.5},
    "Comercial": {"Chocolates y confites": 1.5, "Abarrotes": 0.5, "Cuidado personal": 0.7,
                  "Limpieza y hogar": 0.5, "Aguas": 1.4, "Energéticas e isotónicas": 1.3,
                  "Refrigerados": 0.5, "Ensaladas y bowls": 1.8, "Sándwiches": 1.3,
                  "Pizza y wraps": 1.4},
}


def redondear_precio(p):
    """Precios chilenos típicos: terminan en 90 (ej: 1.290, 2.490)."""
    return int(max(290, round(p / 100) * 100 - 10))


# Cada marca tiene su propio nivel de precio (unas más caras, otras más baratas).
FACTOR_MARCA = {m: f for m, f in zip(TODAS, [1.05, 0.95, 0.90, 1.10, 1.00, 0.97])}

filas = []
for categoria, conf in SUBCATEGORIAS.items():
    pool = []
    for sub, (bases, variantes, marcas) in conf["sub"].items():
        for (base, precio_base), (var, mult), marca in itertools.product(bases, variantes, marcas):
            nombre = " ".join(x for x in [base, var, marca] if x)
            precio = precio_base * mult * FACTOR_MARCA.get(marca, 1.0)
            pool.append((nombre, sub, marca or "Al Paso", precio))
    if len(pool) < conf["cantidad"]:
        raise ValueError(f"Faltan combinaciones en {categoria}: {len(pool)}")
    elegidos = rng.choice(len(pool), conf["cantidad"], replace=False)
    for i in sorted(elegidos):
        nombre, sub, marca, precio = pool[i]
        precio = redondear_precio(precio * rng.uniform(0.95, 1.05))
        margen = rng.uniform(*conf["margen"])
        filas.append({
            "categoria": categoria, "subcategoria": sub, "nombre": nombre, "marca": marca,
            "precio_venta": precio, "costo_unitario": int(round(precio * (1 - margen))),
        })

productos = pd.DataFrame(filas)
prefijo = {"Tabaco": "TAB", "Café": "CAF", "Comida": "COM", "Góndola": "GON", "Cooler": "COO"}
productos.insert(0, "sku", [f"{prefijo[c]}-{i:04d}" for c, i in
                            zip(productos.categoria, productos.groupby("categoria").cumcount() + 1)])

# Popularidad de cada SKU. Combina tres cosas:
#  1) qué tan seguido se compra ese tipo de producto (bebidas más que detergente),
#  2) el precio (lo caro se vende menos), y
#  3) un poco de azar: pocos productos venden mucho y muchos venden poco (Pareto).
POPULARIDAD_BASE = {
    "Cigarrillos": 1.0, "Tabaco para armar": 0.25, "Accesorios": 0.4,
    "Café caliente": 1.0, "Bebida fría": 0.35,
    "Hot dogs": 1.3, "Empanadas": 1.1, "Sándwiches": 1.0, "Bollería": 1.0,
    "Pizza y wraps": 0.7, "Ensaladas y bowls": 0.5,
    "Snacks salados": 1.0, "Chocolates y confites": 1.2, "Galletas": 0.8, "Abarrotes": 0.5,
    "Cuidado personal": 0.2, "Limpieza y hogar": 0.15, "Farmacia y mascotas": 0.2,
    "Bebidas gaseosas": 1.0, "Aguas": 0.9, "Energéticas e isotónicas": 0.7,
    "Jugos y tés fríos": 0.6, "Lácteos": 0.5, "Refrigerados": 0.15, "Helados y hielo": 0.4,
}
SENSIBILIDAD_PRECIO = {"Tabaco": 0.0, "Café": 0.5, "Comida": 0.5, "Góndola": 0.9, "Cooler": 0.9}
# Productos "clásicos" que se venden más que el resto de su tipo.
CLASICOS = {"Americano": 1.8, "Cappuccino": 1.4, "Cortado": 1.2, "Mediano": 1.3, "Latte ": 0.6,
            "Mocaccino": 0.6, "Completo Italiano": 1.8, "Empanada Pino": 1.6, "Ave Palta": 1.4,
            "Barros Luco": 1.2, "Bebida Cola": 2.0, "Agua Mineral Sin Gas": 1.6, "500ml": 1.3,
            "Lata 350ml": 1.3, "20u": 1.5, "Papas fritas Lisas": 1.5, "Chocolate Leche": 1.3,
            "Chicle": 1.3, "Alfajor": 1.3, "Huevos": 2.0, "Pan Molde": 1.8, "Leche Entera": 1.5,
            "Hielo": 1.5, "Encendedor": 1.5}


def bono_clasico(nombre):
    factor = 1.0
    for clave, valor in CLASICOS.items():
        if clave in nombre + " ":
            factor *= valor
    return factor


productos["popularidad"] = 0.0
for cat, idx in productos.groupby("categoria").groups.items():
    sub = productos.loc[idx]
    azar = rng.lognormal(0, 0.6, len(idx))
    precio_rel = sub.precio_venta / sub.precio_venta.median()
    productos.loc[idx, "popularidad"] = (sub.subcategoria.map(POPULARIDAD_BASE) * azar
                                         * precio_rel ** -SENSIBILIDAD_PRECIO[cat]
                                         * sub.nombre.map(bono_clasico))

# Probabilidad de elegir cada SKU dentro de su categoría, por segmento.
prob_sku = {}
for seg in SEGMENTOS:
    pesos = productos.popularidad * productos.subcategoria.map(POPULARIDAD_SUB[seg]).fillna(1.0)
    prob_sku[seg] = {}
    for cat in CATEGORIAS:
        m = productos.categoria == cat
        prob_sku[seg][cat] = (productos.index[m].to_numpy(), (pesos[m] / pesos[m].sum()).to_numpy())

# ---------------------------------------------------------------------------
# 3. COMPORTAMIENTO DE COMPRA POR SEGMENTO
# ---------------------------------------------------------------------------
PARAMS = {
    "Carretera": {
        "tx_base": 900,
        "dia_semana": [0.88, 0.86, 0.88, 0.95, 1.22, 1.08, 1.18],  # lun..dom
        "feriado": 1.35,
        # Probabilidad de que una línea del ticket sea de cada categoría.
        "mix": {"Tabaco": 0.07, "Café": 0.20, "Comida": 0.25, "Góndola": 0.18, "Cooler": 0.30},
        "lineas": [0.34, 0.30, 0.19, 0.10, 0.07],  # P(1, 2, 3, 4, 5 productos)
        "horas": [1.0, 0.7, 0.5, 0.5, 0.7, 1.5, 3.0, 4.5, 5.0, 5.0, 5.0, 5.5, 6.5, 7.0, 6.5,
                  6.0, 6.0, 6.5, 6.5, 5.5, 4.0, 3.0, 2.0, 1.5],
        "pagos": {"Débito": 0.45, "Crédito": 0.25, "Efectivo": 0.18, "App / QR": 0.12},
    },
    "Residencial": {
        "tx_base": 950,
        "dia_semana": [0.92, 0.91, 0.94, 0.97, 1.08, 1.16, 1.02],
        "feriado": 1.10,
        "mix": {"Tabaco": 0.12, "Café": 0.07, "Comida": 0.08, "Góndola": 0.40, "Cooler": 0.33},
        "lineas": [0.38, 0.28, 0.18, 0.10, 0.06],
        "horas": [0, 0, 0, 0, 0, 0, 0, 2.5, 4.0, 3.5, 3.5, 4.0, 5.0, 5.0, 4.5, 4.5, 5.0, 6.0,
                  7.5, 8.0, 7.5, 6.0, 4.0, 0],
        "pagos": {"Débito": 0.48, "Crédito": 0.10, "Efectivo": 0.30, "App / QR": 0.12},
    },
    "Comercial": {
        "tx_base": 1150,
        "dia_semana": [1.12, 1.14, 1.14, 1.12, 1.06, 0.58, 0.42],
        "feriado": 0.45,
        "mix": {"Tabaco": 0.08, "Café": 0.27, "Comida": 0.26, "Góndola": 0.15, "Cooler": 0.24},
        "lineas": [0.45, 0.28, 0.15, 0.07, 0.05],
        "horas": [0, 0, 0, 0, 0, 0, 0, 6.0, 9.5, 8.0, 5.5, 5.5, 8.5, 9.5, 8.0, 5.0, 5.0, 6.5,
                  7.0, 5.0, 3.0, 2.0, 1.5, 0],
        "pagos": {"Débito": 0.50, "Crédito": 0.18, "Efectivo": 0.12, "App / QR": 0.20},
    },
}

# Cómo cambia el interés por cada categoría según la hora (café en la mañana,
# comida al almuerzo, tabaco de noche...).
AJUSTE_HORA = np.ones((24, len(CATEGORIAS)))
for h in range(24):
    cafe = 2.2 if 6 <= h <= 10 else 1.2 if 15 <= h <= 17 else 0.35 if h >= 20 or h <= 4 else 0.8
    comida = 1.9 if 12 <= h <= 14 else 1.1 if 19 <= h <= 21 else 0.9 if 7 <= h <= 10 else 0.6
    tabaco = 1.5 if (h >= 19 or h <= 3) else 0.8 if 7 <= h <= 11 else 1.0
    gondola = 1.25 if 17 <= h <= 22 else 0.85 if h <= 10 else 1.0
    cooler = 1.3 if 12 <= h <= 18 else 0.85
    AJUSTE_HORA[h] = [tabaco, cafe, comida, gondola, cooler]

# Cantidad de unidades por línea: P(1), P(2), P(3)
UNIDADES = {"Tabaco": [0.95, 0.05, 0.0], "Café": [0.91, 0.08, 0.01], "Comida": [0.86, 0.11, 0.03],
            "Góndola": [0.84, 0.12, 0.04], "Cooler": [0.83, 0.13, 0.04]}

# Eventos especiales (para que el dashboard tenga algo que "descubrir").
MAQUINA_CAFE_MALA = ("T15", pd.date_range("2026-10-14", "2026-10-16"))  # sin café 3 días
CORTE_LUZ = ("T08", pd.Timestamp("2026-10-22"), 14)  # cierra a las 14:00

# ---------------------------------------------------------------------------
# 4. TRANSACCIONES
# ---------------------------------------------------------------------------
precios = productos.precio_venta.to_numpy()
costos = productos.costo_unitario.to_numpy()
skus = productos.sku.to_numpy()
cat_codigo = {c: i for i, c in enumerate(CATEGORIAS)}

lista_tx, lista_det = [], []
siguiente_id = 1_000_001

for tienda in tiendas.itertuples():
    p = PARAMS[tienda.segmento]
    horas_w = np.array(p["horas"], dtype=float)
    mix = np.array([p["mix"][c] for c in CATEGORIAS])
    pagos = list(p["pagos"])
    pagos_p = list(p["pagos"].values())

    for fecha in FECHAS:
        factor = p["dia_semana"][fecha.dayofweek]
        if fecha in FERIADOS:
            factor = p["feriado"] * (1.1 if fecha.dayofweek >= 5 else 1.0)
        if fecha.day <= 5 or fecha.day >= 28:   # días de pago de sueldo
            factor *= 1.05
        n_tx = int(p["tx_base"] * tienda.factor_tamano * factor * rng.normal(1, 0.05))

        horas_dia = horas_w.copy()
        mix_dia = np.tile(mix, (24, 1)) * AJUSTE_HORA
        if tienda.id_tienda == MAQUINA_CAFE_MALA[0] and fecha in MAQUINA_CAFE_MALA[1]:
            mix_dia[:, cat_codigo["Café"]] = 0
            n_tx = int(n_tx * 0.80)
        if tienda.id_tienda == CORTE_LUZ[0] and fecha == CORTE_LUZ[1]:
            horas_dia[CORTE_LUZ[2]:] = 0
            n_tx = int(n_tx * horas_dia.sum() / horas_w.sum())
        if tienda.segmento == "Residencial" and fecha == pd.Timestamp("2026-10-31"):
            mix_dia[:, cat_codigo["Góndola"]] *= 1.5   # Halloween: dulces

        mix_dia /= mix_dia.sum(axis=1, keepdims=True)
        cum = mix_dia.cumsum(axis=1)

        hora = rng.choice(24, n_tx, p=horas_dia / horas_dia.sum())
        segundos = hora * 3600 + rng.integers(0, 3600, n_tx)
        orden = np.argsort(segundos)
        segundos, hora = segundos[orden], hora[orden]
        ids = np.arange(siguiente_id, siguiente_id + n_tx)
        siguiente_id += n_tx

        n_lineas = rng.choice([1, 2, 3, 4, 5], n_tx, p=p["lineas"])
        linea_tx = np.repeat(np.arange(n_tx), n_lineas)
        r = rng.random(len(linea_tx))
        cat_linea = (r[:, None] > cum[hora[linea_tx]]).sum(axis=1)
        cat_linea = np.minimum(cat_linea, len(CATEGORIAS) - 1)

        sku_idx = np.empty(len(linea_tx), dtype=int)
        unidades = np.empty(len(linea_tx), dtype=int)
        for ci, cat in enumerate(CATEGORIAS):
            m = cat_linea == ci
            k = m.sum()
            if k:
                indices, prob = prob_sku[tienda.segmento][cat]
                sku_idx[m] = rng.choice(indices, k, p=prob)
                unidades[m] = rng.choice([1, 2, 3], k, p=UNIDADES[cat])

        det = pd.DataFrame({"id_transaccion": ids[linea_tx], "idx": sku_idx, "cantidad": unidades})
        # Si un mismo producto aparece dos veces en un ticket, se suman las unidades.
        det = det.groupby(["id_transaccion", "idx"], as_index=False, sort=False).cantidad.sum()
        det["precio_unitario"] = precios[det.idx]
        det["total_linea"] = det.cantidad * det.precio_unitario
        det["costo_linea"] = det.cantidad * costos[det.idx]
        det["sku"] = skus[det.idx]

        resumen = det.groupby("id_transaccion").agg(
            cantidad_productos=("cantidad", "sum"), total=("total_linea", "sum"))
        tx = pd.DataFrame({
            "id_transaccion": ids,
            "id_tienda": tienda.id_tienda,
            "fecha": fecha.strftime("%Y-%m-%d"),
            "hora": [f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}" for s in segundos],
            "medio_pago": rng.choice(pagos, n_tx, p=pagos_p),
        }).join(resumen, on="id_transaccion")

        lista_tx.append(tx)
        lista_det.append(det[["id_transaccion", "sku", "cantidad", "precio_unitario",
                              "total_linea", "costo_linea"]])

transacciones = pd.concat(lista_tx, ignore_index=True)
detalle = pd.concat(lista_det, ignore_index=True)

# ---------------------------------------------------------------------------
# 5. TABLA RESUMEN (ventas por día, tienda y categoría) — ideal para empezar
# ---------------------------------------------------------------------------
d = detalle.merge(productos[["sku", "categoria"]], on="sku").merge(
    transacciones[["id_transaccion", "id_tienda", "fecha"]], on="id_transaccion")
ventas_diarias = (d.groupby(["fecha", "id_tienda", "categoria"])
                  .agg(transacciones=("id_transaccion", "nunique"), unidades=("cantidad", "sum"),
                       venta=("total_linea", "sum"), costo=("costo_linea", "sum"))
                  .reset_index())
ventas_diarias["margen"] = ventas_diarias.venta - ventas_diarias.costo
ventas_diarias = ventas_diarias.merge(tiendas[["id_tienda", "nombre", "segmento"]], on="id_tienda")
ventas_diarias.insert(1, "dia_semana", pd.to_datetime(ventas_diarias.fecha).dt.dayofweek.map(
    dict(enumerate(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]))))
ventas_diarias["es_feriado"] = pd.to_datetime(ventas_diarias.fecha).isin(FERIADOS).map(
    {True: "Sí", False: "No"})

# ---------------------------------------------------------------------------
# 6. GUARDAR
# ---------------------------------------------------------------------------
# "utf-8-sig" hace que Excel muestre bien los acentos (Café, Góndola...).
tiendas = tiendas.drop(columns="factor_tamano")
productos = productos.drop(columns="popularidad")
feriados = pd.DataFrame([(f.strftime("%Y-%m-%d"), n) for f, n in FERIADOS.items()],
                        columns=["fecha", "feriado"])
tablas = {"tiendas": tiendas, "productos": productos, "transacciones": transacciones,
          "detalle_transacciones": detalle, "ventas_diarias_categoria": ventas_diarias,
          "feriados": feriados}
for nombre, tabla in tablas.items():
    tabla.to_csv(CARPETA / f"{nombre}.csv", index=False, encoding="utf-8-sig")

# Excel con las tablas chicas, listo para abrir y empezar un dashboard.
with pd.ExcelWriter(CARPETA / "tiendas_al_paso_resumen.xlsx") as excel:
    for nombre in ["ventas_diarias_categoria", "tiendas", "productos", "feriados"]:
        tablas[nombre].to_excel(excel, sheet_name=nombre[:31], index=False)

print(f"Tiendas: {len(tiendas)} | SKU: {len(productos)}")
print(f"Transacciones: {len(transacciones):,} | Líneas de detalle: {len(detalle):,}")
