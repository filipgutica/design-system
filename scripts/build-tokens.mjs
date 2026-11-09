// Emits the Graphite Indigo theme from tokens/graphite-indigo.json, the only place its values live.
//
//   node scripts/build-tokens.mjs                      write both files
//   node scripts/build-tokens.mjs --check              fail when a file is stale
//   node scripts/build-tokens.mjs --tokens-out <path>  write the standalone tokens elsewhere
//
// Library theme: --color-* roles for @filipgutica/ui, opt-in through
// @filipgutica/ui/themes/graphite-indigo.css. Standalone tokens: the design-language
// vocabulary (--bg, --text, ...) for pages that do not use the library. Each standalone
// token line names the library variables for the same value, so --check also fails when
// that map is stale, names a variable the library does not define, or names a
// hand-written theme.css variable whose value differs from the token.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LIGHT = 0
const DARK = 1
const reference = /\{([\w-]+)\}/g

const flatTokens = (data) => Object.fromEntries(data.groups.flatMap(({ tokens }) => Object.entries(tokens)))

const valueFor = (tokens, name, mode) => {
  const value = tokens[name]
  if (value === undefined) throw new Error(`Unknown token "${name}"`)
  return Array.isArray(value) ? value[mode] : value
}

const block = (indent, declarations) => declarations.map(([name, value]) => `${indent}${name}: ${value};`)

const variablesIn = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name))

// Dark blocks list only what differs from light, compared after references resolve.
const darkOverrides = (names, resolve) => names
  .map((name) => [name, resolve(name, LIGHT), resolve(name, DARK)])
  .filter(([, light, dark]) => light !== dark)
  .map(([name, , dark]) => [name, dark])

export const renderLibraryTheme = (data) => {
  const tokens = flatTokens(data)
  const { roles, extras } = data.library
  const roleOfToken = new Map()
  for (const [role, token] of Object.entries(roles)) if (!roleOfToken.has(token)) roleOfToken.set(token, role)

  // A reference stays a live var() when its target has a role, so custom themes flow
  // through derived values. Otherwise the target's value is inlined.
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(
    reference,
    (_, target) => roleOfToken.has(target) ? `var(${roleOfToken.get(target)})` : resolve(target, mode),
  )
  const roleNames = Object.keys(roles)
  const resolveRole = (role, mode) => {
    const canonicalRole = roleOfToken.get(roles[role])
    return canonicalRole === role ? resolve(roles[role], mode) : `var(${canonicalRole})`
  }

  const light = [
    ...roleNames.map((role) => [role, resolveRole(role, LIGHT)]),
    ...extras.map((name) => [`--${name}`, resolve(name, LIGHT)]),
  ]
  // Repeat every role in dark mode: theme.css's :root.dark otherwise outranks
  // this theme's light :root aliases and values shared by both modes.
  const dark = roleNames.map((role) => [role, resolveRole(role, DARK)])

  return [
    '/* Generated from themes/graphite-indigo.json by scripts/graphite-indigo.mjs. Do not edit.',
    ' * Opt-in Graphite Indigo roles for @filipgutica/ui. Import after theme.css.',
    ' * Dark mode uses the same .dark class as theme.css. Keep exactly one :root.dark block:',
    ' * sites copy it into a <noscript> prefers-color-scheme rule. */',
    '',
    ':root {',
    '  color-scheme: light;',
    ...block('  ', light),
    '}',
    '',
    ':root.dark {',
    '  color-scheme: dark;',
    ...block('  ', dark),
    '}',
    '',
  ].join('\n')
}

const standaloneHeader = `/*
 * Design language tokens. Generated from themes/graphite-indigo.json in
 * @filipgutica/ui; edit that file and run \`pnpm themes:build\`. Values live there.
 * DESIGN.md names these tokens; it never repeats their values.
 *
 * Standalone HTML: import or inline this file.
 * Inline visuals: inherit the host font and theme variables; see DESIGN.md.
 * Repos: map these names onto the repository's own token system.
 * Sites on @filipgutica/ui: use the variable named in each line's "ui:" comment.
 * When a line names several, use the first; the others are component roles with the same value.
 *
 * Theme states: bare :root is light. prefers-color-scheme picks dark unless
 * data-theme="light" is set. data-theme="dark" forces dark.
 */
`

const standaloneBase = `/* Minimal base. Component styles live in reference.html. */
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: var(--weight-regular) var(--text-md) / var(--leading) var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, p { margin: 0; }
h1, h2, h3, h4 { font-weight: var(--weight-semibold); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); text-wrap: balance; }
code, kbd, pre { font-family: var(--font-mono); }
table, .num { font-variant-numeric: tabular-nums; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
p a, dd a { text-decoration: underline; text-underline-offset: 0.18em; }
:focus-visible { outline: var(--focus-width) solid var(--focus); outline-offset: var(--focus-offset); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; scroll-behavior: auto !important; }
}
`

// The library variables that carry each token: its roles, a fixed alias for a renamed
// token, or a variable of the same name. libraryCss is theme.css, the library's base theme.
const libraryNamesFor = (data, libraryCss) => {
  const defined = new Set([...variablesIn(libraryCss), ...variablesIn(renderLibraryTheme(data))])
  const { roles, aliases } = data.library
  const tokens = flatTokens(data)
  // Aliases and same-name variables take their values from the hand-written theme.css, not
  // from this file, so compare them: 1rem is 16px, and quote style does not matter.
  const handWritten = {}
  for (const [, variable, value] of libraryCss.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) handWritten[variable] ??= value.trim()
  const normalize = (value) => value.replace(/'/g, '"').replace(/([\d.]+)rem\b/g, (_, rem) => `${Number(rem) * 16}px`)
  const assertSameValue = (name, variable) => {
    const value = handWritten[variable]
    const token = valueFor(tokens, name, LIGHT)
    if (value !== undefined && normalize(value) !== normalize(token)) {
      throw new Error(`Token "${name}" is ${token}, but ${variable} in theme.css is ${value}`)
    }
  }
  return (name) => {
    // The general variable leads; the rest are component roles that share its value.
    const names = Object.entries(roles).filter(([, token]) => token === name).map(([role]) => role)
      .sort((a, b) => Number(b === `--color-${name}`) - Number(a === `--color-${name}`))
    const alias = aliases[name]
    if (alias !== undefined) {
      if (!defined.has(alias)) throw new Error(`Alias for "${name}" names ${alias}, which the library does not define`)
      assertSameValue(name, alias)
      names.push(alias)
    }
    if (names.length === 0 && defined.has(`--${name}`)) {
      assertSameValue(name, `--${name}`)
      names.push(`--${name}`)
    }
    // A token sites cannot reach through the library does not belong in the shared vocabulary.
    if (names.length === 0) {
      throw new Error(`Token "${name}" has no library variable; add a role, an alias, or an extra`)
    }
    return names.join(', ')
  }
}

export const renderStandaloneTokens = ({ data, libraryCss }) => {
  const tokens = flatTokens(data)
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => `var(--${target})`)
  const names = Object.keys(tokens)
  const dark = darkOverrides(names, resolve).map(([name, value]) => [`--${name}`, value])
  const libraryNames = libraryNamesFor(data, libraryCss)

  const groups = data.groups.map(({ comment, tokens: group }) => [
    '',
    `  /* ${comment} */`,
    ...Object.keys(group).map((name) => `  --${name}: ${resolve(name, LIGHT)}; /* ui: ${libraryNames(name)} */`),
  ])
  const darkLines = (indent) => block(indent, dark)

  return [
    standaloneHeader,
    ':root {',
    '  color-scheme: light;',
    ...groups.flat(),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    '    color-scheme: dark;',
    ...darkLines('    '),
    '  }',
    '}',
    '',
    ':root[data-theme="dark"] {',
    '  color-scheme: dark;',
    ...darkLines('  '),
    '}',
    '',
    standaloneBase,
  ].join('\n')
}

const run = () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const libraryPath = `${root}src/themes/graphite-indigo.css`
  const tokensPath = `${root}themes/graphite-indigo.tokens.css`
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const outIndex = args.indexOf('--tokens-out')
  const tokensOut = outIndex === -1 ? tokensPath : args[outIndex + 1]
  if (!tokensOut) throw new Error('--tokens-out needs a path')

  const data = JSON.parse(readFileSync(`${root}tokens/graphite-indigo.json`, 'utf8'))
  const libraryCss = readFileSync(`${root}src/theme.css`, 'utf8')
  const outputs = [
    [libraryPath, renderLibraryTheme(data)],
    [tokensOut, renderStandaloneTokens({ data, libraryCss })],
  ]

  const stale = []
  for (const [path, content] of outputs) {
    if (!check) {
      writeFileSync(path, content)
      continue
    }
    let current
    try {
      current = readFileSync(path, 'utf8')
    } catch {
      // A missing file is stale.
    }
    if (current !== content) stale.push(path)
  }
  if (stale.length > 0) {
    console.error(`Stale generated files. Run "pnpm themes:build":\n${stale.map((path) => `  ${path}`).join('\n')}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
