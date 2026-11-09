// Emits every token file from tokens/graphite-indigo.json, the only place token values live.
//
//   node scripts/build-tokens.mjs           write every output
//   node scripts/build-tokens.mjs --check   fail when an output is stale
//
// Two CSS flavours come from the same values:
// - Standalone (language/tokens.css, dist/themes/*.css): the design-language names (--bg, --text, ...).
//   Dark mode follows prefers-color-scheme unless data-theme="light"; data-theme="dark" forces it.
// - Class (dist/class/base.css, dist/class/themes/*.css): @filipgutica/ui's names (--color-*, ...).
//   Dark mode is a .dark class on <html>.
// dist/tokens.json and dist/tokens.js carry the standalone values, resolved, for code.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LIGHT = 0
const DARK = 1
const reference = /\{([\w-]+)\}/g
const THEME = 'graphite-indigo'

const flatTokens = (data) => Object.fromEntries(data.groups.flatMap(({ tokens }) => Object.entries(tokens)))

// The groups tokens.css declares: every group but the library-only one.
const standaloneGroups = (data) => data.groups.filter(({ standalone }) => standalone !== false)

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

// [variable, token] pairs for every library variable the JSON defines, in class-base order. Tokens
// with no role, base role, alias, or fallback reach the library as a variable of the same name.
const libraryVariables = (data) => {
  const { roles, baseRoles, aliases, fallbacks, extras } = data.library
  const named = new Set([...Object.values(roles), ...Object.values(baseRoles), ...Object.keys(aliases), ...Object.keys(fallbacks)])
  const sameName = Object.keys(flatTokens(data)).filter((name) => !named.has(name)).map((name) => [`--${name}`, name])
  return {
    // The class base: every variable but the extras, which only the opt-in theme declares. Fallbacks
    // are not variables: ui writes them at the use site, so subtree overrides of their fallback stay live.
    base: [
      ...Object.entries(roles),
      ...Object.entries(baseRoles),
      ...Object.entries(aliases).map(([token, variable]) => [variable, token]),
      ...sameName.filter(([, name]) => !extras.includes(name)),
    ],
    sameName,
  }
}

// A token's first variable is its canonical one.
const canonicalVariables = (pairs) => {
  const variableOf = new Map()
  for (const [variable, token] of pairs) if (!variableOf.has(token)) variableOf.set(token, variable)
  return variableOf
}

// Resolves a token for the class flavour: a reference to a token with a variable stays a live var(),
// so overrides flow through derived values; any other reference is inlined.
const classResolver = ({ tokens, variableOf }) => {
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(
    reference,
    (_, target) => variableOf.has(target) ? `var(${variableOf.get(target)})` : resolve(target, mode),
  )
  return resolve
}

// Declarations for [variable, token] pairs. A variable that shares its token with an earlier one points at it.
const classDeclarations = ({ pairs, variableOf, resolve, mode }) => pairs.map(([variable, token]) =>
  [variable, variableOf.get(token) === variable ? resolve(token, mode) : `var(${variableOf.get(token)})`])

const classHeader = (lines) => [
  `/* Generated from tokens/${THEME}.json by scripts/build-tokens.mjs in @filipgutica/design-system. Do not edit.`,
  ...lines.map((line) => ` * ${line}`),
].join('\n').concat(' */')

const classFile = ({ header, light, dark }) => [
  classHeader(header),
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

export const renderLibraryTheme = (data) => {
  const tokens = flatTokens(data)
  const { roles, extras } = data.library
  const pairs = Object.entries(roles)
  const variableOf = canonicalVariables(pairs)
  const resolve = classResolver({ tokens, variableOf })
  return classFile({
    header: [
      'Opt-in Graphite Indigo roles for the class flavour. Import after class/base.css (theme.css in @filipgutica/ui).',
      'Dark mode uses the same .dark class as the base. Keep exactly one :root.dark block:',
      'sites copy it into a <noscript> prefers-color-scheme rule.',
    ],
    light: [
      ...classDeclarations({ pairs, variableOf, resolve, mode: LIGHT }),
      ...extras.map((name) => [`--${name}`, resolve(name, LIGHT)]),
    ],
    // Repeat every role in dark mode: the base's :root.dark otherwise outranks
    // this theme's light :root aliases and values shared by both modes.
    dark: classDeclarations({ pairs, variableOf, resolve, mode: DARK }),
  })
}

export const renderClassBase = (data) => {
  const { base } = libraryVariables(data)
  const variableOf = canonicalVariables(base)
  const resolve = classResolver({ tokens: flatTokens(data), variableOf })
  // The dark block repeats every colour and shadow, as ui's theme.css always has, except the light-only
  // ones: they follow other variables through var(), so a light override reaches dark too.
  const { lightOnly } = data.library
  const darkPairs = base.filter(([variable]) => /^--(color|shadow)-/.test(variable) && !lightOnly.includes(variable))
  return classFile({
    header: [
      'Base tokens for the class flavour: toggle .dark on <html> for dark mode.',
      'Keep exactly one :root.dark block: sites copy it into a <noscript> prefers-color-scheme rule.',
    ],
    light: classDeclarations({ pairs: base, variableOf, resolve, mode: LIGHT }),
    dark: classDeclarations({ pairs: darkPairs, variableOf, resolve, mode: DARK }),
  })
}

// The library variables that carry each token, for the "ui:" comments: its roles (the general one
// first), an alias for a renamed token, or a variable of the same name. A use-site fallback is written
// as ui writes it, var(--color-x, <its value>).
const libraryNamesFor = (data) => {
  const { roles, baseRoles, aliases, fallbacks } = data.library
  const { base, sameName } = libraryVariables(data)
  const resolve = classResolver({ tokens: flatTokens(data), variableOf: canonicalVariables(base) })
  const sameNameTokens = new Set(sameName.map(([, name]) => name))
  return (name) => {
    if (fallbacks[name] !== undefined) return `var(${fallbacks[name]}, ${resolve(name, LIGHT)})`
    const names = Object.entries({ ...roles, ...baseRoles }).filter(([, token]) => token === name).map(([role]) => role)
      .sort((a, b) => Number(b === `--color-${name}`) - Number(a === `--color-${name}`))
    if (aliases[name] !== undefined) names.push(aliases[name])
    if (sameNameTokens.has(name)) names.push(`--${name}`)
    return names.join(', ')
  }
}

const standaloneHeader = `/*
 * Design language tokens. Generated from tokens/${THEME}.json by scripts/build-tokens.mjs in
 * @filipgutica/design-system: edit the JSON and run \`pnpm tokens:build\`. Do not edit this file.
 * DESIGN.md names these tokens; it never repeats their values.
 *
 * Two layers. The identity block at the top of :root is the project's own: its hue
 * pair and fonts. A new project keeps this file unchanged and sets those lines on
 * :root in its own stylesheet, loaded after this one. The dark blocks switch
 * --project to --project-dark, so the override needs no dark rule. Check
 * --accent-text at 4.5:1 on the new hue and override it too when it falls short.
 * The terminal plate tokens also belong to the identity layer; every other line is core.
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

const standaloneBase = `/* Minimal base. Component styles live in components.html. The base sits in a layer, so any
   page or component rule outranks it whatever its specificity. A layered !important outranks an
   unlayered one, so reduced-motion exceptions belong here too. */
/* The page's own background and text colour stay outside the layer. A host that wraps the page in
   its own unlayered reset, such as an artifact viewer, would otherwise keep its body colours while
   the tokens switch to dark, leaving token-coloured text on the wrong background. */
body { background: var(--bg); color: var(--text); }
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body {
    margin: 0;
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
    /* A busy spinner slows instead of stopping, so the busy state stays visible. */
    [aria-busy="true"]::before { animation-duration: 1.4s !important; }
  }
}
`

const standaloneResolver = (data) => {
  const tokens = flatTokens(data)
  return (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => `var(--${target})`)
}

const standaloneNames = (data) => standaloneGroups(data).flatMap(({ tokens }) => Object.keys(tokens))

export const renderStandaloneTokens = (data) => {
  const resolve = standaloneResolver(data)
  const dark = darkOverrides(standaloneNames(data), resolve).map(([name, value]) => [`--${name}`, value])
  const libraryNames = libraryNamesFor(data)

  const groups = standaloneGroups(data).map(({ comment: groupComment, notes = {}, tokens }) => [
    '',
    comment('  ', groupComment),
    ...Object.keys(tokens).flatMap((name) => [
      ...(notes[name] === undefined ? [] : [comment('  ', notes[name])]),
      `  --${name}: ${resolve(name, LIGHT)}; /* ui: ${libraryNames(name)} */`,
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

// The identity inputs only, to load after tokens.css. Its dark blocks already switch
// --project to --project-dark, so a theme needs no dark rule.
export const renderStandaloneTheme = (data) => {
  const resolve = standaloneResolver(data)
  const identity = data.groups.filter(({ identity: isIdentity }) => isIdentity).flatMap(({ tokens }) => Object.keys(tokens))
  return [
    `/* Generated from tokens/${THEME}.json by scripts/build-tokens.mjs in @filipgutica/design-system. Do not edit.`,
    ` * The ${THEME} identity inputs for tokens.css. Load after tokens.css. */`,
    '',
    ':root {',
    ...block('  ', identity.map((name) => [`--${name}`, resolve(name, LIGHT)])),
    '}',
    '',
  ].join('\n')
}

// Standalone token values with every reference substituted, as getComputedStyle reports them.
export const resolvedTokens = (data) => {
  const tokens = flatTokens(data)
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => resolve(target, mode))
  const names = standaloneNames(data)
  const values = (mode) => Object.fromEntries(names.map((name) => [name, resolve(name, mode)]))
  return { themes: { [THEME]: { light: values(LIGHT), dark: values(DARK) } } }
}

const generatedNote = `Generated from tokens/${THEME}.json by scripts/build-tokens.mjs. Do not edit.`
const cssVarDoc = "/** The var() reference for a token, such as cssVar('text') for 'var(--text)'. */"

export const renderTokensJs = (data) => [
  `// ${generatedNote}`,
  `export const tokens = ${JSON.stringify(resolvedTokens(data), null, 2)}`,
  '',
  cssVarDoc,
  'export const cssVar = (name) => `var(--${name})`',
  '',
].join('\n')

export const renderTokensDts = (data) => [
  `// ${generatedNote}`,
  '/** A token name: its CSS variable in tokens.css without the leading dashes. */',
  `export type TokenName =\n${standaloneNames(data).map((name) => `  | '${name}'`).join('\n')}`,
  '',
  `export type ThemeName = '${THEME}'`,
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

export const outputs = (data) => [
  ['language/tokens.css', renderStandaloneTokens(data)],
  [`dist/themes/${THEME}.css`, renderStandaloneTheme(data)],
  ['dist/class/base.css', renderClassBase(data)],
  [`dist/class/themes/${THEME}.css`, renderLibraryTheme(data)],
  ['dist/tokens.json', `${JSON.stringify(resolvedTokens(data), null, 2)}\n`],
  ['dist/tokens.js', renderTokensJs(data)],
  ['dist/tokens.d.ts', renderTokensDts(data)],
]

const run = () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const check = process.argv.slice(2).includes('--check')
  const data = JSON.parse(readFileSync(`${root}tokens/${THEME}.json`, 'utf8'))

  const stale = []
  for (const [path, content] of outputs(data)) {
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
