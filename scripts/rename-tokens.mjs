// Renames the 1.x short token names, such as --bg, to the names the design system shares with
// @filipgutica/ui, such as --color-bg. The rename table lives in language/decisions.md.
//
//   node scripts/rename-tokens.mjs <file>...              rewrite each file in place
//   node scripts/rename-tokens.mjs --derive <tokens.css>  print the table a 1.x tokens.css implies
//
// A 1.x tokens.css line names its ui variable in a "ui:" comment, and that variable is the new name:
// the first one where a comment names several, or the fallback's variable for var(--color-x, …).
// Pages, specs, CSS, and scripts write a token with its dashes (--bg). Token JSON writes it bare:
// as a key, a quoted value, or a {reference}.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const TABLE_START = '<!-- rename-table:start -->'
const TABLE_END = '<!-- rename-table:end -->'

/** Old name → new name for every 1.x tokens.css line whose ui variable has another name. */
export const deriveRenameTable = (tokensCss) => {
  const light = tokensCss.slice(tokensCss.indexOf(':root {'), tokensCss.indexOf('\n}\n'))
  return new Map([...light.matchAll(/^\s*(--[\w-]+):[^;]+;\s*\/\* ui: (.+?) \*\//gm)]
    .map(([, name, ui]) => [name, /^var\((--[\w-]+),/.exec(ui)?.[1] ?? ui.split(', ')[0]])
    .filter(([name, uiName]) => name !== uiName))
}

export const renderRenameTable = (table) => [
  TABLE_START,
  '| Name before the 2.0.0 rename | Name after |',
  '| --- | --- |',
  ...[...table].map(([from, to]) => `| \`${from}\` | \`${to}\` |`),
  TABLE_END,
].join('\n')

/** The rename table between the markers in decisions.md. */
export const readRenameTable = (decisionsMd) => {
  const start = decisionsMd.indexOf(TABLE_START)
  const end = decisionsMd.indexOf(TABLE_END)
  if (start === -1 || end < start) throw new Error('decisions.md has no rename table')
  const rows = [...decisionsMd.slice(start, end).matchAll(/^\| `(--[\w-]+)` \| `(--[\w-]+)` \|$/gm)]
  if (rows.length === 0) throw new Error('decisions.md rename table has no rows')
  return new Map(rows.map(([, from, to]) => [from, to]))
}

/** The part of decisions.md outside the rename table, which must name only current tokens. */
export const withoutRenameTable = (decisionsMd) =>
  decisionsMd.slice(0, decisionsMd.indexOf(TABLE_START)) + decisionsMd.slice(decisionsMd.indexOf(TABLE_END) + TABLE_END.length)

// A whole name only: --text matches neither --text-muted nor --text-xs. A name may follow a \n or \t
// escape, as in a JSON or JavaScript string.
export const oldNamePattern = (table) => new RegExp(`(?<=^|[^\\w-]|\\\\[nt])(?:${[...table.keys()].join('|')})(?![\\w-])`, 'g')

// Token JSON names a token without dashes, directly inside quotes or braces.
const bareNamePattern = (table) => new RegExp(`(?<=["{])(?:${[...table.keys()].map((name) => name.slice(2)).join('|')})(?=["}])`, 'g')

// Renames every old name in the text, except inside a rename table, which keeps the old names on purpose.
export const renameTokens = ({ text, table, json = false }) => {
  const start = text.indexOf(TABLE_START)
  if (start !== -1) {
    const end = text.indexOf(TABLE_END) + TABLE_END.length
    return renameTokens({ text: text.slice(0, start), table, json }) + text.slice(start, end) + renameTokens({ text: text.slice(end), table, json })
  }
  const renamed = text.replace(oldNamePattern(table), (name) => table.get(name))
  return json ? renamed.replace(bareNamePattern(table), (name) => table.get(`--${name}`).slice(2)) : renamed
}

const run = () => {
  const args = process.argv.slice(2)
  if (args[0] === '--derive') {
    console.log(renderRenameTable(deriveRenameTable(readFileSync(args[1], 'utf8'))))
    return
  }
  const table = readRenameTable(readFileSync(new URL('../language/decisions.md', import.meta.url), 'utf8'))
  for (const path of args) {
    const text = readFileSync(path, 'utf8')
    const renamed = renameTokens({ text, table, json: path.endsWith('.json') })
    if (renamed !== text) {
      writeFileSync(path, renamed)
      console.log(`renamed ${path}`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
