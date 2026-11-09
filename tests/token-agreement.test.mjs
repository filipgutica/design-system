import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// language/tokens.css is a hand copy until the generator emits it. Until then, each of its
// lines must carry the same light and dark value as the JSON token behind its "ui:" variable,
// named the way the generator names them: a library role, an alias, or a same-name variable.
// Lines with no JSON token are the roles ui still defines only in its theme.css; they must
// equal the recorded list, so the gap cannot grow silently.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const tokensCss = read('language/tokens.css')
const tokenData = JSON.parse(read('tokens/graphite-indigo.json'))

const themeCssOnlyRoles = [
  '--field',
  '--field-bg',
  '--field-edge',
  '--field-shadow',
  '--control-thumb',
  '--nav-current',
  '--nav-current-text',
  '--segmented-current-text',
  '--overlay',
  '--terminal-shadow-nav-current',
  '--shadow-raise',
  '--shadow-surface',
  '--shadow-sink',
  '--shadow-nav-current',
  '--field-shadow-focus',
  '--field-shadow-focus-invalid',
]

const LIGHT = 0
const DARK = 1

// The body of the first rule with this selector, nested braces included.
const ruleBody = (css, selector) => {
  const open = css.indexOf(`${selector} {`) + selector.length + 1
  assert.ok(open > selector.length, `tokens.css has no "${selector}" rule`)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i)
  }
  throw new Error(`"${selector}" rule is not closed`)
}

const declarations = (body) => Object.fromEntries(
  [...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
)

// Follows var(--name) to a literal through the declarations of one mode.
const resolveCss = (values, value) =>
  value.replace(/var\((--[\w-]+)\)/g, (match, name) => (values[name] === undefined ? match : resolveCss(values, values[name])))

const compare = ({ css, data }) => {
  const rootBody = ruleBody(css, ':root')
  const light = declarations(rootBody)
  const modes = [[LIGHT, light], [DARK, { ...light, ...declarations(ruleBody(css, ':root[data-theme="dark"]')) }]]

  const tokens = Object.fromEntries(data.groups.flatMap(({ tokens: group }) => Object.entries(group)))
  const resolveJson = (name, mode) => {
    const value = Array.isArray(tokens[name]) ? tokens[name][mode] : tokens[name]
    return value.replace(/\{([\w-]+)\}/g, (_, target) => resolveJson(target, mode))
  }
  const aliasToken = Object.fromEntries(Object.entries(data.library.aliases).map(([token, variable]) => [variable, token]))
  const tokenFor = (variable) =>
    data.library.roles[variable] ?? aliasToken[variable] ?? (tokens[variable.slice(2)] === undefined ? undefined : variable.slice(2))

  const uncovered = []
  const disagreements = []
  const uiComments = Object.fromEntries(
    [...rootBody.matchAll(/^\s*(--[\w-]+):[^;]+;\s*\/\*\s*ui:\s*(.+?)\s*\*\/\s*$/gm)].map(([, name, ui]) => [name, ui]),
  )
  // Every declaration is checked, so one without a "ui:" comment counts as uncovered instead of escaping both checks.
  for (const name of Object.keys(light)) {
    const ui = uiComments[name] ?? ''
    // "var(--color-x, var(--color-accent))" is a use-site fallback in ui, not a variable it declares.
    const variables = ui === '' || ui.startsWith('var(') ? [] : ui.split(/,\s*/)
    const covered = variables.map((variable) => [variable, tokenFor(variable)]).filter(([, token]) => token !== undefined)
    if (covered.length === 0) uncovered.push(name)
    for (const [variable, token] of covered) {
      for (const [mode, values] of modes) {
        const hand = resolveCss(values, values[name])
        const generated = resolveJson(token, mode)
        if (hand !== generated) disagreements.push(`${name} (${variable}, ${mode === LIGHT ? 'light' : 'dark'}): tokens.css ${hand}, JSON ${generated}`)
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

test('only the recorded theme.css-only roles have no JSON token', () => {
  assert.deepEqual(compare({ css: tokensCss, data: tokenData }).uncovered, themeCssOnlyRoles)
})

test('both dark rules in tokens.css declare the same values', () => {
  assert.deepEqual(
    declarations(ruleBody(tokensCss, ':root:not([data-theme="light"])')),
    declarations(ruleBody(tokensCss, ':root[data-theme="dark"]')),
  )
})
