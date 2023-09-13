import * as monaco from 'monaco-editor'

export const initEditorHotKeys = (editor) => {
  // Shortcut: Open/Close Settings
  editor.addAction({
    id: 'toggle-settings',
    label: 'Toggle Settings',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run: () => {
      const $settingsButton = document.querySelector("button[data-action='show-settings-bar']")
      $settingsButton && $settingsButton.click()
    }
  })

  // Shortcut: Copy URL
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
    () => {
      // const url = new URL(window.location.href)
      // const urlToCopy = `https://codi.link/${url.pathname}`
      // copyToClipboard(urlToCopy)
    }
  )
}
