# Yishu Studio Col — Catálogo web (resumen técnico completo)

## Qué es esto

Sitio web estático (HTML/CSS/JS puro, sin frameworks ni build) que sirve como catálogo de productos impresos en 3D para la marca Yishu Studio Col. Estructura: sección Halloween → sección Navidad → catálogo general organizado por categorías. Las dos secciones de temporada son temporales pero NO se ocultan solas — Lorena las quita manualmente cuando quiera.

## Dónde están los archivos

**En el computador de Lorena (Windows):**
```
C:\Users\DIGITRON\Desktop\yishu-studio-col\
```

Estructura interna:
```
yishu-studio-col/
├── index.html
├── css/styles.css
├── js/app.js
├── data/products.js        (variable global YISHU_DATA con los 70 productos)
├── assets/
│   ├── logo/                (logo-mark-red.png es el que está en uso)
│   ├── fonts/PanfletaStencil-ExtraBold.ttf
│   └── products/             (fotos 1.png...71.webp, más subcarpetas de galería:
│                              11-gallery/, 38-gallery/, 40-gallery/)
└── .gitignore
```

Ya se verificó que los 90 archivos llegaron completos y con el tamaño correcto.

## Repositorio de GitHub

- URL: `https://github.com/chloe3d-hub/Catalogo.git`
- Estado actual: **vacío**, el código todavía no se ha subido.
- El token que Lorena compartió en el chat **nunca se usó** — el push fue rechazado antes de llegar a ejecutarse, así que no hay ninguna escritura pendiente ni riesgo de eso. Aun así, como quedó escrito en el chat, lo mejor es revocarlo o generar uno nuevo desde GitHub y que sea Claude Code (o GitHub Desktop) quien inicie sesión directamente con la cuenta de Lorena, en vez de reutilizar ese token.

## Qué falta para terminar el despliegue (para hacer con Code o GitHub Desktop)

1. Conectar la carpeta local como repo de git (`git init` si aún no lo es, o verificar que el `.git/` ya existe).
2. `git remote add origin https://github.com/chloe3d-hub/Catalogo.git`
3. `git add .` y `git commit`
4. `git push -u origin main`
5. En GitHub: **Settings → Pages → Source: Deploy from a branch → main → /(root)** → Save.
6. GitHub entrega una URL tipo `https://chloe3d-hub.github.io/Catalogo/` — esa es la que se puede abrir desde cualquier celular sin el problema de `file://` local.

## Funcionalidad ya construida (completa)

- **Estructura:** Halloween → Navidad → Catálogo general, organizado en categorías (12 categorías en total).
- **70 productos** (el ítem 63 se eliminó porque su foto traía marca de agua de terceros "Craft3d by Tina"; el ítem 44 se dejó tal cual, sin más cambios).
- **Cada producto** abre WhatsApp al número **57 3173802682** con mensaje prellenado: *"¡Hola! Me interesó el [nombre del producto] ($[precio]) y quisiera comprarlo / tengo unas preguntas."* Los productos personalizables (adornos navideños 12/13/14, llaveros 47/48/49, caja 51) usan este mismo mensaje normal — decisión explícita de Lorena, sin variante especial.
- **Ítem 40** (stand personalizado para negocios) es la excepción: muestra rango de precio ("$40.000 - $60.000 según complejidad, escríbanos") y botón "Cotizar por WhatsApp" en vez de precio fijo.
- **Nota de personalización de color** (mismo precio) en cada producto, y **banner de "aceptamos pedidos personalizados"** arriba, abajo, y dentro de cada sección/categoría.
- **Cinta vertical de Instagram** @yishustudiocol estilo revista, en el borde derecho, fuente tipo máquina de escribir.
- **Menú de navegación** generado dinámicamente (`renderNav()` en `js/app.js`) con las 12 categorías reales, no solo 3 fijas.
- **Logo:** se usa la versión roja (`assets/logo/logo-mark-red.png`) porque la versión de fondo oscuro se veía "blanca" sobre el fondo casi negro del sitio.
- **Tipografía:** Google Fonts (Stardos Stencil, Space Mono, Poppins) + la fuente real de marca "Panfleta Stencil" para títulos.

## Problema pendiente: la fuente Panfleta Stencil

El archivo `PanfletaStencil-ExtraBold.ttf` que Lorena subió tiene un defecto real en los glifos de los números del 1 al 9 (se verificó renderizando la fuente de forma independiente al navegador, con Python/PIL — el "0" se ve bien, el resto de dígitos no). Por eso los precios usan la fuente mono en vez de la fuente de marca. Si Lorena consigue otro peso o una nueva exportación del archivo de la fuente, se puede activar en todos lados sin problema.

## Pendiente de verificar una vez esté publicado

- Confirmar que en celular el sitio se vea bien con la URL real de GitHub Pages (el problema anterior de "solo texto en fondo blanco" era muy probablemente causado por navegadores móviles bloqueando CSS/JS/imágenes locales al abrir un archivo `file://` descargado en zip — no un problema del código en sí).

## Archivos clave (para quien continúe el trabajo)

- `index.html` — estructura principal de la página.
- `css/styles.css` — todos los estilos, incluyendo el `@font-face` de Panfleta Stencil.
- `js/app.js` — lógica: construcción de links de WhatsApp, renderizado de tarjetas de producto, navegación dinámica.
- `data/products.js` — los 70 productos como `const YISHU_DATA = {...}` (no usar `fetch()` para leerlo si se abre localmente vía `file://`, por restricciones CORS del navegador — por eso se carga como script normal).

## Nota técnica: por qué esta sesión de chat no pudo hacer push directo

Esta conversación corre en un contenedor aislado en la nube que solo puede salir a internet a través de una lista de repositorios pre-autorizados para la sesión; un repo nuevo no entra ahí y no hay forma de agregarlo desde este lado. Claude Code, corriendo en el computador de Lorena, usa la conexión y las credenciales de git de su propia máquina directamente — sin esa restricción — por eso ahí sí puede conectarse al repo y hacer el push.
