import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { readTokens } from '../scripts/build-tokens.mjs'
import { declarations, read, resolveCss, ruleBody } from './css.mjs'

// Each language/tokens.css line must carry the same light and dark value as the JSON token of the same
// name, --color-bg for color-bg. A line whose name has no JSON token counts as uncovered.
const tokensCss = read('language/tokens.css')
// tokens.css carries the default theme, the first one.
const tokenData = readTokens(fileURLToPath(new URL('..', import.meta.url))).themes[0].data

const LIGHT = 0
const DARK = 1

const compare = ({ css, data }) => {
  const light = declarations(ruleBody(css, ':root'))
  const modes = [[LIGHT, light], [DARK, { ...light, ...declarations(ruleBody(css, ':root[data-theme="dark"]')) }]]

  const tokens = Object.fromEntries(data.groups.flatMap(({ tokens: group }) => Object.entries(group)))
  const resolveJson = (name, mode) => {
    const value = Array.isArray(tokens[name]) ? tokens[name][mode] : tokens[name]
    return value.replace(/\{([\w-]+)\}/g, (_, target) => resolveJson(target, mode))
  }

  const uncovered = []
  const disagreements = []
  for (const name of Object.keys(light)) {
    const token = name.slice(2)
    if (tokens[token] === undefined) {
      uncovered.push(name)
      continue
    }
    for (const [mode, values] of modes) {
      const css = resolveCss(values, values[name])
      const generated = resolveJson(token, mode)
      if (css !== generated) disagreements.push(`${name} (${mode === LIGHT ? 'light' : 'dark'}): tokens.css ${css}, JSON ${generated}`)
    }
  }
  return { uncovered, disagreements }
}

test('the agreement check catches a tokens.css value that drifts from its JSON token', () => {
  const drifted = tokensCss.replace('--color-bg: #f4f5f6;', '--color-bg: #ffffff;')

  // Lines that reference --color-bg, such as --color-accent-text, drift with it.
  assert.ok(compare({ css: drifted, data: tokenData }).disagreements.includes('--color-bg (light): tokens.css #ffffff, JSON #f4f5f6'))
})

test('the agreement check counts a tokens.css line with no JSON token of its name as uncovered', () => {
  const extra = tokensCss.replace('--page-max: 960px;', '--page-max: 960px;\n  --page-gone: 1000px;')

  assert.deepEqual(compare({ css: extra, data: tokenData }).uncovered, ['--page-gone'])
})

test('every tokens.css line backed by a JSON token has its light and dark value', () => {
  assert.deepEqual(compare({ css: tokensCss, data: tokenData }).disagreements, [])
})

test('every tokens.css line has a JSON token', () => {
  assert.deepEqual(compare({ css: tokensCss, data: tokenData }).uncovered, [])
})

test('both dark rules in tokens.css declare the same values', () => {
  assert.deepEqual(
    declarations(ruleBody(tokensCss, ':root:not([data-theme="light"])')),
    declarations(ruleBody(tokensCss, ':root[data-theme="dark"]')),
  )
})
