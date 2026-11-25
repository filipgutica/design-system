import { expect, test } from '@playwright/test'

// The base rules tokens.css ships on its own, with no component styles: the tablet touch sizes and the pointer cursor.
const tokens = decodeURIComponent(new URL('../../language/tokens.css', import.meta.url).pathname)

test.describe('tokens.css base', () => {
  for (const { width, sizes } of [{ width: 801, sizes: [28, 32, 36] }, { width: 800, sizes: [44, 44, 44] }]) {
    test(`at ${width}px, controls of every size are ${sizes.join(', ')}px tall`, async ({ page }) => {
      await page.setViewportSize({ width, height: 600 })
      await page.setContent('<i id="sm"></i><i id="md"></i><i id="lg"></i>')
      await page.addStyleTag({ path: tokens })
      await page.addStyleTag({ content: 'i { display: block; } #sm { height: var(--control-sm); } #md { height: var(--control-md); } #lg { height: var(--control-lg); }' })
      const heights = await page.evaluate(() => ['sm', 'md', 'lg'].map((id) => document.getElementById(id)!.getBoundingClientRect().height))
      expect(heights).toEqual(sizes)
    })
  }

  test('enabled controls and the labels of enabled choices show the pointer; disabled ones and component rules keep their own', async ({ page }) => {
    await page.setContent(`
      <button id="button">Save</button>
      <button id="disabled" disabled>Save</button>
      <button id="aria-disabled" aria-disabled="true">Save</button>
      <button id="data-disabled" data-disabled>Save</button>
      <button id="busy" class="busy">Saving</button>
      <select id="select"><option>One</option></select>
      <details><summary id="summary">More</summary></details>
      <div id="tab" role="tab" tabindex="0">Tab</div>
      <div id="option" role="option" aria-disabled="true">Option</div>
      <input id="editable-combobox" role="combobox">
      <input id="range" type="range">
      <input id="file" type="file">
      <div id="editable-div-combobox" role="combobox" contenteditable="true">Pick</div>
      <div id="not-editable-div-combobox" role="combobox" contenteditable="false" tabindex="0">Pick</div>
      <div contenteditable="true"><span id="inherited-editable-combobox" role="combobox">Pick</span></div>
      <input id="text">
      <label id="wrapping"><input type="checkbox">Notify</label>
      <label id="wrapping-disabled"><input type="checkbox" disabled>Notify</label>
      <button id="switch" role="switch" aria-checked="false"></button><label id="following" for="switch">Wi-Fi</label>
      <button role="switch" aria-checked="false" disabled></button><label id="following-disabled">Wi-Fi</label>
      <label id="plain">Name</label>`)
    await page.addStyleTag({ path: tokens })
    // A component's own cursor, written with any specificity, wins over the weightless base.
    await page.addStyleTag({ content: '@layer components { .busy { cursor: wait; } }' })
    const cursors = await page.evaluate(() => Object.fromEntries([
      ...[...document.querySelectorAll('[id]')].map((node) => [node.id, getComputedStyle(node).cursor]),
      ['file chooser', getComputedStyle(document.getElementById('file')!, '::file-selector-button').cursor],
    ]))
    expect(cursors).toEqual({
      button: 'pointer', disabled: 'default', 'aria-disabled': 'default', 'data-disabled': 'default', busy: 'wait',
      select: 'pointer', summary: 'pointer', tab: 'pointer', option: 'auto', 'editable-combobox': 'text', 'editable-div-combobox': 'auto', 'not-editable-div-combobox': 'pointer', 'inherited-editable-combobox': 'auto', range: 'pointer', file: 'pointer', 'file chooser': 'pointer', text: 'text',
      wrapping: 'pointer', 'wrapping-disabled': 'default', switch: 'pointer', following: 'pointer', 'following-disabled': 'default', plain: 'default',
    })
  })
})
