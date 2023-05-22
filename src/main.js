import './style.css'
import Split from 'split-grid'
import { encode, decode } from 'js-base64'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import JsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { emmetHTML } from 'emmet-monaco-es'
import { configurePrettierHotkeys } from './utils/configurePrettier'

const el = selector => document.querySelector(selector)
const TEMPLATE = '<!DOCTYPE html><html lang="en"><head> <style>CSS_EDITOR</style></head><body style="background-color: #333333;">HTML_EDITOR<script>JS_EDITOR</script></body></html>'
const HTML_CONTAINER = el('#html')
const CSS_CONTAINER = el('#css')
const JS_CONTAINER = el('#js')
const CUSTOM_CONTAINER = el('#custom')
const PREVIEW_CONTAINER = el('#preview')
const DIALOG = document.querySelector('dialog')
const OVERLAY = document.querySelector('.overlay')
const LAYOUTS_ELEMENTS = document.querySelectorAll('.layout-preview,.layout-html,.layout-css,.layout-js')
const INITIAL_LAYOUTS = '1,2,3,4'
const ENUM_LAYOUTS = {
  html: 1,
  css: 2,
  js: 3,
  preview: 4
}
const CUSTOM_EDITORS = [
  { id: 5, name: 'csharp', language: 'csharp' },
  { id: 6, name: 'php', language: 'php' },
  { id: 7, name: 'python', language: 'python' },
  { id: 8, name: 'java', language: 'java' },
  { id: 9, name: 'json', language: 'json' },
  { id: 10, name: 'shell', language: 'shell' },
  { id: 11, name: 'sql', language: 'sql' },
  { id: 12, name: 'typescript', language: 'typescript' },
  { id: 13, name: 'xml', language: 'xml' }
]

let EDITORS = null
let EMBEDDED = false

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

  const [layouts, html, css, js, custom] = pathname.slice(1).split('%7C')
  updateLayouts(layouts.length <= 0 ? INITIAL_LAYOUTS : decode(layouts))

  return {
    html: html ? decode(html) : '',
    css: css ? decode(css) : '',
    js: js ? decode(js) : '',
    custom: custom ? decode(custom) : ''
  }
}

const createTemplate = ({ html, css, js }) => {
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
    // lineNumbers: 'off',
    wordWrap: 'on'
  })
}

const createEditors = () => {
  const values = getHashValue()
  const actives = getActiveLayouts().split(',')
  let timeout = null

  EDITORS = {
    HTML: createEditor({ el: HTML_CONTAINER, value: values.html, language: 'html' }),
    CSS: createEditor({ el: CSS_CONTAINER, value: values.css, language: 'css' }),
    JS: createEditor({ el: JS_CONTAINER, value: values.js, language: 'javascript' }),
    CUSTOM: createEditor({ el: CUSTOM_CONTAINER, value: values.custom, language: (actives.length === 1 && Number(actives[0]) > 4) ? CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language : 'plaintext' })
  }

  EDITORS.HTML.onDidChangeModelContent(update)
  EDITORS.CSS.onDidChangeModelContent(update)
  EDITORS.JS.onDidChangeModelContent(() => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      update()
      clearTimeout(timeout)
    }, 1000)
  })
  EDITORS.CUSTOM.onDidChangeModelContent(update)

  configurePrettierHotkeys([EDITORS.HTML, EDITORS.CSS, EDITORS.JS])
  emmetHTML(monaco)

  return EDITORS
}

const notEmpty = () => {
  return (EDITORS.HTML.getValue().length > 0 || EDITORS.CSS.getValue().length > 0 || EDITORS.JS.getValue().length > 0 || EDITORS.CUSTOM.getValue().length > 0)
}

const copyToClipBoard = async ({ pattern, text, position }) => {
  if (pattern.lastChild && pattern.lastChild.tagName === 'SPAN') pattern.lastChild.remove()

  const tooltip = document.createElement('span')
  tooltip.innerText = 'copied!'
  tooltip.style.width = 'auto'
  tooltip.style.backgroundColor = '#000'
  tooltip.style.color = '#FFF'
  tooltip.style.textAlign = 'center'
  tooltip.style.borderRadius = '6px'
  tooltip.style.padding = '2px 4px'
  tooltip.style.zIndex = '1'
  tooltip.style.fontSize = '10px'
  tooltip.style.position = 'absolute'
  tooltip.style.top = '50%'
  tooltip.style.left = '50%'
  tooltip.style.transform = 'translate(-50%, -50%)'
  pattern.appendChild(tooltip)

  if (position === 'top') tooltip.style.marginTop = `-${pattern.offsetHeight}px`
  if (position === 'bottom') tooltip.style.marginTop = `${pattern.offsetHeight}px`
  if (position === 'right') tooltip.style.marginLeft = `${((pattern.offsetWidth / 2) + (tooltip.offsetWidth / 2))}px`
  if (position === 'left') tooltip.style.marginLeft = `-${(pattern.offsetWidth / 2) + (tooltip.offsetWidth / 2)}px`

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
  }, 1000)
}

const openDialog = () => {
  DIALOG.style.visibility = 'visible'
  OVERLAY.style.display = 'block'
}

const closeDialog = () => {
  DIALOG.style.visibility = 'hidden'
  OVERLAY.style.display = 'none'
}

const embedConfig = () => {
  document.querySelectorAll('.control').forEach(btn => {
    if (btn.className.indexOf('open') < 0) btn.remove()
    else btn.style.display = 'block'
  })
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

  setLayout()
}

const toogleEditor = (elements) => {
  const actives = getActiveLayouts().split(',')

  elements.forEach(el => {
    if (!actives.includes(ENUM_LAYOUTS[el.getAttribute('id')].toString())) el.style.display = 'none'
    else el.style.display = 'block'
  })

  if (actives.length === 1 && actives[0] > 4) {
    CUSTOM_CONTAINER.style.display = 'block'
    document.documentElement.style.setProperty('--custom-editor', `url('/${CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language}.svg')`)
    if (EDITORS) createCustomEditor()
  } else CUSTOM_CONTAINER.style.display = 'none'
}

const setLayout = () => {
  toogleEditor([HTML_CONTAINER, CSS_CONTAINER, JS_CONTAINER, PREVIEW_CONTAINER])

  const actives = getActiveLayouts().split(',')
  const grid = el('.grid')
  const gridRows = el('.grid-rows')

  // columns
  if (actives.includes('4')) {
    if (actives.length > 1) {
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

  // rows
  if (actives.filter(x => x !== '4').length === 1) gridRows.style.gridTemplateRows = '100%'
  if (actives.filter(x => x !== '4').length === 2) gridRows.style.gridTemplateRows = '49.5% 1% 49.5%'
  if (actives.filter(x => x !== '4').length === 3) gridRows.style.gridTemplateRows = '32.6% 1% 32.6% 1% 32.6%'
}

const setHashUrl = () => {
  let hash = `${encode(getActiveLayouts())}`
  if (notEmpty()) hash += `|${encode(EDITORS.HTML.getValue())}|${encode(EDITORS.CSS.getValue())}|${encode(EDITORS.JS.getValue())}|${encode(EDITORS.CUSTOM.getValue())}`

  window.history.replaceState(null, null, `/${hash}`)
}

const update = () => {
  el('iframe').setAttribute('srcdoc', createTemplate({
    html: EDITORS.HTML.getValue(),
    css: EDITORS.CSS.getValue(),
    js: EDITORS.JS.getValue()
  }))

  setHashUrl()
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

const createCustomEditor = () => {
  const actives = getActiveLayouts().split(',')
  const model = EDITORS.CUSTOM.getModel()
  monaco.editor.setModelLanguage(model, CUSTOM_EDITORS.find(x => x.id === Number(actives[0])).language)
}

const createLoader = () => {
  const app = el('#app')
  const footer = el('footer')

  app.style.display = 'none'
  footer.style.display = 'none'
  OVERLAY.style.display = 'block'

  setTimeout(() => {
    el('.loader').remove()
    OVERLAY.style.display = 'none'

    app.style.display = 'block'
    footer.style.display = 'flex'
  }, 2000)
}

const createCopyBtns = () => {
  const btn = document.createElement('button')
  btn.title = 'Copy to clipboard'

  HTML_CONTAINER.appendChild(btn)
  CSS_CONTAINER.appendChild(btn.cloneNode(true))
  JS_CONTAINER.appendChild(btn.cloneNode(true))
  CUSTOM_CONTAINER.appendChild(btn.cloneNode(true))

  document.querySelectorAll('div.editor>button').forEach(item => {
    item.addEventListener('click', (e) => {
      switch (item.parentElement.id) {
        case 'html':
          copyToClipBoard({ pattern: item, text: EDITORS.HTML.getValue(), position: 'left' })
          break
        case 'css':
          copyToClipBoard({ pattern: item, text: EDITORS.CSS.getValue(), position: 'left' })
          break
        case 'js':
          copyToClipBoard({ pattern: item, text: EDITORS.JS.getValue(), position: 'left' })
          break
        case 'custom':
          copyToClipBoard({ pattern: item, text: EDITORS.CUSTOM.getValue(), position: 'left' })
          break
      }
    })
  })
}

const init = () => {
  createLoader()
  loadCustomList()
  createCopyBtns()
  createEditors()
  update()

  if (EMBEDDED) embedConfig()
}

// events
el('.close-dialog-btn').addEventListener('click', () => {
  closeDialog()
})

el('.copy').addEventListener('click', (e) => {
  copyToClipBoard({ pattern: e.target, text: window.location.href, position: 'top' })
})

el('.embed').addEventListener('click', (e) => {
  const url = `${window.location.origin}/embed${window.location.pathname}`
  const iframe = `<iframe src="${url}" style="width: 100%; min-width: 500px; min-height: 500px;" frameborder="0" allow="clipboard-write;" loading="lazy"></iframe>`
  copyToClipBoard({ pattern: e.target, text: iframe, position: 'top' })
})

el('.layout').addEventListener('click', (e) => {
  openDialog()
})

el('.open').addEventListener('click', (e) => {
  window.open(window.location.href, '_blank')
})

el('select').addEventListener('change', (e) => {
  const customLayout = el('.layout-custom')
  const customSelected = e.target.value

  if (customSelected >= 0) customLayout.classList.remove('off')
  else {
    customLayout.classList.add('off')
  }

  LAYOUTS_ELEMENTS.forEach(element => {
    if (customSelected >= 0) element.classList.add('off')
    else element.classList.remove('off')
  })

  update()
  setLayout()
})

LAYOUTS_ELEMENTS.forEach(item => {
  item.addEventListener('click', (e) => {
    const element = e.target
    if (!element.classList.contains('off')) element.classList.add('off')
    else element.classList.remove('off')

    el('.layout-custom').classList.add('off')
    el('select').value = -1

    update()
    setLayout()
  })
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (DIALOG.style.visibility === 'visible') closeDialog()
  }
})

init()
