import './style.css'
import Split from 'split-grid'
import { encode, decode } from 'js-base64'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import JsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { emmetHTML } from 'emmet-monaco-es'
import { configurePrettierHotkeys } from './utils/configurePrettier'

const el = selector => document.querySelector(selector)
const TEMPLATE = '<!DOCTYPE html><html lang="en"><head> <style>CSS_EDITOR</style></head><body style="background-color: #333333;">HTML_EDITOR<script>JS_EDITOR</script></body></html>'
const HTML_CONTAINER = el('#html')
const CSS_CONTAINER = el('#css')
const JS_CONTAINER = el('#js')
let EDITORS = null

window.MonacoEnvironment = {
  getWorker (_, label) {
    switch (label) {
      case 'html': return new HtmlWorker()
      case 'javascript': return new JsWorker()
      case 'css': return new CssWorker()
      default: return new EditorWorker()
    }
  }
}

Split({
  columnGutters: [{
    track: 1,
    element: el('.gutter-col-1')
  }],
  rowGutters: [{
    track: 1,
    element: document.querySelector('.gutter-row-1')
  }, {
    track: 3,
    element: document.querySelector('.gutter-row-2')
  }]
})

const getHashValue = () => {
  const { pathname } = window.location
  const [html, css, js] = pathname.slice(1).split('%7C')
  return {
    html: html ? decode(html) : '',
    css: css ? decode(css) : '',
    js: js ? decode(js) : ''
  }
}

const createHTML = ({ html, css, js }) => {
  return TEMPLATE
    .replace('HTML_EDITOR', html)
    .replace('CSS_EDITOR', css)
    .replace('JS_EDITOR', js)
}

const createEditor = ({ el, value, language }) => {
  return monaco.editor.create(el, {
    value,
    language,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    scrollBeyondLastLine: false,
    roundedSelection: false,
    padding: {
      top: 16
    },
    fontFamily: "'Cascadia Code PL', 'Menlo', 'Monaco', 'Courier New', 'monospace'",
    fontLigatures: 'on',
    fontSize: 12,
    tabSize: 2,
    minimap: {
      enabled: false
    },
    preserveGrid: true,
    theme: 'vs-dark',
    sidebar: 'default',
    autoIndent: true,
    formatOnPaste: true,
    formatOnType: true,
    lineNumbers: 'off',
    wordWrap: 'on'
  })
}

const createEditors = () => {
  const values = getHashValue()
  return {
    HTML: createEditor({ el: HTML_CONTAINER, value: values.html, language: 'html' }),
    CSS: createEditor({ el: CSS_CONTAINER, value: values.css, language: 'css' }),
    JS: createEditor({ el: JS_CONTAINER, value: values.js, language: 'javascript' })
  }
}

const notEmpty = () => {
  return (EDITORS.HTML.getValue().length > 0 || EDITORS.CSS.getValue().length > 0 || EDITORS.JS.getValue().length > 0)
}

const update = () => {
  el('iframe').setAttribute('srcdoc', createHTML({
    html: EDITORS.HTML.getValue(),
    css: EDITORS.CSS.getValue(),
    js: EDITORS.JS.getValue()
  }))

  if (notEmpty()) {
    const hash = `${encode(EDITORS.HTML.getValue())}|${encode(EDITORS.CSS.getValue())}|${encode(EDITORS.JS.getValue())}`
    window.history.replaceState(null, null, `/${hash}`)
  } else window.history.replaceState(null, null, '/')
}

const init = () => {
  EDITORS = createEditors()
  EDITORS.HTML.onDidChangeModelContent(update)
  EDITORS.CSS.onDidChangeModelContent(update)
  EDITORS.JS.onDidChangeModelContent(update)

  configurePrettierHotkeys([EDITORS.HTML, EDITORS.CSS, EDITORS.JS])
  emmetHTML(monaco)
  // initializeEventsController({ HTML_CONTAINER, CSS_CONTAINER, JS_CONTAINER })

  update()
}

init()
