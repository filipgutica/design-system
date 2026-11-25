// The published list of theme inputs, and the contrast checks a theme outside this package can run.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { checkTheme, mapVsCodeTheme, themeVariables } from '@filipgutica/design-system/theme-mapper'
import themeInputs from '@filipgutica/design-system/theme-inputs.json' with { type: 'json' }
import { core } from '../theme-mapper/core.js'
import { flatTokens } from '../theme-mapper/engine.js'
import { declarations } from './css.mjs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const inputs = new Set(themeInputs.names)

test('theme-inputs.json names core tokens, once each, grouped by kind', () => {
  const tokens = flatTokens(core)
  assert.deepEqual(themeInputs.names.filter((name) => !(name in tokens)), [])
  assert.equal(inputs.size, themeInputs.names.length)
  assert.deepEqual(Object.values(themeInputs.groups).flat(), themeInputs.names)
  assert.deepEqual(themeInputs.groups.radius, ['radius-base'])
})

// Every declaration in a shipped theme's CSS, in every block, is a theme input: the rule a component library's
// own themes follow too.
test('every shipped theme file sets only theme inputs', () => {
  const files = readdirSync(new URL('../dist/themes/', import.meta.url)).filter((file) => file.endsWith('.css'))
  assert.ok(files.length > 0)
  const extra = files.flatMap((file) => Object.keys(declarations(read(`dist/themes/${file}`)))
    .filter((name) => !inputs.has(name.slice(2))).map((name) => `${file}: ${name}`))
  assert.deepEqual(extra, [])
})

test('the theme mapper sets only theme inputs', () => {
  const variables = themeVariables(mapVsCodeTheme(JSON.parse(read('language/editor-themes/graphite-indigo/themes/graphite-indigo-dark-color-theme.json'))))
  assert.deepEqual(Object.keys(variables).filter((name) => !inputs.has(name.slice(2))), [])
})

test('checkTheme passes a shipped theme and reports the check a weak hue fails', () => {
  const hue = { light: '#4b45d1', dark: '#a5a1ff' }
  assert.deepEqual(checkTheme({ hue }).filter(({ ok }) => !ok), [])
  // A pale light hue cannot carry the focus ring at 3:1.
  const pale = checkTheme({ hue: { light: '#d8d6ff', dark: hue.dark } }).find(({ id }) => id === 'focus')
  assert.equal(pale.ok, false)
  assert.ok(pale.light < pale.min && pale.dark >= pale.min, JSON.stringify(pale))
})
