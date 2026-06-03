const el = selector => document.querySelector(selector)

const TEMPLATE = '<!DOCTYPE html><html lang="en"><head> <style>CSS_EDITOR</style></head><body style="background-color: #333333;">HTML_EDITOR<script>JS_EDITOR</script></body></html>'

const HTML_CONTAINER = el('#html')
const CSS_CONTAINER = el('#css')
const JS_CONTAINER = el('#js')
const CUSTOM_CONTAINER = el('#custom')
const PREVIEW_CONTAINER = el('#preview')
const PREVIEW_COLUMN = el('.preview-column')
const CONSOLE_PANEL = el('#console')
const DIALOG = document.querySelector('dialog')
const OVERLAY = document.querySelector('.overlay')
const LAYOUTS_ELEMENTS = document.querySelectorAll('.layout-preview,.layout-html,.layout-css,.layout-js,.layout-console')

const INITIAL_LAYOUTS = '1,2,3,4,15'

const ENUM_LAYOUTS = {
  html: 1,
  css: 2,
  js: 3,
  preview: 4,
  console: 15
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
  { id: 13, name: 'xml', language: 'xml' },
  { id: 14, name: 'markdown', language: 'markdown' }
]

export {
  el,
  TEMPLATE,
  HTML_CONTAINER,
  CSS_CONTAINER,
  JS_CONTAINER,
  CUSTOM_CONTAINER,
  PREVIEW_CONTAINER,
  PREVIEW_COLUMN,
  CONSOLE_PANEL,
  DIALOG,
  OVERLAY,
  LAYOUTS_ELEMENTS,
  INITIAL_LAYOUTS,
  ENUM_LAYOUTS,
  CUSTOM_EDITORS
}
