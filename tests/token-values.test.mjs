import test from 'node:test'
import assert from 'node:assert/strict'
import { readRenameTable, renameTokens } from '../scripts/rename-tokens.mjs'
import { declarations, read, resolveAll, ruleBody } from './css.mjs'

// The generator must reproduce the values that existed before it took over: language/tokens.css
// against the DS-1 hand copy (tests/fixtures/ds-1-tokens.css), with its 1.x names renamed through the
// 2.0.0 rename table in decisions.md. It must declare the same variables in each rule, so the cascade
// with a page's own overrides does not change, and every variable must resolve to the same value in
// light and both dark rules.

const blocksOf = (css, selectors) => Object.fromEntries(selectors.map((selector) => [selector, declarations(ruleBody(css, selector))]))
const namesOf = (blocks) => Object.fromEntries(Object.entries(blocks).map(([selector, values]) => [selector, Object.keys(values).sort()]))

const STANDALONE = [':root', ':root:not([data-theme="light"])', ':root[data-theme="dark"]']

const standaloneModes = (css) => {
  const blocks = blocksOf(css, STANDALONE)
  const light = blocks[':root']
  return {
    light: resolveAll(light),
    darkMedia: resolveAll({ ...light, ...blocks[':root:not([data-theme="light"])'] }),
    darkAttr: resolveAll({ ...light, ...blocks[':root[data-theme="dark"]'] }),
  }
}

const handTokens = renameTokens({ text: read('tests/fixtures/ds-1-tokens.css'), table: readRenameTable(read('language/decisions.md')) })
const generatedTokens = read('language/tokens.css')

test('tokens.css declares the same variables in each rule as the DS-1 hand copy', () => {
  assert.deepEqual(namesOf(blocksOf(generatedTokens, STANDALONE)), namesOf(blocksOf(handTokens, STANDALONE)))
})

test('every tokens.css variable has its DS-1 value in light and both dark rules', () => {
  assert.deepEqual(standaloneModes(generatedTokens), standaloneModes(handTokens))
})

// Resolved values hide a reference that became a literal, which would stop a page's identity override
// from reaching the tokens derived from it. Only the listed declarations may change their text.
test('tokens.css keeps the DS-1 declaration text except where a value became a reference', () => {
  const generated = blocksOf(generatedTokens, STANDALONE)
  const changed = Object.entries(blocksOf(handTokens, STANDALONE)).flatMap(([selector, values]) =>
    Object.entries(values).filter(([name, value]) => generated[selector][name] !== value)
      .map(([name, value]) => `${selector} ${name}: ${value} -> ${generated[selector][name]}`))

  assert.deepEqual(changed, [
    // The dark lift is the always-dark lift, so it names that token instead of repeating its value.
    ':root:not([data-theme="light"]) --shadow-nav-current: 0 1px 2px rgb(0 0 0 / 25%) -> var(--shadow-nav-current-dark)',
    ':root[data-theme="dark"] --shadow-nav-current: 0 1px 2px rgb(0 0 0 / 25%) -> var(--shadow-nav-current-dark)',
  ])
})
