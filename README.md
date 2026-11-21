# Demo Reclamos · Banco Andino (ficticio)

Aplicación web simple para ingresar y gestionar reclamos de clientes de un banco ficticio.
Hecha solo con **HTML, CSS y JavaScript**, sin servidor.

## Páginas

- **`index.html` – Ingresar reclamo:** formulario con nombre, RUT, producto y descripción.
- **`backoffice.html` – Backoffice:** tabla con todos los reclamos, clasificación automática
  (tipo y urgencia), respuesta sugerida y botón "Aprobar".

## Estructura

| Archivo | Qué hace | Concepto |
|---|---|---|
| `index.html`, `backoffice.html` | Estructura de cada página | Frontend (estructura) |
| `css/estilos.css` | Colores, tipografía y diseño | Frontend (presentación) |
| `js/formulario.js` | Valida y envía el formulario | Frontend (interacción) |
| `js/backoffice.js` | Dibuja la tabla y el botón Aprobar | Frontend (interacción) |
| `js/clasificador.js` | Reglas de palabras clave para tipo, urgencia y respuesta | Lógica de negocio |
| `js/almacenamiento.js` | Lee y guarda reclamos en `localStorage` | Almacenamiento / datos |

## Cómo probarla

Abre `index.html` en tu navegador (doble clic). Los datos se guardan solo en ese navegador.

## Publicar en GitHub Pages

En el repositorio: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

## Próximos pasos

- Reemplazar `clasificarReclamo()` en `js/clasificador.js` por una llamada a un LLM.
- Reemplazar `js/almacenamiento.js` por llamadas a una base de datos real.
