import { encode, decode } from 'js-base64'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import JsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { emmetHTML } from 'emmet-monaco-es'
import { configurePrettierHotkeys } from './utils/configurePrettier'

import {
  el,
  TEMPLATE,
  CUSTOM_EDITORS,
  LAYOUTS_ELEMENTS,
  HTML_CONTAINER,
  CSS_CONTAINER,
  JS_CONTAINER,
  CUSTOM_CONTAINER,
  PREVIEW_CONTAINER,
  CONSOLE_PANEL,
  INITIAL_LAYOUTS,
  ENUM_LAYOUTS
} from './config'

window.MonacoEnvironment = {
  getWorker (_, label) {
    switch (label) {
      case 'html': return new HtmlWorker()
      case 'javascript': return new JsWorker()
      case 'typescript': return new JsWorker()
      case 'css': return new CssWorker()
      case 'json': return new JsonWorker()
      default: return new EditorWorker()
    }
  }
}

// --- Internal helpers ---

const CONSOLE_CAPTURE = ';(function(){var c={};' +
  "['log','warn','error','info','debug'].forEach(function(m){" +
  'c[m]=console[m];console[m]=function(){var a=Array.prototype.slice.call(arguments).map(function(a){try{return typeof a==="object"?JSON.stringify(a,null,2):String(a)}catch(e){return String(a)}});c[m].apply(console,arguments);window.parent.postMessage({type:"console",method:m,args:a},"*")};' +
  '});' +
  "window.onerror=function(m,u,l){window.parent.postMessage({type:'console',method:'error',args:[m+' ('+u+':'+l+')']},'*')};" +
  "window.addEventListener('unhandledrejection',function(e){window.parent.postMessage({type:'console',method:'error',args:['Unhandled Promise: '+e.reason]},'*')})" +
  '})();'

const createTemplate = ({ html, css, js }) => {
  return TEMPLATE
    .replace('HTML_EDITOR', html)
    .replace('CSS_EDITOR', css)
    .replace('JS_EDITOR', CONSOLE_CAPTURE + js)
}

const getActiveLayouts = () => {
  let editors = ''
  LAYOUTS_ELEMENTS.forEach(item => {
    if (item.className.indexOf('off') < 0) editors += `${ENUM_LAYOUTS[item.className.replace('layout-', '')]},`
  })
  editors = editors.slice(0, -1)

  if (el('.layout-custom').className.indexOf('off') < 0) editors = el('select').value

  return editors
}

const updateLayouts = (layouts) => {
  const layoutsArr = layouts.split(',')

  LAYOUTS_ELEMENTS.forEach(item => {
    if (!layoutsArr.includes(ENUM_LAYOUTS[item.className.replace('layout-', '')].toString())) item.classList.add('off')
  })

  let customFlag = true
  CUSTOM_EDITORS.forEach(item => {
    if (layoutsArr.includes(item.id.toString())) {
      customFlag = false
      el('select').value = layouts
    }
  })

  if (customFlag) el('.layout-custom').classList.add('off')

  setLayout(null)
}

const isCustomEditor = (id) => CUSTOM_EDITORS.some(x => x.id === Number(id))

const toggleEditor = (elements, EDITORS) => {
  const actives = getActiveLayouts().split(',')

  elements.forEach(el => {
    if (!actives.includes(ENUM_LAYOUTS[el.getAttribute('id')].toString())) el.style.display = 'none'
    else el.style.display = 'block'
  })

  if (actives.length === 1 && isCustomEditor(actives[0])) {
    CUSTOM_CONTAINER.style.display = 'block'
    document.documentElement.style.setProperty('--custom-editor', `url('/${CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language}.svg')`)
    if (EDITORS) createCustomEditor(EDITORS)
  } else CUSTOM_CONTAINER.style.display = 'none'
}

// --- Exported functions ---

const createEditor = ({ el, value, language }) => {
  return monaco.editor.create(el, {
    value,
    language,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    scrollBeyondLastLine: false,
    roundedSelection: false,
    padding: { top: 16 },
    fontFamily: "'Cascadia Code PL', 'Menlo', 'Monaco', 'Courier New', 'monospace'",
    fontLigatures: 'on',
    fontSize: 12,
    tabSize: 2,
    minimap: { enabled: false },
    preserveGrid: true,
    theme: 'vs-dark',
    sidebar: 'default',
    autoIndent: true,
    formatOnPaste: true,
    formatOnType: true,
    wordWrap: 'on'
  })
}

const createEditors = (onUpdate) => {
  const values = getHashValue()
  const actives = getActiveLayouts().split(',')
  let timeout = null

  const editors = {
    HTML: createEditor({ el: HTML_CONTAINER, value: values.html, language: 'html' }),
    CSS: createEditor({ el: CSS_CONTAINER, value: values.css, language: 'css' }),
    JS: createEditor({ el: JS_CONTAINER, value: values.js, language: 'javascript' }),
    CUSTOM: createEditor({ el: CUSTOM_CONTAINER, value: values.custom, language: (actives.length === 1 && isCustomEditor(actives[0])) ? CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language : 'plaintext' })
  }

  editors.HTML.onDidChangeModelContent(onUpdate)
  editors.CSS.onDidChangeModelContent(onUpdate)
  editors.JS.onDidChangeModelContent(() => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      onUpdate()
      clearTimeout(timeout)
    }, 1000)
  })
  editors.CUSTOM.onDidChangeModelContent(onUpdate)

  configurePrettierHotkeys([editors.HTML, editors.CSS, editors.JS])
  emmetHTML(monaco)

  return { editors, embedded: values.embedded }
}

const loadCustomList = () => {
  const elList = el('select')
  let elOption = null

  CUSTOM_EDITORS.forEach(item => {
    elOption = document.createElement('option')
    elOption.value = item.id
    elOption.innerText = item.name

    elList.appendChild(elOption)
  })
}

const createCustomEditor = (EDITORS) => {
  const actives = getActiveLayouts().split(',')
  const model = EDITORS.CUSTOM.getModel()
  monaco.editor.setModelLanguage(model, CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language)
}

const getHashValue = () => {
  let { pathname } = window.location
  let embedded = false

  if (pathname.indexOf('/embed') === 0) {
    pathname = pathname.replace('/embed', '')
    embedded = true
  }

  const [layouts, html, css, js, custom] = pathname.slice(1).split('%7C')
  updateLayouts(layouts.length <= 0 ? INITIAL_LAYOUTS : decode(layouts))

  return {
    html: html ? decode(html) : '',
    css: css ? decode(css) : '',
    js: js ? decode(js) : '',
    custom: custom ? decode(custom) : '',
    embedded
  }
}

const setHashUrl = (EDITORS) => {
  let hash = `${encode(getActiveLayouts())}`
  if (notEmpty(EDITORS)) hash += `|${encode(EDITORS.HTML.getValue())}|${encode(EDITORS.CSS.getValue())}|${encode(EDITORS.JS.getValue())}|${encode(EDITORS.CUSTOM.getValue())}`

  window.history.replaceState(null, null, `/${hash}`)
}

const notEmpty = (EDITORS) => {
  return (EDITORS.HTML.getValue().length > 0 || EDITORS.CSS.getValue().length > 0 || EDITORS.JS.getValue().length > 0 || EDITORS.CUSTOM.getValue().length > 0)
}

const setLayout = (EDITORS) => {
  toggleEditor([HTML_CONTAINER, CSS_CONTAINER, JS_CONTAINER, PREVIEW_CONTAINER, CONSOLE_PANEL], EDITORS)

  const actives = getActiveLayouts().split(',')

  const grid = el('.grid')
  const gridRows = el('.grid-rows')

  const htmlOn = actives.includes('1')
  const cssOn = actives.includes('2')
  const jsOn = actives.includes('3')
  const editorCount = [htmlOn, cssOn, jsOn].filter(Boolean).length

  if (actives.includes('4')) {
    if (editorCount > 0) {
      grid.style.gridTemplateColumns = '49.5% 1% 49.5%'
      gridRows.style.display = ''
    } else {
      grid.style.gridTemplateColumns = '100%'
      gridRows.style.display = 'none'
    }
  } else {
    grid.style.gridTemplateColumns = '100%'
    gridRows.style.display = ''
  }

  // Build grid-template-rows: 1fr for active editors, 5px gutters between, 0px for hidden
  const rows = []
  rows.push(htmlOn ? '1fr' : '0px')
  rows.push(htmlOn && cssOn ? '5px' : '0px')
  rows.push(cssOn ? '1fr' : '0px')
  rows.push(cssOn && jsOn ? '5px' : '0px')
  rows.push(jsOn ? '1fr' : '0px')
  gridRows.style.gridTemplateRows = rows.join(' ')

  // Keep editors in grid flow (override toggleEditor's display:none)
  HTML_CONTAINER.style.display = ''
  CSS_CONTAINER.style.display = ''
  JS_CONTAINER.style.display = ''
}

export {
  createEditor,
  createEditors,
  loadCustomList,
  createCustomEditor,
  getHashValue,
  setHashUrl,
  notEmpty,
  setLayout,
  createTemplate
}
