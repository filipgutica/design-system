import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'
import { THEME_EXTENSION, parseTheme, themeCss } from '@filipgutica/design-system/theme-builder'
import { core } from '../../theme-mapper/core.js'
import { NEUTRALS, applyTheme, resolveData } from '../../theme-mapper/engine.js'

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
  { name: 'dark class on html', mode: 'dark', scheme: 'light', html: ' class="dark"', body: '<i id="t"></i>' },
  { name: 'dark subtree in a light page', mode: 'dark', scheme: 'light', html: ' data-theme="light"', body: '<div data-theme="dark"><i id="t"></i></div>' },
  { name: 'light subtree in a dark page', mode: 'light', scheme: 'dark', html: ' data-theme="dark"', body: '<div data-theme="light"><i id="t"></i></div>' },
]

// A theme the theme builder makes that tokens.css's dark rules alone would get wrong in a later layer: its light
// background and text on the hue differ from the default theme's, and its dark ones match them.
const graphite = tokens.themes['graphite-indigo']
const srgb = (hex: string) => ({ $value: { colorSpace: 'srgb', components: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), hex } })
const group = (mode: Mode, hue: string) => {
  const values: Record<string, string> = graphite[mode]
  return { 'color-project': srgb(hue), ...Object.fromEntries(NEUTRALS.map((token) => [token, srgb(values[token])])) }
}
const builtFile = {
  $description: 'A test theme.',
  $extensions: { [THEME_EXTENSION]: { name: 'Built' } },
  $type: 'color',
  light: { ...group('light', graphite.light['color-project']), 'color-bg': srgb('#ffffff'), 'color-accent-text': srgb('#ffffff') },
  dark: group('dark', graphite.light['color-project-dark']),
}
const { problems, inputs: builtInputs } = parseTheme(builtFile)
if (!builtInputs) throw new Error(`The test theme has problems: ${problems.join(', ')}`)
const builtCss = themeCss(builtFile)
const builtValues = resolveData(applyTheme(core, builtInputs))

const open = async (page: Page, head: string, { scheme, html, body }: { scheme: Mode, html: string, body: string }) => {
  await page.route(`${origin}**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1)
    if (path === 'built-theme.css') return route.fulfill({ contentType: 'text/css', body: builtCss })
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

for (const [placement, head] of Object.entries(placements)) {
  test(`a built theme ${placement}: every colour token computes to the theme's value in each mode and subtree`, async ({ page }) => {
    for (const context of contexts) {
      await open(page, head('built').replace('dist/themes/built.css', 'built-theme.css'), context)
      const { actual, expected } = await computed(page, builtValues[context.mode])
      expect(actual, context.name).toEqual(expected)
    }
  })
}
