// Emits every token file from tokens/core.json and the theme files in tokens/themes/, the only places
// token values live. A theme file holds only identity inputs: its name, a note for the Themes page, its
// hue pair, and optionally its two font stacks. Every other token is core.
//
//   node scripts/build-tokens.mjs           write every output
//   node scripts/build-tokens.mjs --check   fail when an output is stale
//
// The CSS has one variable per token. language/tokens.css carries the default theme; each
// dist/themes/<id>.css sets one theme's identity inputs, to load after it. Dark mode follows
// prefers-color-scheme unless data-theme="light"; data-theme="dark" forces it.
// dist/tokens.json and dist/tokens.js carry the values of every theme, resolved, for code.
//
// Each group also carries reader-facing text for the site's Foundations page, which no output
// above includes: an id, a title, a note, and roles (what each token is for, one entry per token,
// with `backticks` for code).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LIGHT = 0
const DARK = 1
const reference = /\{([\w-]+)\}/g
export const DEFAULT_THEME = 'graphite-indigo'
const SOURCE = `tokens/core.json and tokens/themes/${DEFAULT_THEME}.json`

const flatTokens = (data) => Object.fromEntries(data.groups.flatMap(({ tokens }) => Object.entries(tokens)))

const HEX = /^#[\da-f]{6}$/i

// Problems with a theme file: a missing name, note, or hue, a hue that is not #rrggbb, a font that is not
// a string, or a key a theme cannot set.
export const themeProblems = (theme) => {
  const problems = []
  for (const field of ['name', 'note']) if (typeof theme[field] !== 'string' || !theme[field]) problems.push(`no ${field}`)
  for (const mode of ['light', 'dark']) if (!HEX.test(theme.hue?.[mode] ?? '')) problems.push(`hue.${mode} is not #rrggbb`)
  for (const [font, value] of Object.entries(theme.fonts ?? {})) {
    if (!['ui', 'mono'].includes(font)) problems.push(`fonts.${font} is not a theme input`)
    else if (typeof value !== 'string' || !value) problems.push(`fonts.${font} is not a font stack`)
  }
  for (const key of Object.keys(theme)) if (!['name', 'note', 'hue', 'fonts'].includes(key)) problems.push(`${key} is not a theme input`)
  return problems
}

// The core tokens with one theme's identity inputs filled in. Core leaves the hue pair empty; its font
// stacks stay unless the theme names its own.
export const applyTheme = (core, theme) => {
  const data = structuredClone(core)
  const identity = data.groups.find(({ identity: isIdentity }) => isIdentity).tokens
  identity['color-project'] = [theme.hue.light, '{color-project-dark}']
  identity['color-project-dark'] = theme.hue.dark
  if (theme.fonts?.ui) identity['font-ui'] = theme.fonts.ui
  if (theme.fonts?.mono) identity['font-mono'] = theme.fonts.mono
  return data
}

// The token source: tokens/core.json and every theme in tokens/themes/, the default first, then by name.
// Each theme carries its source data with its inputs applied. A theme file with a problem stops the build.
export const readTokens = (root) => {
  const core = JSON.parse(readFileSync(`${root}tokens/core.json`, 'utf8'))
  const themes = readdirSync(`${root}tokens/themes`).filter((file) => file.endsWith('.json'))
    .map((file) => {
      const inputs = JSON.parse(readFileSync(`${root}tokens/themes/${file}`, 'utf8'))
      return { id: file.slice(0, -'.json'.length), problems: themeProblems(inputs), ...inputs }
    })
    .toSorted((a, b) => Number(b.id === DEFAULT_THEME) - Number(a.id === DEFAULT_THEME) || a.name.localeCompare(b.name))
  if (themes[0]?.id !== DEFAULT_THEME) throw new Error(`tokens/themes/${DEFAULT_THEME}.json is missing`)
  const problems = themes.flatMap(({ id, problems: found }) => found.map((problem) => `tokens/themes/${id}.json: ${problem}`))
  if (problems.length > 0) throw new Error(`Theme files with problems:\n  ${problems.join('\n  ')}`)
  return { core, themes: themes.map(({ problems: _, ...theme }) => ({ ...theme, data: applyTheme(core, theme) })) }
}

// Problems with the reader-facing text: a group without an id, title, or note, a token without a
// role, a role for a token the group does not have, or markup in a role (roles are plain text).
export const docProblems = (data) => {
  const problems = []
  const ids = new Set()
  data.groups.forEach(({ id, title, note, roles = {}, tokens }, index) => {
    const where = id ?? `group ${index}`
    for (const [field, value] of Object.entries({ id, title, note })) if (!value) problems.push(`${where}: no ${field}`)
    if (id && ids.has(id)) problems.push(`${where}: duplicate id`)
    ids.add(id)
    for (const name of Object.keys(tokens)) if (!roles[name]) problems.push(`--${name}: no role`)
    for (const [name, role] of Object.entries(roles)) {
      if (!(name in tokens)) problems.push(`${where}: role for --${name}, which the group does not have`)
      else if (/[<>]/.test(role)) problems.push(`--${name}: markup in its role`)
    }
  })
  return problems
}

const valueFor = (tokens, name, mode) => {
  const value = tokens[name]
  if (value === undefined) throw new Error(`Unknown token "${name}"`)
  return Array.isArray(value) ? value[mode] : value
}

const block = (indent, declarations) => declarations.map(([name, value]) => `${indent}${name}: ${value};`)

// A comment whose later lines line up under the first line's text, as tokens.css writes them.
const comment = (indent, text) => `${indent}/* ${text.split('\n').join(`\n${indent}   `)} */`

// Dark blocks list only what differs from light, compared after references resolve.
const darkOverrides = (names, resolve) => names
  .map((name) => [name, resolve(name, LIGHT), resolve(name, DARK)])
  .filter(([, light, dark]) => light !== dark)
  .map(([name, , dark]) => [name, dark])

const standaloneHeader = `/*
 * Design language tokens. Generated from ${SOURCE}
 * by scripts/build-tokens.mjs in @filipgutica/design-system: edit the JSON and run
 * \`pnpm tokens:build\`. Do not edit this file.
 * DESIGN.md names these tokens; it never repeats their values.
 *
 * Two layers. The identity block at the top of :root is the theme's own: its hue
 * pair and fonts. This file carries the default theme. Another theme keeps this file
 * unchanged and loads its themes/<id>.css after it, on :root; a new project can set
 * those lines on :root in its own stylesheet the same way. The dark blocks switch
 * --color-project to --color-project-dark, so the override needs no dark rule. Check
 * --color-accent-text at 4.5:1 on the new hue and override it too when it falls short.
 * The terminal plate tokens also belong to the identity layer; every other line is core.
 *
 * Standalone HTML: import or inline this file.
 * Inline visuals: inherit the host font and theme variables; see DESIGN.md.
 * Repos: map these names onto the repository's own token system.
 *
 * Theme states: bare :root is light. prefers-color-scheme picks dark unless
 * data-theme="light" is set. data-theme="dark" forces dark.
 */
`

const standaloneBase = `/* Minimal base. Component styles live in components.html. The base sits in a layer, so any
   page or component rule outranks it whatever its specificity. A layered !important outranks an
   unlayered one, so reduced-motion exceptions belong here too. */
/* The page's own background and text colour stay outside the layer. A host that wraps the page in
   its own unlayered reset, such as an artifact viewer, would otherwise keep its body colours while
   the tokens switch to dark, leaving token-coloured text on the wrong background. */
body { background: var(--color-bg); color: var(--color-text); }
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body {
    margin: 0;
    font: var(--weight-regular) var(--text-md) / var(--leading) var(--font-ui);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, p { margin: 0; }
  h1, h2, h3, h4 { font-weight: var(--weight-semibold); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); text-wrap: balance; }
  code, kbd, pre { font-family: var(--font-mono); }
  table, .num { font-variant-numeric: tabular-nums; }
  a { color: var(--color-link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  p a, dd a { text-decoration: underline; text-underline-offset: 0.18em; }
  :focus-visible { outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; scroll-behavior: auto !important; }
    /* A busy spinner slows instead of stopping, so the busy state stays visible. */
    [aria-busy="true"]::before { animation-duration: 1.4s !important; }
  }
}
`

const standaloneResolver = (data) => {
  const tokens = flatTokens(data)
  return (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => `var(--${target})`)
}

const standaloneNames = (data) => Object.keys(flatTokens(data))

export const renderStandaloneTokens = (data) => {
  const resolve = standaloneResolver(data)
  const dark = darkOverrides(standaloneNames(data), resolve).map(([name, value]) => [`--${name}`, value])

  const groups = data.groups.map(({ comment: groupComment, notes = {}, tokens }) => [
    '',
    comment('  ', groupComment),
    ...Object.keys(tokens).flatMap((name) => [
      ...(notes[name] === undefined ? [] : [comment('  ', notes[name])]),
      `  --${name}: ${resolve(name, LIGHT)};`,
    ]),
  ])

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
    ...block('    ', dark),
    '  }',
    '}',
    '',
    ':root[data-theme="dark"] {',
    '  color-scheme: dark;',
    ...block('  ', dark),
    '}',
    '',
    standaloneBase,
  ].join('\n')
}

// One theme's identity inputs only, to load after tokens.css on :root. Its dark blocks already switch
// --color-project to --color-project-dark, so a theme needs no dark rule.
export const renderStandaloneTheme = ({ id, name, data }) => {
  const resolve = standaloneResolver(data)
  const identity = data.groups.filter(({ identity: isIdentity }) => isIdentity).flatMap(({ tokens }) => Object.keys(tokens))
  return [
    `/* Generated from tokens/themes/${id}.json by scripts/build-tokens.mjs in @filipgutica/design-system. Do not edit.`,
    ` * The ${name} identity inputs for tokens.css. Load after tokens.css, on :root only: the tokens that`,
    ' * follow the hue resolve on :root, so a theme scoped to an element below it changes the hue there, but',
    " * the accent, focus ring, and selection keep the default theme's colours. */",
    '',
    ':root {',
    ...block('  ', identity.map((name) => [`--${name}`, resolve(name, LIGHT)])),
    '}',
    '',
  ].join('\n')
}

// Standalone token values of every theme with every reference substituted, as getComputedStyle reports them.
export const resolvedTokens = (themes) => {
  const themeValues = ({ data }) => {
    const tokens = flatTokens(data)
    const resolve = (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => resolve(target, mode))
    const names = standaloneNames(data)
    const values = (mode) => Object.fromEntries(names.map((name) => [name, resolve(name, mode)]))
    return { light: values(LIGHT), dark: values(DARK) }
  }
  return { themes: Object.fromEntries(themes.map((theme) => [theme.id, themeValues(theme)])) }
}

const generatedNote = 'Generated from tokens/core.json and tokens/themes/ by scripts/build-tokens.mjs. Do not edit.'
const cssVarDoc = "/** The var() reference for a token, such as cssVar('color-text') for 'var(--color-text)'. */"

export const renderTokensJs = (themes) => [
  `// ${generatedNote}`,
  `export const tokens = ${JSON.stringify(resolvedTokens(themes), null, 2)}`,
  '',
  cssVarDoc,
  'export const cssVar = (name) => `var(--${name})`',
  '',
].join('\n')

export const renderTokensDts = ({ data }, themes) => [
  `// ${generatedNote}`,
  '/** A token name: its CSS variable in tokens.css without the leading dashes. */',
  `export type TokenName =\n${standaloneNames(data).map((name) => `  | '${name}'`).join('\n')}`,
  '',
  `export type ThemeName = ${themes.map(({ id }) => `'${id}'`).join(' | ')}`,
  '',
  '/** Resolved values, as getComputedStyle reports them on the root element. */',
  'export declare const tokens: {',
  '  themes: Record<ThemeName, { light: Record<TokenName, string>, dark: Record<TokenName, string> }>',
  '}',
  '',
  cssVarDoc,
  'export declare const cssVar: <Name extends TokenName>(name: Name) => `var(--${Name})`',
  '',
].join('\n')

export const outputs = (themes) => {
  const [defaultTheme] = themes
  return [
    ['language/tokens.css', renderStandaloneTokens(defaultTheme.data)],
    ...themes.map((theme) => [`dist/themes/${theme.id}.css`, renderStandaloneTheme(theme)]),
    ['dist/tokens.json', `${JSON.stringify(resolvedTokens(themes), null, 2)}\n`],
    ['dist/tokens.js', renderTokensJs(themes)],
    ['dist/tokens.d.ts', renderTokensDts(defaultTheme, themes)],
  ]
}

const run = () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const check = process.argv.slice(2).includes('--check')
  const { core, themes } = readTokens(root)

  const problems = docProblems(core)
  if (problems.length > 0) {
    console.error(`tokens/core.json needs reader-facing text:\n${problems.map((problem) => `  ${problem}`).join('\n')}`)
    process.exitCode = 1
    return
  }

  const stale = []
  for (const [path, content] of outputs(themes)) {
    if (!check) {
      mkdirSync(dirname(`${root}${path}`), { recursive: true })
      writeFileSync(`${root}${path}`, content)
      continue
    }
    let current
    try {
      current = readFileSync(`${root}${path}`, 'utf8')
    } catch {
      // A missing file is stale.
    }
    if (current !== content) stale.push(path)
  }
  if (stale.length > 0) {
    console.error(`Stale generated files. Run "pnpm tokens:build":\n${stale.map((path) => `  ${path}`).join('\n')}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
