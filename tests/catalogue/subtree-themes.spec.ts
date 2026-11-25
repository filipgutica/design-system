import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

// data-theme="dark" or "light" on an element below <html>, or a .dark class, themes that subtree: every token
// computes there as it does on a whole page in that mode, in the default theme and in each theme file. The
// pages load tokens.css, and a theme file after it, from the repository through a routed origin.
const root = new URL('../../', import.meta.url)
const origin = 'http://design-system.test/'
const names = Object.keys(tokens.themes['graphite-indigo'].light).map((name) => `--${name}`)
// tokens.css alone, then each theme file after it.
const themes = [null, ...Object.keys(tokens.themes)]

type Mode = 'light' | 'dark'
const other = (mode: Mode): Mode => (mode === 'light' ? 'dark' : 'light')

const open = async (page: Page, theme: string | null, scheme: Mode, body: string, html = '') => {
  await page.route(`${origin}**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1)
    if (path === 'page.html') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html${html}><head>
      <link rel="stylesheet" href="language/tokens.css">${theme ? `<link rel="stylesheet" href="dist/themes/${theme}.css">` : ''}
      </head><body>${body}</body></html>` })
    return route.fulfill({ path: new URL(path, root).pathname })
  })
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto(`${origin}page.html`)
}

const valuesOn = (page: Page, selector: string) => page.evaluate(({ selector, names }) => {
  const style = getComputedStyle(document.querySelector(selector)!)
  return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]))
}, { selector, names })

for (const theme of themes) {
  test.describe(`subtree themes: ${theme ?? 'default'}`, () => {
    for (const mode of ['light', 'dark'] as const) {
      test(`${mode}: a nested subtree computes every token as a whole ${mode} page does`, async ({ page }) => {
        await open(page, theme, other(mode), '', ` data-theme="${mode}"`)
        const whole = await valuesOn(page, 'html')
        expect(whole['--color-bg']).not.toBe('')

        // Inside a page in the other mode, set by data-theme and by the system preference.
        for (const html of [` data-theme="${other(mode)}"`, '']) {
          await open(page, theme, other(mode), `<div id="t" data-theme="${mode}"></div>`, html)
          expect(await valuesOn(page, '#t'), `data-theme="${mode}" in <html${html}>`).toEqual(whole)
        }
        // Two levels: back to this mode inside a subtree in the other mode.
        await open(page, theme, mode, `<div data-theme="${other(mode)}"><div id="t" data-theme="${mode}"></div></div>`, ` data-theme="${mode}"`)
        expect(await valuesOn(page, '#t'), 'two levels deep').toEqual(whole)

        if (mode === 'dark') {
          // shadcn's class: on <html> in a light system, and on an element in a light page.
          await open(page, theme, 'light', '', ' class="dark"')
          expect(await valuesOn(page, 'html'), '<html class="dark">').toEqual(whole)
          await open(page, theme, 'light', '<div id="t" class="dark"></div>', ' data-theme="light"')
          expect(await valuesOn(page, '#t'), 'class="dark" in a light page').toEqual(whole)
        }
      })
    }
  })
}

test('an element in the page\'s own mode keeps the page values, and no data-theme changes nothing', async ({ page }) => {
  await open(page, null, 'light', '<div id="same" data-theme="light"></div><div id="plain"></div>')
  const whole = await valuesOn(page, 'html')
  expect(await valuesOn(page, '#same')).toEqual(whole)
  expect(await valuesOn(page, '#plain')).toEqual(whole)
})
