import test from 'node:test'
import assert from 'node:assert/strict'
import { readRenameTable, renameTokens } from '../scripts/rename-tokens.mjs'
import { declarations, read, resolveAll, ruleBody } from './css.mjs'

// The generator must reproduce the values that existed before it took over: language/tokens.css
// against the DS-1 hand copy (tests/fixtures/ds-1-tokens.css), with its 1.x names renamed through the
// 2.0.0 rename table in decisions.md. It must declare the same variables in each rule, so the cascade
// with a page's own overrides does not change, and every variable must resolve to the same value in
// light and both dark rules, except the documented command compatibility aliases and the owner's later shape
// and size decisions.

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

// Tokens added after DS-1, each with its own tests. The parity checks leave out only these.
const ADDED_SINCE_DS1 = [
  '--color-status-ink',
  ...['function', 'type', 'variable', 'operator', 'punctuation', 'tag', 'attribute'].map((role) => `--color-syntax-${role}`),
  ...Array.from({ length: 16 }, (_, slot) => `--color-terminal-ansi-${slot}`),
  '--color-terminal-ansi-4-bg',
  '--radius-mark',
  '--control-touch',
  '--radius-circle',
  '--radius-base',
]
const withoutAdded = (css) => css.replace(new RegExp(`^\\s*(?:${ADDED_SINCE_DS1.join('|')}):[^;]+;\\n`, 'gm'), '')

// Tokens renamed after the 2.0.0 rename, with the date each was decided. The DS-1 copy takes these names too.
const RENAMED_SINCE_DS1 = new Map([
  // 2026-11-24: --sidebar is a colour in shadcn-based apps, so the width took a name that cannot clash.
  ['--sidebar', '--sidebar-width'],
])

const handTokens = renameTokens({
  text: renameTokens({ text: read('tests/fixtures/ds-1-tokens.css'), table: readRenameTable(read('language/decisions.md')) }),
  table: RENAMED_SINCE_DS1,
})
const generatedTokens = withoutAdded(read('language/tokens.css'))

test('tokens.css keeps the DS-1 declarations except the inherited command aliases', () => {
  const expected = blocksOf(handTokens, STANDALONE)
  // Owner decision 2026-11-15: code-well aliases inherit from :root instead of repeating in dark rules.
  for (const selector of STANDALONE.slice(1)) {
    delete expected[selector]['--color-command-bg']
    delete expected[selector]['--color-command-border']
  }
  assert.deepEqual(namesOf(blocksOf(generatedTokens, STANDALONE)), namesOf(expected))
})

// Owner decisions after DS-1 that change a size or shape value, with the date each was made: the DS-1 text,
// the text now, and the value it resolves to when that differs from the text. Listed in tokens.css order.
const DECIDED_SINCE_DS1 = {
  // 2026-11-22: compact controls; the small control is 28px tall.
  '--control-sm': ['2rem', '1.75rem'],
  '--control-md': ['2.25rem', '2rem'],
  '--control-lg': ['2.75rem', '2.25rem'],
  // 2026-11-22: actions became rounded rectangles, not pills, and then took one 8px corner with rows,
  // and fields, and 12px for containers (radius scale B). 2026-11-24: each follows --radius-base (8px).
  '--radius-inline': ['6px', 'var(--radius-base)', '8px'],
  '--radius-control': ['999px', 'var(--radius-base)', '8px'],
  '--radius-panel': ['16px', 'calc(var(--radius-base) * 1.5)', 'calc(8px * 1.5)'],
  '--radius-field': ['10px', 'var(--radius-base)', '8px'],
}

test('tokens.css preserves DS-1 values except the command aliases, which follow the code well in every mode, and the decided shapes and sizes', () => {
  // Resolved through every token, the added ones included, then compared on the DS-1 names.
  const full = standaloneModes(read('language/tokens.css'))
  const generated = Object.fromEntries(Object.entries(standaloneModes(generatedTokens))
    .map(([mode, values]) => [mode, Object.fromEntries(Object.keys(values).map((name) => [name, full[mode][name]]))]))
  const expected = standaloneModes(handTokens)
  for (const mode of Object.keys(generated)) {
    assert.equal(generated[mode]['--color-command-bg'], generated[mode]['--color-code'])
    assert.equal(generated[mode]['--color-command-border'], generated[mode]['--color-border-subtle'])
    // Owner decision 2026-11-15: commands use the code well and its subtle edge.
    expected[mode]['--color-command-bg'] = expected[mode]['--color-code']
    expected[mode]['--color-command-border'] = expected[mode]['--color-border-subtle']
    for (const [name, [, text, resolved = text]] of Object.entries(DECIDED_SINCE_DS1)) expected[mode][name] = resolved
  }
  assert.deepEqual(generated, expected)
})

// Resolved values hide a reference that became a literal, which would stop a page's identity override
// from reaching the tokens derived from it. Only the listed declarations may change their text.
test('tokens.css keeps the DS-1 declaration text except documented reference, command alias, shape, and size changes', () => {
  const generated = blocksOf(generatedTokens, STANDALONE)
  const changed = Object.entries(blocksOf(handTokens, STANDALONE)).flatMap(([selector, values]) =>
    Object.entries(values).filter(([name, value]) => generated[selector][name] !== value)
      .map(([name, value]) => `${selector} ${name}: ${value} -> ${generated[selector][name]}`))

  assert.deepEqual(changed, [
    // Owner decision 2026-11-15: command tokens are code-well aliases, inherited by both dark rules.
    ':root --color-command-bg: color-mix(in srgb, var(--color-project) 25%, #101010) -> var(--color-code)',
    ':root --color-command-border: transparent -> var(--color-border-subtle)',
    ...Object.entries(DECIDED_SINCE_DS1).map(([name, [from, to]]) => `:root ${name}: ${from} -> ${to}`),
    ':root:not([data-theme="light"]) --color-command-bg: color-mix(in srgb, var(--color-project) 16%, black) -> undefined',
    ':root:not([data-theme="light"]) --color-command-border: color-mix(in srgb, var(--color-project) 28%, black) -> undefined',
    // The dark lift is the always-dark lift, so it names that token instead of repeating its value.
    ':root:not([data-theme="light"]) --shadow-nav-current: 0 1px 2px rgb(0 0 0 / 25%) -> var(--shadow-nav-current-dark)',
    ':root[data-theme="dark"] --color-command-bg: color-mix(in srgb, var(--color-project) 16%, black) -> undefined',
    ':root[data-theme="dark"] --color-command-border: color-mix(in srgb, var(--color-project) 28%, black) -> undefined',
    ':root[data-theme="dark"] --shadow-nav-current: 0 1px 2px rgb(0 0 0 / 25%) -> var(--shadow-nav-current-dark)',
  ])
})
