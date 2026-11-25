// Emits every token file from tokens/core.json and the theme files in tokens/themes/, the only places
// token values live. A theme file is a W3C Design Tokens file holding only its inputs: its name, a note
// for the Themes page, its hue pair, and optionally its two font stacks, its base radius, its neutrals
// (NEUTRALS, for light and dark), and its text on the hue; parseTheme in theme-mapper/theme-file.js reads it. Every other token is core. The text on the selected fills is the first candidate in TEXT_CANDIDATES that reaches
// 4.5:1 in each mode, as their roles in core.json say.
//
//   node scripts/build-tokens.mjs           write every output
//   node scripts/build-tokens.mjs --check   fail when an output is stale
//
// The CSS has one variable per token. language/tokens.css carries the default theme; each
// dist/themes/<id>.css sets what one theme changes from it, to load after it. Dark mode follows
// prefers-color-scheme unless data-theme="light"; data-theme="dark" forces it. data-theme on an element
// below <html>, or a .dark class, themes that subtree.
// dist/tokens.json and dist/tokens.js carry the values of every theme, resolved, for code, and
// dist/themes/<id>.tokens.json is each theme file as written, for design-token tools, and
// dist/theme-inputs.json lists the tokens a theme may set.
// theme-mapper/core.js carries the core tokens for the theme engine, and theme-mapper/*.d.ts its types,
// generated from the JSDoc in theme-mapper/*.js, which the same step typechecks.
// open-vsx/*.d.ts is generated and checked separately, with the web APIs its client needs.
//
// Each group also carries reader-facing text for the site's Foundations page, which no output
// above includes: an id, a title, a note, and roles (what each token is for, one entry per token,
// with `backticks` for code).
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DARK, LIGHT, applyTheme, resolveData, themeInputNames } from '../theme-mapper/engine.js'
import { block, darkOverrides, renderThemeCss, standaloneNames, standaloneResolver, subtreeBlocks, subtreeNames } from '../theme-mapper/css.js'
import { parseTheme } from '../theme-mapper/theme-file.js'

export const DEFAULT_THEME = 'graphite-indigo'
export const THEME_FILE = '.tokens.json'
const SOURCE = `tokens/core.json and tokens/themes/${DEFAULT_THEME}${THEME_FILE}`

// The token source: tokens/core.json and every theme in tokens/themes/, the default first, then by name.
// Each theme carries its source data with its inputs applied, and its file's text to ship. A theme file
// with a problem stops the build.
export const readTokens = (root) => {
  const core = JSON.parse(readFileSync(`${root}tokens/core.json`, 'utf8'))
  const themes = readdirSync(`${root}tokens/themes`).filter((file) => file.endsWith(THEME_FILE))
    .map((file) => {
      const source = readFileSync(`${root}tokens/themes/${file}`, 'utf8')
      const { problems, inputs } = parseTheme(JSON.parse(source))
      return { id: file.slice(0, -THEME_FILE.length), problems, ...inputs, source }
    })
    .toSorted((a, b) => Number(b.id === DEFAULT_THEME) - Number(a.id === DEFAULT_THEME) || String(a.name).localeCompare(b.name))
  if (themes[0]?.id !== DEFAULT_THEME) throw new Error(`tokens/themes/${DEFAULT_THEME}${THEME_FILE} is missing`)
  const problems = themes.flatMap(({ id, problems: found }) => found.map((problem) => `tokens/themes/${id}${THEME_FILE}: ${problem}`))
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

// A comment whose later lines line up under the first line's text, as tokens.css writes them.
const comment = (indent, text) => `${indent}/* ${text.split('\n').join(`\n${indent}   `)} */`

const standaloneHeader = `/*
 * Design language tokens. Generated from ${SOURCE}
 * by scripts/build-tokens.mjs in @filipgutica/design-system: edit the JSON and run
 * \`pnpm tokens:build\`. Do not edit this file.
 * DESIGN.md names these tokens; it never repeats their values.
 *
 * Two layers. The identity block at the top of :root is the theme's own: its hue
 * pair, fonts, and base radius. This file carries the default theme. Another theme keeps this file
 * unchanged and loads its themes/<id>.css after it, on :root; that file may also set
 * the theme's neutrals. A new project can set the identity lines on :root in its own
 * stylesheet the same way. The dark blocks switch --color-accent to
 * --color-project-dark, so the hue pair needs no dark rule: one :root rule works after this file,
 * in its cascade layer or in a later one. Check --color-accent-text,
 * --color-nav-current-text, and --color-segmented-current-text at 4.5:1 on the new hue
 * and override them when they fall short. A theme file sets the last two for you; its
 * hue must carry --color-accent-text itself, which the contrast tests check.
 * The terminal plate tokens draw the identity layer's captures but stay core: a theme
 * does not set them. dist/theme-inputs.json lists every token a theme may set.
 *
 * Standalone HTML: import or inline this file.
 * Inline visuals: inherit the host font and theme variables; see DESIGN.md.
 * Repos: map these names onto the repository's own token system.
 *
 * Theme states: bare :root is light. prefers-color-scheme picks dark unless
 * data-theme="light" is set. data-theme="dark" forces dark. data-theme="dark" or
 * "light" on any element below <html>, or a .dark class on <html> or below it,
 * themes that subtree; the subtree blocks at the end redeclare what each mode
 * changes, and the subtree takes its mode's text colour. data-theme="light" wins over
 * .dark on one element. A theme written by hand that sets neutrals or text on the hue repeats
 * those light values on :root [data-theme="light"] and the dark ones on the dark subtree block's
 * selectors, so they hold in a subtree too; the hue pair needs no repeat. A theme file does this for you.
 */
`

const standaloneBase = `/* Touch: at tablet width, controls of every size grow to --control-touch (components.md, Rules for every
   control), so a component sized from --control-sm, --control-md, or --control-lg needs no touch rule of its own.
   A size specimen that must keep its size sets the three back on itself. */
@media (max-width: 800px) {
  :root { --control-sm: var(--control-touch); --control-md: var(--control-touch); --control-lg: var(--control-touch); }
}

/* Minimal base. Component styles live in components.html. The base sits in a layer, so any
   page or component rule outranks it whatever its specificity. A layered !important outranks an
   unlayered one, so reduced-motion exceptions belong here too. */
/* The page's own background and text colour stay outside the layer. A host that wraps the page in
   its own unlayered reset, such as an artifact viewer, would otherwise keep its body colours while
   the tokens switch to dark, leaving token-coloured text on the wrong background. */
body { background: var(--color-bg); color: var(--color-text); }
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }
  /* A subtree theme takes its mode's text colour, as the body does; the page paints its background. */
  :where(:root.dark, :root [data-theme="dark"], :root [data-theme="light"], :root .dark) { color: var(--color-text); }
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
  /* Enabled controls, and a label that wraps or follows an enabled choice, show the pointer. :where() keeps it
     weightless, so a component's cursor, such as a busy button's wait, wins. Disabled controls keep the
     not-allowed cursor their component sets (components.md, Disabled). An editable combobox keeps the text cursor. */
  :where(button, select, summary, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"]:read-only:not(input, textarea), input:is([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="color"])):where(:not(:disabled, [aria-disabled="true"], [data-disabled])),
  :where(label:has(:is(input:is([type="checkbox"], [type="radio"]), [role="switch"], [role="checkbox"], [role="radio"]):not(:disabled, [aria-disabled="true"], [data-disabled]))),
  :where(:is(input:is([type="checkbox"], [type="radio"]), [role="switch"], [role="checkbox"], [role="radio"]):not(:disabled, [aria-disabled="true"], [data-disabled]) + label) { cursor: pointer; }
  /* The file input's chooser button is its own box, so it takes the input's cursor. */
  :where(input[type="file"]:not(:disabled, [aria-disabled="true"], [data-disabled]))::file-selector-button { cursor: inherit; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; scroll-behavior: auto !important; }
    /* A busy spinner slows instead of stopping, so the busy state stays visible. */
    [aria-busy="true"]::before { animation-duration: 1.4s !important; }
  }
}
`

export const renderStandaloneTokens = (data) => {
  const resolve = standaloneResolver(data)
  const dark = darkOverrides(standaloneNames(data), resolve).map(([name, value]) => [`--${name}`, value])
  const subtree = subtreeNames(data)
  const subtreeIn = (mode) => subtree.map((name) => [`--${name}`, resolve(name, mode)])

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
    comment('', 'Subtree themes: data-theme="dark" or "light" on an element below <html>, or a .dark class on <html> or\nbelow it, themes that subtree. Each block redeclares every token that differs between the modes or follows\none that does, so the tokens derived from them resolve again inside the subtree. The element paints its own\nbackground, such as background: var(--color-bg).'),
    ...subtreeBlocks({ dark: subtreeIn(DARK), light: subtreeIn(LIGHT) }, { scheme: true }),
    '',
    standaloneBase,
  ].join('\n')
}

// The names a theme may set, for a component library's test that it sets no core token. Generated, so it follows
// the engine.
export const renderThemeInputs = ({ data }) => {
  const groups = themeInputNames(data)
  return `${JSON.stringify({
    $description: 'The tokens a theme may set, without their leading dashes, by kind. Every other token in tokens.css is core: a theme or a component library never overrides it. Generated from tokens/core.json by scripts/build-tokens.mjs. Do not edit.',
    names: Object.values(groups).flat(),
    groups,
  }, null, 2)}\n`
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

// The core tokens for the theme engine, without the site's reader-facing text.
// The default theme's inputs, which tokens.css carries, for the theme builder.
const themeInputs = ({ hue, fonts, radius, neutrals, textOnHue }) => ({ hue, fonts, radius, neutrals, textOnHue })

export const renderCoreJs = (core, defaultTheme) => [
  '// Generated from tokens/core.json and the default theme by scripts/build-tokens.mjs. Do not edit.',
  "/** The core tokens: every theme's base. @type {import('./engine.js').TokenSource} */",
  `export const core = ${JSON.stringify({ groups: core.groups.map(({ identity, tokens }) => ({ ...(identity && { identity }), tokens })) }, null, 2)}`,
  '',
  "/** The default theme's inputs, which tokens.css carries. @type {import('./engine.js').ThemeInputs} */",
  `export const defaultTheme = ${JSON.stringify(themeInputs(defaultTheme), null, 2)}`,
  '',
].join('\n')

// The theme mapper's .d.ts files, from the JSDoc in theme-mapper/*.js, and its typecheck: any diagnostic
// stops the build. tsc reads a .d.ts beside a .js in place of the .js, so the tracked declarations would
// type the sources as the last build left them. It compiles a copy of the sources, with this build's
// core.js, in a temporary folder instead. The lib is ES2022 alone, so the mapper cannot use a DOM or
// Node API and runs in both. Open VSX compiles separately with DOM types for fetch and Web Crypto.
// A temporary folder under node_modules lets its third-party imports resolve without reading stale declarations.
const renderDeclarations = async ({ root, directory, coreJs, lib }) => {
  const { default: ts } = await import('typescript')
  const dir = mkdtempSync(join(root, 'node_modules', `${directory}-`))
  try {
    const sources = readdirSync(`${root}${directory}`).filter((file) => file.endsWith('.js') && file !== 'core.js')
    for (const file of sources) copyFileSync(`${root}${directory}/${file}`, join(dir, file))
    if (coreJs !== undefined) {
      writeFileSync(join(dir, 'core.js'), coreJs)
      sources.push('core.js')
    }
    const program = ts.createProgram(sources.map((file) => join(dir, file)), {
      allowJs: true, checkJs: true, declaration: true, emitDeclarationOnly: true, strict: true, types: [],
      target: ts.ScriptTarget.ES2022, lib, module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler, outDir: join(dir, 'out'),
    })
    const files = []
    const { diagnostics } = program.emit(undefined, (file, text) => files.push([`${directory}/${basename(file)}`, text]))
    const problems = [...ts.getPreEmitDiagnostics(program), ...diagnostics]
    if (problems.length > 0) {
      throw new Error(ts.formatDiagnostics(problems, { getCanonicalFileName: (file) => file, getCurrentDirectory: () => dir, getNewLine: () => '\n' }))
    }
    return files.toSorted(([a], [b]) => a.localeCompare(b))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export const outputs = (themes) => {
  const [defaultTheme] = themes
  return [
    ['language/tokens.css', renderStandaloneTokens(defaultTheme.data)],
    ...themes.flatMap((theme) => [
      [`dist/themes/${theme.id}.css`, renderThemeCss({ name: theme.name, data: theme.data, source: `tokens/themes/${theme.id}${THEME_FILE}` }, defaultTheme.data)],
      [`dist/themes/${theme.id}${THEME_FILE}`, theme.source],
    ]),
    ['dist/tokens.json', `${JSON.stringify(resolvedTokens(themes), null, 2)}\n`],
    ['dist/tokens.js', renderTokensJs(themes)],
    ['dist/tokens.d.ts', renderTokensDts(defaultTheme, themes)],
    ['dist/theme-inputs.json', renderThemeInputs(defaultTheme)],
  ]
}

const run = async () => {
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
  const coreJs = renderCoreJs(core, themes[0])
  const files = [
    ...outputs(themes),
    ['theme-mapper/core.js', coreJs],
    ...await renderDeclarations({ root, directory: 'theme-mapper', coreJs, lib: ['lib.es2022.d.ts'] }),
    ...await renderDeclarations({ root, directory: 'open-vsx', lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'] }),
  ]
  // A theme that was renamed or removed leaves its generated files behind; they are stale too.
  // Only theme outputs are candidates: the licences and notices beside them stay. A missing folder has none.
  const leftover = (existsSync(`${root}dist/themes`) ? readdirSync(`${root}dist/themes`) : []).map((file) => `dist/themes/${file}`)
    .filter((path) => (path.endsWith('.css') || path.endsWith(THEME_FILE)) && !files.some(([output]) => output === path))
  for (const path of leftover) {
    if (check) stale.push(path)
    else rmSync(`${root}${path}`)
  }
  for (const [path, content] of files) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run()
