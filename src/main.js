import './style.css'
import Split from 'split-grid'

import {
  el,
  HTML_CONTAINER,
  CSS_CONTAINER,
  JS_CONTAINER,
  CUSTOM_CONTAINER,
  DIALOG,
  OVERLAY,
  LAYOUTS_ELEMENTS
} from './config'

import {
  createEditors,
  loadCustomList,
  setHashUrl,
  setLayout,
  createTemplate
} from './editor'

let EDITORS = null

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

const update = () => {
  el('iframe').setAttribute('srcdoc', createTemplate({
    html: EDITORS.HTML.getValue(),
    css: EDITORS.CSS.getValue(),
    js: EDITORS.JS.getValue()
  }))

  setHashUrl(EDITORS)
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
  }, 500)
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

  const result = createEditors(update)
  EDITORS = result.editors

  update()
  if (result.embedded) embedConfig()
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
  setLayout(EDITORS)
})

LAYOUTS_ELEMENTS.forEach(item => {
  item.addEventListener('click', (e) => {
    const element = e.target
    if (!element.classList.contains('off')) element.classList.add('off')
    else element.classList.remove('off')

    el('.layout-custom').classList.add('off')
    el('select').value = -1

    update()
    setLayout(EDITORS)
  })
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (DIALOG.style.visibility === 'visible') closeDialog()
  }

  if (event.ctrlKey && event.key === 'Enter') {
    openDialog()
  }
})

init()
