# AGENTS.md — gcode Project Guide

This file is intended for AI coding agents to understand the project conventions, workflows, and patterns used in gcode.

---

## 1. Project Overview

**gcode** is a browser-based online code editor (like CodePen/JSFiddle). Users write HTML, CSS, and JavaScript in split panes and see a live preview in an iframe. State persists in the URL via lz-string compression in the hash fragment. Hosted at https://code.geduma.com.

**Tech Stack:** Vite + Monaco Editor + split-grid + lz-string + js-base64 + emmet-monaco-es (Vanilla JS, no framework)

**Node version:** 22.14.0 (engines requirement)

---

## 2. Available Scripts

| Command             | Action                          |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start Vite dev server (HMR)     |
| `npm run build`     | Build to `dist/`                |
| `npm run preview`   | Serve built output locally      |
| `npx standard`      | Lint JS files (StandardJS)      |

---

## 3. Project Structure

```
gcode/
├── index.html                    # HTML shell (Monaco containers, dialog, footer)
├── package.json                  # Dependencies, scripts, eslintConfig
├── staticwebapp.config.json      # Azure SWA SPA fallback
├── .github/workflows/            # Azure SWA CI/CD (push to main)
├── public/                       # Static assets copied as-is to dist/
│   ├── cancel.svg                # Dialog close button
│   ├── clipboard.svg             # Copy button icon
│   ├── gcode-icon.ico/.png       # Favicon
│   ├── gcode.png                 # README hero image
│   └── {language}.svg            # 16 language icons (csharp, css, html, java, js, json, markdown, php, python, shell, sql, typescript, xml)
├── src/
│   ├── config.js                 # Constants and configuration (~50 lines)
│   ├── editor.js                 # Monaco engine + URL state + layout management (~290 lines)
│   ├── main.js                   # Orchestrator: UI, init, event wiring (~260 lines)
│   ├── style.css                 # All styles (~341 lines)
│   └── utils/
│       ├── configurePrettier.js  # Re-layouts editors on resize + Ctrl/Cmd+P quick command
│       └── editor-hotkeys.js     # Legacy code, NOT imported anywhere
└── dist/                         # Build output (gitignored)
```

---

## 4. Code Conventions

### 4.1 General
- **Vanilla JS** — no React, Vue, or any framework
- **ES Modules** — `import`/`export` syntax (`"type": "module"` in package.json)
- **StandardJS linting** — `eslintConfig` extends `standard`, no `.eslintrc` file
- **No TypeScript** — plain JavaScript
- **camelCase** for function and variable names

### 4.2 Module Architecture (3 files)

The codebase is split into 3 files by responsibility, with a unidirectional dependency chain:

```
config.js (data)  ←  editor.js (engine)  ←  main.js (shell)
```

No circular dependencies: `config.js` imports nothing, `editor.js` imports only from `config.js`, `main.js` imports from both.

#### `src/config.js` (~50 lines) — Constants & Configuration
Pure data, no logic. Contains:
- `el()` helper (`document.querySelector`)
- `TEMPLATE` (preview iframe srcdoc)
- DOM element references (`HTML_CONTAINER`, `CSS_CONTAINER`, etc.)
- `INITIAL_LAYOUTS`, `ENUM_LAYOUTS`, `CUSTOM_EDITORS`

#### `src/editor.js` (~235 lines) — Engine (Monaco + URL + Layout)
All editor domain logic. Internal helpers are not exported:
- **Internal:** `createTemplate()`, `getActiveLayouts()`, `updateLayouts()`, `toggleEditor()`
- **Exported:** `createEditor()`, `createEditors(onUpdate)`, `loadCustomList()`, `createCustomEditor(EDITORS)`, `getHashValue()`, `setHashUrl(EDITORS)`, `notEmpty(EDITORS)`, `setLayout(EDITORS)`

Functions that need `EDITORS` receive it as a parameter (injected by `main.js`). This avoids globals and keeps the module testable.

Key patterns:
- `createEditors(onUpdate)` accepts a callback instead of calling `update()` directly — avoids circular dependency with `main.js`
- `getHashValue()` returns `{ html, css, js, custom, embedded }` instead of setting a global `EMBEDDED` flag — the caller decides what to do with the embed state

#### `src/main.js` (~232 lines) — Orchestrator (UI + Init + Events)
Thin shell that wires everything together:
- `EDITORS` global (the only mutable global state)
- `Split()` gutter initialization
- `update()` — renders iframe via `createTemplate()` + saves URL via `setHashUrl()`
- UI functions: `copyToClipBoard()`, `createLoader()`, `createCopyBtns()`, `openDialog()`, `closeDialog()`, `embedConfig()`
- `init()` boot sequence and all event listeners

No Monaco imports, no URL encoding/decoding, no layout state logic — just orchestration.

### 4.3 Editors Configuration
- 4 Monaco editors: HTML, CSS, JS, CUSTOM
- Same config for all editors (dark theme, word wrap, padding 16px top, no minimap, font ligatures on)
- `CUSTOM_EDITORS` array in `config.js` defines 10 additional languages (id 5-14)
- Dynamic language switching via `monaco.editor.setModelLanguage(model, language)`
- Console panel (id 15) is NOT a Monaco editor — it's a read-only `<div>` for JS console output, placed in the preview column`

### 4.4 Layout System
- CSS Grid-based layout managed by `split-grid` library
- Grid has 2 columns (editors | preview) with `.gutter-col-1`
- Editor rows are in `.grid-rows` with `.gutter-row-1` (after HTML) and `.gutter-row-2` (after CSS)
- Preview column is a flex column: iframe (flex:1) + console gutter + console panel (fixed height)
- Layout dialog toggles `.off` class on layout elements and adjusts `gridTemplateColumns`/`gridTemplateRows`
- When a single custom editor is active (id 5-14), all other editors hidden, `--custom-editor` CSS custom property set for the language badge icon

### 4.5 URL State
- Format (hash fragment): `#/{layouts}|{html}|{css}|{js}|{custom}` compressed with lz-string `compressToEncodedURIComponent`
- `setHashUrl()`: reads editors, combines into one payload string, compresses with lz-string, writes to `window.history.replaceState` with `#/` prefix
- `getHashValue()`: reads from `window.location.hash`, decompresses with lz-string. Falls back to pathname + `js-base64` `decode()` for legacy URLs
- If editors are empty, payload contains only layouts (no `|` delimiters after)
- `/embed` prefix in pathname activates embed mode (data still in hash)

### 4.6 Event Listeners
Registered at module level (after function definitions, before `init()`):
- `.close-dialog-btn` → `closeDialog()`
- `.copy` → `copyToClipBoard` with URL
- `.embed` → `copyToClipBoard` with `<iframe>` snippet
- `.layout` → `openDialog()`
- `.open` → `window.open()`
- `select` change → toggle custom editor, reset layouts, update
- Layout elements click → toggle `.off` class, reset custom editor, update
- `keydown` → Escape closes dialog, Ctrl+Enter opens dialog

### 4.7 Copy to Clipboard
- `copyToClipBoard({ pattern, text, position })` creates a "copied!" tooltip span
- Falls back to `document.execCommand('copy')` if `navigator.clipboard` unavailable
- Tooltip auto-removes after 1s

### 4.8 Console Panel
- Toggleable section (id 15) that shares space with the preview iframe in the right column
- Not a Monaco editor — a read-only scrolling `<div>` with monospace font
- **Capture mechanism:** `CONSOLE_CAPTURE` script injected at the top of user JS in `preview.js` → wrapps `console.log/warn/error/info/debug` via `postMessage` to parent
- Also captures `window.onerror` and `unhandledrejection` events
- **UI:** Color-coded entries (gray=log, blue=info, yellow=warn, red=error, dim=debug)
- Console **clears** automatically on each iframe refresh (`update()`)
- Resizable via drag handler on `.gutter-console` (stores height in `CONSOLE_HEIGHT` variable, min 60px)

---

## 5. CSS Conventions
- **Dark theme only** — `color-scheme: dark`, background `#242424`
- **CSS Grid** — layout uses `.grid` with `grid-template-columns`/`rows`
- **Custom properties** — `--custom-editor` drives editor language badge (`background-image`)
- **`.editor::after` pseudo-elements** — language badges (SVG icons) for each editor pane
- **`.off` class** — toggles visibility/state of layout elements (red border)
- **Responsive** — `@media (hover: none) and (pointer: coarse)` hides footer controls on mobile
- No CSS-in-JS, no preprocessors

---

## 6. CI/CD

**GitHub Actions** (`.github/workflows/azure-static-web-apps-lemon-glacier-0cb89860f.yml`):
- Trigger: push to `main`
- Builds with Vite
- Deploys to Azure Static Web Apps (`app_location: "/"`, `output_location: "dist"`)
- Requires `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_GLACIER_0CB89860F` secret

**Azure SWA config** (`staticwebapp.config.json`):
- SPA fallback rewrites all routes to `/index.html`
- Excludes `/assets/*` and image files from rewrite

---

## 7. Adding a New Language to Custom Editor

1. Add an SVG icon to `public/{name}.svg`
2. Add entry to `CUSTOM_EDITORS` array in `src/config.js`:
   ```js
   { id: <next_id>, name: '<name>', language: '<monaco-language-id>' }
   ```
3. Monaco supports the language natively; no additional config needed

---

## 8. Testing

**No test suite exists.** No test framework, no test files, no test command in `package.json`.

---

## 9. Known Tech Debt / TODOs

- `src/utils/editor-hotkeys.js` is imported nowhere; contains commented copy URL shortcut
- `index.html` has inline `<style>` before `<body>` (sets `#app` and `footer` to `display: none` for loader)
- Button "Shortcuts" in footer was a `.disabled` placeholder (now functional)
- `vite.config.js` does not exist (using Vite defaults)
- No error handling for malformed Base64 in URL
- No loading/error states for iframe preview
- Copy URL and Embed share the same `copyToClipBoard` function but with `position: 'top'` — positioning logic has potential edge cases

---

## 10. Key Constants (from `src/config.js`)

| Constant           | Value                     | Purpose                     |
| ------------------ | ------------------------- | --------------------------- |
| `TEMPLATE`         | HTML template string      | Preview iframe srcdoc       |
| `INITIAL_LAYOUTS`  | `'1,2,3,4'`               | Default layout (all panes)  |
| `ENUM_LAYOUTS`     | `{html:1, css:2, js:3, preview:4}` | Layout ID mapping |
| `CUSTOM_EDITORS`   | Array of 10 languages     | Custom editor options       |

---

## 11. Environment Setup

```bash
# Ensure correct Node version
nvm use 22.14.0  # or use your version manager of choice

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
