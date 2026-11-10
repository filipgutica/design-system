import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveRenameTable, oldNamePattern, readRenameTable, renameTokens, withoutRenameTable } from '../scripts/rename-tokens.mjs'
import { read } from './css.mjs'

// 2.0.0 renamed the 1.x short names to @filipgutica/ui's names (decisions.md#token-names). A page that
// still writes a 1.x name gets no error, only a var() that falls back, so the payload must name none.
const root = fileURLToPath(new URL('../language/', import.meta.url))
const table = readRenameTable(read('language/decisions.md'))
const oldWildcards = /(?<![\w-])--(?:\*-soft|code-\*)/g

// The count report reads its host's variables. Their names (shadcn's --border and --font-sans, and the
// common --success, --warning, and --info) match 1.x names but belong to the host, and the standalone
// report maps the design language's tokens onto them.
const hostVariables = ['--border', '--success', '--warning', '--info', '--font-sans']
const allowed = {
  'visualizations/report.css': hostVariables,
  'visualizations/build-count-report.mjs': hostVariables,
}

const oldNamesIn = (file, text) => [...text.matchAll(oldNamePattern(table)), ...text.matchAll(oldWildcards)]
  .map(([name]) => name)
  .filter((name) => !(allowed[file] ?? []).includes(name))

test('the guard catches whole 1.x names and patterns, and allows host variables only in the count report', () => {
  const planted = 'color: var(--text); font-size: var(--text-xs); border: var(--border); the `--*-soft` tokens'

  assert.deepEqual(oldNamesIn('components.html', planted), ['--text', '--border', '--*-soft'])
  assert.deepEqual(oldNamesIn('visualizations/report.css', planted), ['--text', '--*-soft'])
})

test('no payload file uses a 1.x token name', () => {
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
  for (const file of files) {
    const text = readFileSync(join(root, file), 'utf8')
    assert.deepEqual(oldNamesIn(file, file === 'decisions.md' ? withoutRenameTable(text) : text), [], file)
  }
})

test('the rename table is the ui: mapping of the 1.x tokens.css', () => {
  assert.deepEqual([...table], [...deriveRenameTable(read('tests/fixtures/ds-1-tokens.css'))])
})

test('the codemod renames whole names in pages and bare names in token JSON', () => {
  assert.equal(
    renameTokens({ text: 'var(--text) var(--text-muted) var(--text-xs) "a\\n--project"', table }),
    'var(--color-text) var(--color-muted) var(--text-xs) "a\\n--color-project"',
  )
  assert.equal(
    renameTokens({ text: '{ "surface-hover": "{bg}", "text-xs": "none" }', table, json: true }),
    '{ "color-surface-muted": "{color-bg}", "text-xs": "none" }',
  )
})
