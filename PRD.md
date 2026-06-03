# PRD: gcode - Online Code Editor

## 1. Resumen

gcode es un editor de código online (similar a CodePen/JSFiddle) que permite escribir HTML, CSS y JavaScript en tres paneles divididos y visualizar una vista previa en vivo en un iframe. También soporta editores adicionales para otros lenguajes (Python, Java, C#, PHP, TypeScript, SQL, etc.) que reemplazan la vista previa. El estado del editor se persiste en la URL mediante codificación Base64, permitiendo URLs compartibles.

**URL:** https://code.geduma.com

---

## 2. Objetivos del Producto

- Proveer un editor de código rápido, liviano y funcional directamente en el navegador
- Permitir compartir snippets de código mediante URLs autocontenidas (sin backend)
- Soportar edición en vivo con vista previa instantánea para HTML/CSS/JS
- Ofrecer paneles adicionales para lenguajes de propósito general (Python, Java, C#, etc.)
- Ser deployable como SPA estática (Azure Static Web Apps) sin servidor

---

## 3. Stack Tecnológico

| Capa         | Tecnología         | Versión | Propósito                          |
| ------------ | ------------------ | ------- | ---------------------------------- |
| Build        | Vite               | ^6.2.0  | Dev server, bundler, HMR           |
| Editor       | Monaco Editor      | 0.36.1  | Editor de código (same engine VS Code) |
| Emmet        | emmet-monaco-es    | 5.2.1   | Abreviaciones HTML/CSS             |
| URL Encoding | js-base64          | 3.7.5   | Codificación de estado en URL      |
| Split Panes  | split-grid         | 1.0.11  | Paneles redimensionables (CSS Grid) |
| Linting      | standard (JS)      | ^17.0.0 | Estilo de código JavaScript        |
| Runtime      | Node.js            | 22.14.0 | Motor de desarrollo                |
| Hosting      | Azure Static Web Apps | -     | Deploy CI/CD                       |
| Lenguaje     | Vanilla JS (ES Modules) | -   | Sin framework                      |

---

## 4. Arquitectura

```
index.html
  └── src/main.js           (toda la lógica de la app, ~455 líneas)
       ├── src/style.css     (todos los estilos, ~341 líneas)
       └── src/utils/
            ├── configurePrettier.js  (atajos de teclado Monaco)
            └── editor-hotkeys.js     (código comentado/no usado)
public/                       (assets estáticos: SVGs, iconos)
dist/                         (build output generado por Vite)
```

**Flujo de datos:**
1. `init()` → `createLoader()` (splash 500ms), `loadCustomList()`, `createCopyBtns()`, `createEditors()`, `update()`
2. `getHashValue()` lee `window.location.pathname` y decodifica Base64 los valores de los editores
3. Se crean 4 instancias de Monaco Editor (HTML, CSS, JS, CUSTOM)
4. `onDidChangeModelContent` gatilla `update()` → renderiza el iframe + actualiza la URL
5. El editor JS tiene debounce de 1s para evitar re-renders excesivos

---

## 5. Features / Funcionalidades

### 5.1 Core
- **Editor HTML/CSS/JS:** Tres paneles de código con resaltado de sintaxis, autocompletado, y Emmet
- **Vista previa en vivo:** iframe con `srcdoc` que se actualiza al escribir
- **Persistencia en URL:** Todo el código se guarda en la URL (pathname + Base64)
- **URLs compartibles:** Copiar URL con el estado actual del editor
- **Embed mode:** Prefix `/embed` en la URL oculta los controles y permite embeber en iframes

### 5.2 Layout
- **Paneles redimensionables:** 3 filas (HTML, CSS, JS) + columna para preview, usando split-grid
- **Diálogo de Layout:** Permite ocultar/mostrar paneles (HTML, CSS, JS, preview)
- **Editor personalizado:** Selector de lenguaje (C#, PHP, Python, Java, JSON, Shell, SQL, TypeScript, XML, Markdown) que reemplaza los otros paneles

### 5.3 UI/UX
- **Tema oscuro:** Único tema (vs-dark de Monaco)
- **Loader animado:** Splash screen de 500ms al cargar
- **Copy buttons:** Botón por editor para copiar contenido al portapapeles
- **Tooltips "copied!":** Feedback visual al copiar
- **Atajo de teclado:** Ctrl/Cmd + Enter abre el diálogo de layout; Escape lo cierra
- **Responsive:** En dispositivos táctiles se oculta la barra de footer

### 5.4 Atajos de Teclado (Monaco)
- **Ctrl/Cmd + P:** Abre la paleta de comandos rápida (vía `configurePrettier.js`)

### 5.5 Footer Controls
| Botón         | Acción                                  |
| -------------- | --------------------------------------- |
| Shortcuts      | Placeholder (deshabilitado)             |
| Layout         | Abre diálogo para configurar paneles    |
| Copy URL       | Copia la URL actual al portapapeles     |
| Open Editor    | Abre la URL en una nueva pestaña        |
| Embed Editor   | Copia snippet `<iframe>` al portapapeles |

---

## 6. Lenguajes Soportados (Custom Editor)

| ID | Lenguaje   | ID  | Lenguaje   |
| -- | ---------- | --- | ---------- |
| 5  | C#         | 10  | Shell      |
| 6  | PHP        | 11  | SQL        |
| 7  | Python     | 12  | TypeScript |
| 8  | Java       | 13  | XML        |
| 9  | JSON       | 14  | Markdown   |

---

## 7. Formato de URL

```
/{layouts}|{html_base64}|{css_base64}|{js_base64}|{custom_base64}
```

- `layouts`: IDs separados por coma (1=html, 2=css, 3=js, 4=preview, 5-14=custom editors)
- Cada valor de editor está codificado en Base64 (js-base64)
- `/embed` prefix activa embed mode
- Si todos los editores están vacíos, la URL contiene solo layouts

---

## 8. CI/CD

**Plataforma:** Azure Static Web Apps
**Trigger:** Push a `main`
**Workflow:** `.github/workflows/azure-static-web-apps-lemon-glacier-0cb89860f.yml`

Pasos:
1. Checkout del repositorio
2. Build con Vite (`npm run build`)
3. Deploy a Azure SWA con token de API

**SPA Fallback:** `staticwebapp.config.json` rewrites todas las rutas a `/index.html`

---

## 9. Build & Deploy (Local)

| Comando             | Acción                          |
| ------------------- | ------------------------------- |
| `npm run dev`       | Inicia servidor de desarrollo   |
| `npm run build`     | Genera build en `dist/`         |
| `npm run preview`   | Sirve el build localmente       |

---

## 10. Testing

**No existe suite de testing.** No hay frameworks, archivos ni comandos de test configurados.

---

## 11. Estructura de Archivos

```
gcode/
├── .github/workflows/azure-static-web-apps-lemon-glacier-0cb89860f.yml
├── .gitignore
├── index.html                     # Entry point HTML
├── package.json                   # Dependencias y scripts
├── package-lock.json
├── staticwebapp.config.json       # Config Azure SWA
├── README.md
├── public/                        # Assets estáticos
│   ├── cancel.svg
│   ├── clipboard.svg
│   ├── gcode-icon.ico / .png
│   ├── gcode.png
│   └── {language}.svg             # 16 SVGs de lenguajes
├── src/
│   ├── main.js                    # Lógica principal (~455 líneas)
│   ├── style.css                  # Todos los estilos (~341 líneas)
│   └── utils/
│       ├── configurePrettier.js   # Atajos Prettier/Command Palette
│       └── editor-hotkeys.js      # Código legacy comentado (no usado)
└── dist/                          # Build output (generado)
```

---

## 12. Convenciones del Código

- **Vanilla JS sin frameworks** — manipulación directa del DOM
- **ES Modules** — `import`/`export` en todo el código
- **StandardJS** — linting con reglas `standard`
- **CSS Custom Properties** — `--custom-editor` para ícono dinámico del editor custom
- **CSS Grid** — layout responsivo con split-grid
- **Sin TypeScript** — todo en JS plano
- **Tema oscuro únicamente** — sin toggle de modo claro
- **Nombres de funciones en camelCase** — `createEditor`, `setLayout`, `getHashValue`

---

## 13. Limitaciones Conocidas

- Sin tests automatizados
- Sin type checking (TypeScript)
- `editor-hotkeys.js` está comentado y no se importa en `main.js`
- Botón "Shortcuts" en footer es un placeholder deshabilitado
- Sin soporte multi-tema (solo dark mode)
- Sin soporte i18n
- No hay manejo de errores para decodificación Base64 inválida en URL

---

## 14. Historial de Commits (Reciente)

- `df79306` fix: update editor URL and add Node.js engine version
- `6e24e4b` Merge branch 'dev' into dev (repo ownership transfer)
- `489f87f` fix: rename owner repo (geduramc → geduma)
- `28f7356` ci: update node version
- `c8ca7dc` ci: update staticwebapp.config file
- `a3cc3b4` ci: update node version
- `cd878b4` ci: update vite version
- `818c952` ci: update deps versions
- Commits previos: CI/CD setup inicial, desarrollo de funcionalidades core en branch `dev`
