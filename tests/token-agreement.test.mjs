import test from 'node:test'
import assert from 'node:assert/strict'
import { declarations, read, resolveCss, ruleBody } from './css.mjs'

// Each language/tokens.css line must carry the same light and dark value as the JSON token behind its
// "ui:" variable, named the way the generator names them: a library role or base role, an alias, or a
// same-name variable. A use-site fallback, var(--color-x, var(--color-y)), is checked through
// --color-y. Every line must be covered, so a "ui:" comment cannot name a variable the JSON lacks.
const tokensCss = read('language/tokens.css')
const tokenData = JSON.parse(read('tokens/graphite-indigo.json'))

const LIGHT = 0
const DARK = 1

const compare = ({ css, data }) => {
  const rootBody = ruleBody(css, ':root')
  const light = declarations(rootBody)
  const modes = [[LIGHT, light], [DARK, { ...light, ...declarations(ruleBody(css, ':root[data-theme="dark"]')) }]]

  const tokens = Object.fromEntries(data.groups.flatMap(({ tokens: group }) => Object.entries(group)))
  const resolveJson = (name, mode) => {
    const value = Array.isArray(tokens[name]) ? tokens[name][mode] : tokens[name]
    return value.replace(/\{([\w-]+)\}/g, (_, target) => resolveJson(target, mode))
  }
  const roles = { ...data.library.roles, ...data.library.baseRoles }
  const aliasToken = Object.fromEntries(Object.entries(data.library.aliases).map(([token, variable]) => [variable, token]))
  const tokenFor = (variable) =>
    roles[variable] ?? aliasToken[variable] ?? (tokens[variable.slice(2)] === undefined ? undefined : variable.slice(2))

  const uncovered = []
  const disagreements = []
  const uiComments = Object.fromEntries(
    [...rootBody.matchAll(/^\s*(--[\w-]+):[^;]+;\s*\/\*\s*ui:\s*(.+?)\s*\*\/\s*$/gm)].map(([, name, ui]) => [name, ui]),
  )
  // Every declaration is checked, so one without a "ui:" comment counts as uncovered instead of escaping both checks.
  for (const name of Object.keys(light)) {
    const ui = uiComments[name] ?? ''
    const fallback = ui.match(/^var\(--[\w-]+,\s*var\((--[\w-]+)\)\)$/)
    const variables = fallback ? [fallback[1]] : ui === '' ? [] : ui.split(/,\s*/)
    const covered = variables.map((variable) => [variable, tokenFor(variable)]).filter(([, token]) => token !== undefined)
    if (covered.length === 0) uncovered.push(name)
    for (const [variable, token] of covered) {
      for (const [mode, values] of modes) {
        const css = resolveCss(values, values[name])
        const generated = resolveJson(token, mode)
        if (css !== generated) disagreements.push(`${name} (${variable}, ${mode === LIGHT ? 'light' : 'dark'}): tokens.css ${css}, JSON ${generated}`)
      }
    }
  }
  return { uncovered, disagreements }
}

test('the agreement check catches a tokens.css value that drifts from its JSON token', () => {
  const drifted = tokensCss.replace('--bg: #f4f5f6;', '--bg: #ffffff;')

  // Lines that reference --bg, such as --accent-text, drift with it.
  assert.ok(compare({ css: drifted, data: tokenData }).disagreements.includes('--bg (--color-bg, light): tokens.css #ffffff, JSON #f4f5f6'))
})

test('the agreement check counts a tokens.css line without a ui: comment as uncovered', () => {
  const unannotated = tokensCss.replace('--page-max: 960px; /* ui: --page-max */', '--page-max: 1000px;')

  assert.ok(compare({ css: unannotated, data: tokenData }).uncovered.includes('--page-max'))
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
