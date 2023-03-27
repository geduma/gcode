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
const DIALOG = document.querySelector('dialog')
const OVERLAY = document.querySelector('.overlay')
const LAYOUTS = document.querySelectorAll('.layout-preview,.layout-html,.layout-css,.layout-js')
const ENUM_LAYOUTS = {
  html: 1,
  css: 2,
  js: 3,
  preview: 4
}
let layoutSettings = 1234
let EDITORS = null
let EMBEDDED = false

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
  let { pathname } = window.location

  if (pathname.indexOf('/embed') === 0) {
    pathname = pathname.replace('/embed', '')
    EMBEDDED = true
  }

  const [layouts, html, css, js] = pathname.slice(1).split('%7C')
  layoutSettings = decode(layouts)

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

  setHashUrl()
}

const init = () => {
  EDITORS = createEditors()
  EDITORS.HTML.onDidChangeModelContent(update)
  EDITORS.CSS.onDidChangeModelContent(update)
  EDITORS.JS.onDidChangeModelContent(update)

  configurePrettierHotkeys([EDITORS.HTML, EDITORS.CSS, EDITORS.JS])
  emmetHTML(monaco)
  update()
  setLayout()

  if (EMBEDDED) embedConfig()
}

const setHashUrl = () => {
  let hash = `${encode(layoutSettings)}`
  if (notEmpty()) hash += `|${encode(EDITORS.HTML.getValue())}|${encode(EDITORS.CSS.getValue())}|${encode(EDITORS.JS.getValue())}`

  window.history.replaceState(null, null, `/${hash}`)
}

const copyToClipBoard = async ({ pattern, text, position }) => {
  if (pattern.lastChild.tagName === 'SPAN') pattern.lastChild.remove()

  const tooltip = document.createElement('span')
  tooltip.innerText = 'copied!'
  tooltip.style.width = 'auto'
  tooltip.style.backgroundColor = '#000'
  tooltip.style.color = '#FFF'
  tooltip.style.textAlign = 'center'
  tooltip.style.borderRadius = '6px'
  tooltip.style.padding = '2px 4px'
  tooltip.style.position = 'absolute'
  tooltip.style.zIndex = '1'
  tooltip.style.fontSize = '10px'
  tooltip.style.top = '50%'
  tooltip.style.left = '50%'
  tooltip.style.transform = 'translate(-50%, -50%)'
  tooltip.style.marginTop = `-${pattern.offsetHeight}px`
  pattern.style.position = 'relative'
  pattern.appendChild(tooltip)

  // copy
  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand('copy')
    textArea.remove()
  } else await navigator.clipboard.writeText(text)

  setTimeout(() => {
    tooltip.remove()
  }, 1500)
}

const openDialog = () => {
  DIALOG.style.visibility = 'visible'
  OVERLAY.style.display = 'block'
}

const embedConfig = () => {
  document.querySelectorAll('.control').forEach(btn => {
    if (btn.className.indexOf('copy') < 0) btn.remove()
  })
}

const getActiveLayouts = () => {
  let editors = ''
  LAYOUTS.forEach(item => {
    if (item.className.indexOf('off') < 0) editors += `${item.className.replace('layout-', '')},`
  })

  return editors.substr(0, editors.length - 1)
}

const setLayout = () => {
  console.log(layoutSettings)
}

el('.close-dialog').addEventListener('click', () => {
  DIALOG.style.visibility = 'hidden'
  OVERLAY.style.display = 'none'
})

el('.copy').addEventListener('click', (e) => {
  copyToClipBoard({ pattern: e.target, text: window.location.href })
})

el('.embed').addEventListener('click', (e) => {
  const url = `${window.location.origin}/embed${window.location.pathname}`
  const iframe = `<iframe src="${url}" style="width=100%; min-width: 500px; min-height: 500px;" frameborder="0" allow="clipboard-write;" loading="lazy"></iframe>`
  copyToClipBoard({ pattern: e.target, text: iframe })
})

el('.layout').addEventListener('click', (e) => {
  openDialog()
})

LAYOUTS.forEach(item => {
  item.addEventListener('click', (e) => {
    const element = e.target
    if (!element.classList.contains('off')) element.classList.add('off')
    else element.classList.remove('off')

    layoutSettings.editors = getActiveLayouts()
  })
})

init()
