// Small CSS readers shared by the token tests. They understand only what the token files contain:
// custom property declarations inside plain rules, with var() references and no var() fallbacks.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

export const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// The body of the first rule with this selector, nested braces included.
export const ruleBody = (css, selector) => {
  const open = css.indexOf(`${selector} {`) + selector.length + 1
  assert.ok(open > selector.length, `no "${selector}" rule`)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i)
  }
  throw new Error(`"${selector}" rule is not closed`)
}

export const declarations = (body) => Object.fromEntries(
  [...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
)

// Follows var(--name) to a literal through the declarations of one mode.
export const resolveCss = (values, value) =>
  value.replace(/var\((--[\w-]+)\)/g, (match, name) => (values[name] === undefined ? match : resolveCss(values, values[name])))

// Every variable in a mode with its references substituted.
export const resolveAll = (values) => Object.fromEntries(Object.entries(values).map(([name, value]) => [name, resolveCss(values, value)]))
