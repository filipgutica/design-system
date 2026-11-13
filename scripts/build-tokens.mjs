// Emits every token file from tokens/core.json and the theme files in tokens/themes/, the only places
// token values live. A theme file holds only its inputs: its name, a note for the Themes page, its hue
// pair, and optionally its two font stacks and its neutrals (NEUTRALS, for light and dark). Every other
// token is core. The text on the selected fills is the first candidate in TEXT_CANDIDATES that reaches
// 4.5:1 in each mode, as their roles in core.json say.
//
//   node scripts/build-tokens.mjs           write every output
//   node scripts/build-tokens.mjs --check   fail when an output is stale
//
// The CSS has one variable per token. language/tokens.css carries the default theme; each
// dist/themes/<id>.css sets what one theme changes from it, to load after it. Dark mode follows
// prefers-color-scheme unless data-theme="light"; data-theme="dark" forces it.
// dist/tokens.json and dist/tokens.js carry the values of every theme, resolved, for code.
//
// Each group also carries reader-facing text for the site's Foundations page, which no output
// above includes: an id, a title, a note, and roles (what each token is for, one entry per token,
// with `backticks` for code).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { over, parseColour, ratio } from './colour.mjs'

const LIGHT = 0
const DARK = 1
const reference = /\{([\w-]+)\}/g
export const DEFAULT_THEME = 'graphite-indigo'
const SOURCE = `tokens/core.json and tokens/themes/${DEFAULT_THEME}.json`

const flatTokens = (data) => Object.fromEntries(data.groups.flatMap(({ tokens }) => Object.entries(tokens)))

const HEX = /^#[\da-f]{6}$/i

// The core neutrals a theme may replace, as a set: a palette that brings its own neutrals sets all of them.
export const NEUTRALS = ['color-bg', 'color-surface', 'color-surface-raised', 'color-surface-muted', 'color-row-hover', 'color-border-subtle', 'color-border', 'color-text', 'color-muted']

// Problems with a theme file: a missing name, note, or hue, a hue that is not #rrggbb, a font that is not
// a string, neutrals that are not the whole set in #rrggbb for both modes, or a key a theme cannot set.
export const themeProblems = (theme) => {
  const problems = []
  for (const field of ['name', 'note']) if (typeof theme[field] !== 'string' || !theme[field]) problems.push(`no ${field}`)
  for (const mode of ['light', 'dark']) if (!HEX.test(theme.hue?.[mode] ?? '')) problems.push(`hue.${mode} is not #rrggbb`)
  for (const [font, value] of Object.entries(theme.fonts ?? {})) {
    if (!['ui', 'mono'].includes(font)) problems.push(`fonts.${font} is not a theme input`)
    else if (typeof value !== 'string' || !value) problems.push(`fonts.${font} is not a font stack`)
  }
  for (const [mode, neutrals] of Object.entries(theme.neutrals ?? {})) {
    if (!['light', 'dark'].includes(mode)) problems.push(`neutrals.${mode} is not a mode`)
    else for (const name of new Set([...NEUTRALS, ...Object.keys(neutrals)])) {
      if (!NEUTRALS.includes(name)) problems.push(`neutrals.${mode}.${name} is not a neutral`)
      else if (!HEX.test(neutrals[name] ?? '')) problems.push(`neutrals.${mode}.${name} is not #rrggbb`)
    }
  }
  if (theme.neutrals && !(theme.neutrals.light && theme.neutrals.dark)) problems.push('neutrals needs light and dark')
  for (const key of Object.keys(theme)) if (!['name', 'note', 'hue', 'fonts', 'neutrals'].includes(key)) problems.push(`${key} is not a theme input`)
  return problems
}

// The core tokens with one theme's inputs filled in. Core leaves the hue pair empty; its font stacks and
// neutrals stay unless the theme names its own. Then each selected-fill text token takes its readable value.
export const applyTheme = (core, theme) => {
  const data = structuredClone(core)
  const identity = data.groups.find(({ identity: isIdentity }) => isIdentity).tokens
  identity['color-project'] = [theme.hue.light, '{color-project-dark}']
  identity['color-project-dark'] = theme.hue.dark
  if (theme.fonts?.ui) identity['font-ui'] = theme.fonts.ui
  if (theme.fonts?.mono) identity['font-mono'] = theme.fonts.mono
  if (theme.neutrals) for (const name of NEUTRALS) groupOf(data, name).tokens[name] = [theme.neutrals.light[name], theme.neutrals.dark[name]]
  return withReadableText(data)
}

const groupOf = (data, name) => data.groups.find(({ tokens }) => name in tokens)

// Each selected fill's text, with how its contrast is measured on resolved values: the lowest ratio
// over every place the fill sits. The candidates come from the tokens' roles in core.json.
const TEXT_ON_FILL = {
  'color-nav-current-text': (ink, value) => Math.min(...['color-bg', 'color-surface', 'color-surface-raised']
    .map((surface) => ratio(ink, over(value('color-nav-current'), value(surface))))),
  'color-segmented-current-text': (ink, value) => ratio(ink, over(value('color-control-thumb'), value('color-well'))),
}
const TEXT_CANDIDATES = ['{color-accent}', '{color-text}', 'black', 'white']

// Sets each TEXT_ON_FILL token to its first candidate that reaches 4.5:1, per mode. When none does, the
// accent stays, so the contrast tests fail on it rather than on a silently chosen colour.
const withReadableText = (data) => {
  const values = resolveData(data)
  for (const [name, measure] of Object.entries(TEXT_ON_FILL)) {
    const pick = (mode) => {
      const value = (token) => parseColour(values[mode][token])
      const colour = (candidate) => parseColour(candidate.replace(reference, (_, target) => values[mode][target]))
      return TEXT_CANDIDATES.find((candidate) => measure(colour(candidate), value) >= 4.5) ?? TEXT_CANDIDATES[0]
    }
    const [light, dark] = [pick('light'), pick('dark')]
    groupOf(data, name).tokens[name] = light === dark ? light : [light, dark]
  }
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
 * unchanged and loads its themes/<id>.css after it, on :root; that file may also set
 * the theme's neutrals. A new project can set the identity lines on :root in its own
 * stylesheet the same way. The dark blocks switch --color-project to
 * --color-project-dark, so the override needs no dark rule. Check --color-accent-text,
 * --color-nav-current-text, and --color-segmented-current-text at 4.5:1 on the new hue
 * and override them when they fall short; a theme file does this for you.
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

// One theme's values in light and dark, with every reference substituted.
function resolveData(data) {
  const tokens = flatTokens(data)
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => resolve(target, mode))
  const values = (mode) => Object.fromEntries(Object.keys(tokens).map((name) => [name, resolve(name, mode)]))
  return { light: values(LIGHT), dark: values(DARK) }
}

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

// What one theme changes from tokens.css, to load after it on :root: its identity inputs, then every other
// token whose light value differs. tokens.css's dark blocks outrank a bare :root, so the theme's dark
// blocks, with the same selectors, set each token whose dark value would otherwise come out wrong.
// A hue-only theme needs none: tokens.css's dark blocks already switch to --color-project-dark.
export const renderStandaloneTheme = ({ id, name, data }, defaultTheme) => {
  const resolve = standaloneResolver(data)
  const resolveDefault = standaloneResolver(defaultTheme.data)
  const names = standaloneNames(data)
  const identity = data.groups.filter(({ identity: isIdentity }) => isIdentity).flatMap(({ tokens }) => Object.keys(tokens))
  const root = [...identity, ...names.filter((token) => !identity.includes(token) && resolve(token, LIGHT) !== resolveDefault(token, LIGHT))]
  const defaultDark = new Map(darkOverrides(names, resolveDefault))
  const seenInDark = (token) => defaultDark.get(token) ?? (root.includes(token) ? resolve(token, LIGHT) : resolveDefault(token, LIGHT))
  const dark = names.filter((token) => resolve(token, DARK) !== seenInDark(token)).map((token) => [`--${token}`, resolve(token, DARK)])
  return [
    `/* Generated from tokens/themes/${id}.json by scripts/build-tokens.mjs in @filipgutica/design-system. Do not edit.`,
    ` * The ${name} theme for tokens.css. Load after tokens.css, on :root only: the tokens that follow the`,
    ' * theme resolve on :root, so a theme scoped to an element below it changes its inputs there, but the',
    " * accent, focus ring, and selection keep the default theme's colours. */",
    '',
    ':root {',
    ...block('  ', root.map((token) => [`--${token}`, resolve(token, LIGHT)])),
    '}',
    ...(dark.length === 0 ? [] : [
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      ...block('    ', dark),
      '  }',
      '}',
      '',
      ':root[data-theme="dark"] {',
      ...block('  ', dark),
      '}',
    ]),
    '',
  ].join('\n')
}

// Standalone token values of every theme with every reference substituted, as getComputedStyle reports them.
export const resolvedTokens = (themes) => ({ themes: Object.fromEntries(themes.map(({ id, data }) => [id, resolveData(data)])) })

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
    ...themes.map((theme) => [`dist/themes/${theme.id}.css`, renderStandaloneTheme(theme, defaultTheme)]),
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
