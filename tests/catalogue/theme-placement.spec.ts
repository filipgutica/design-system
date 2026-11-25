import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

// A theme file is its inputs on :root, so it works from tokens.css's own cascade layer or any later position:
// after tokens.css unlayered, unlayered over a layered tokens.css, or in a later layer. In each placement and
// mode, on the root and in a subtree, every colour token computes to its tokens.json value.
const root = new URL('../../', import.meta.url)
const origin = 'http://design-system.test/'

type Mode = 'light' | 'dark'
type Theme = keyof typeof tokens.themes
const themes = Object.keys(tokens.themes) as Theme[]
const colours = Object.keys(tokens.themes['graphite-indigo'].light).filter((name) => name.startsWith('color-'))

const placements: Record<string, (theme: string) => string> = {
  'after tokens.css': (theme) => `<link rel="stylesheet" href="language/tokens.css"><link rel="stylesheet" href="dist/themes/${theme}.css">`,
  'in the same layer': (theme) => `<style>@import url("language/tokens.css") layer(ds); @import url("dist/themes/${theme}.css") layer(ds);</style>`,
  'unlayered over a layered tokens.css': (theme) => `<style>@import url("language/tokens.css") layer(ds);</style><link rel="stylesheet" href="dist/themes/${theme}.css">`,
  'in a later layer': (theme) => `<style>@layer ds, theme; @import url("language/tokens.css") layer(ds); @import url("dist/themes/${theme}.css") layer(theme);</style>`,
}

// Where the colours are read, and the mode whose tokens.json values they take.
const contexts: { name: string, mode: Mode, scheme: Mode, html: string, body: string }[] = [
  { name: 'light', mode: 'light', scheme: 'light', html: '', body: '<i id="t"></i>' },
  { name: 'system dark', mode: 'dark', scheme: 'dark', html: '', body: '<i id="t"></i>' },
  { name: 'data-theme dark', mode: 'dark', scheme: 'light', html: ' data-theme="dark"', body: '<i id="t"></i>' },
  { name: 'dark subtree in a light page', mode: 'dark', scheme: 'light', html: ' data-theme="light"', body: '<div data-theme="dark"><i id="t"></i></div>' },
  { name: 'light subtree in a dark page', mode: 'light', scheme: 'dark', html: ' data-theme="dark"', body: '<div data-theme="light"><i id="t"></i></div>' },
]

const open = async (page: Page, head: string, { scheme, html, body }: { scheme: Mode, html: string, body: string }) => {
  await page.route(`${origin}**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1)
    if (path === 'page.html') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html${html}><head>${head}</head><body>${body}</body></html>` })
    return route.fulfill({ path: new URL(path, root).pathname })
  })
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto(`${origin}page.html`)
}

// Each colour as the browser computes it: the token through var() on the probe's parent, and the tokens.json value.
const computed = (page: Page, expected: Record<string, string>) => page.evaluate(({ names, expected }) => {
  const parent = document.getElementById('t')!
  const read = (value: string) => {
    const probe = parent.appendChild(document.createElement('b'))
    probe.style.color = value
    const out = getComputedStyle(probe).color
    probe.remove()
    return out
  }
  return { actual: Object.fromEntries(names.map((name) => [name, read(`var(--${name})`)])), expected: Object.fromEntries(names.map((name) => [name, read(expected[name])])) }
}, { names: colours, expected })

for (const theme of themes) {
  for (const [placement, head] of Object.entries(placements)) {
    test(`${theme} ${placement}: every colour token computes to its tokens.json value in each mode and subtree`, async ({ page }) => {
      for (const context of contexts) {
        await open(page, head(theme), context)
        const { actual, expected } = await computed(page, tokens.themes[theme][context.mode])
        expect(actual, context.name).toEqual(expected)
      }
    })
  }
}
