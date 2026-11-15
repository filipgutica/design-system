// The theme mapper: which VS Code keys each input selects, what it reports, and the variables it sets.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ThemeValidationError, mapVsCodeTheme, themeVariables } from '@filipgutica/design-system/theme-mapper'
import { NEUTRALS, SYNTAX_ROLES } from '../theme-mapper/engine.js'

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const fixture = (name) => json(`fixtures/vscode-themes/${name}.json`)
const graphiteIndigo = (mode) => json(`../language/editor-themes/graphite-indigo/themes/graphite-indigo-${mode}-color-theme.json`)
const neutrals = (values) => Object.fromEntries(NEUTRALS.map((name, i) => [name, values[i]]))
const failing = ({ problems }) => problems.map(({ kind, check }) => `${kind} ${check}`)

test('Graphite Indigo Dark maps its own colours, with no problems', () => {
  const mapped = mapVsCodeTheme(graphiteIndigo('dark'))
  assert.equal(mapped.appearance, 'dark')
  assert.equal(mapped.highContrast, false)
  // The border keys are hairlines under 3:1, so the control edge falls through to the line numbers.
  assert.deepEqual(mapped.neutrals, neutrals(['#151619', '#191a1d', '#212226', '#38334f', '#25272d', '#3b3e45', '#b0b5bf', '#f4f5f8', '#b0b5bf']))
  assert.equal(mapped.hue, '#a99ce2')
  assert.equal(mapped.hueOnDark, mapped.hue)
  assert.deepEqual(mapped.problems, [])
})

test('Graphite Indigo Light maps its own colours, and takes the button text for the terminal capture accent', () => {
  const mapped = mapVsCodeTheme(graphiteIndigo('light'))
  assert.equal(mapped.appearance, 'light')
  assert.deepEqual(mapped.neutrals, neutrals(['#f8f9fb', '#e7e8ec', '#ffffff', '#ffffff', '#dfe1e7', '#d8dbe2', '#5d626c', '#222326', '#5d626c']))
  assert.equal(mapped.hue, '#6359a7')
  // Every hue key is too dark for the terminal capture, so the next candidate is the button's text.
  assert.equal(mapped.hueOnDark, '#ffffff')
  // Its syntax colours are VS Code's Light+, four of them a step darker so they read on the surface a code well takes.
  assert.equal(mapped.syntax.keyword, '#0000ff')
  assert.deepEqual(mapped.problems, [])
})

test('a theme without the optional keys falls back along each row', () => {
  const mapped = mapVsCodeTheme(fixture('missing-optional'))
  const [bg, text] = ['#1b1d23', '#d8dee9']
  assert.deepEqual(mapped.neutrals, neutrals([bg, bg, bg, bg, bg, text, text, text, text]))
  assert.equal(mapped.hue, '#88c0d0')
})

test('short hex expands, an opaque alpha drops, other alpha composites over the page, and a malformed value is missing', () => {
  const mapped = mapVsCodeTheme(fixture('alpha-short-hex'))
  assert.equal(mapped.neutrals['color-bg'], '#222222')
  assert.equal(mapped.neutrals['color-text'], '#eeeeee')
  assert.equal(mapped.neutrals['color-surface'], '#303030')
  // A fully transparent widget background composites to the page itself.
  assert.equal(mapped.neutrals['color-surface-raised'], '#222222')
  // list.hoverBackground is malformed, so the row hover takes the muted surface.
  assert.equal(mapped.neutrals['color-row-hover'], mapped.neutrals['color-surface-muted'])
  assert.equal(mapped.hue, '#77aaff')
})

test('a non-opaque background composites over white in a light theme', () => {
  assert.equal(mapVsCodeTheme(fixture('non-opaque-background')).neutrals['color-bg'], '#8f9faf')
})

test('without a type, the background over white decides the mode, then composites over that mode\'s base', () => {
  const mapped = mapVsCodeTheme(fixture('no-type'))
  assert.equal(mapped.appearance, 'dark')
  assert.equal(mapped.neutrals['color-bg'], '#000000')
})

test('a high-contrast theme maps to its mode and says so', () => {
  const mapped = mapVsCodeTheme(fixture('high-contrast'))
  assert.equal(mapped.appearance, 'dark')
  assert.equal(mapped.highContrast, true)
  assert.equal(mapped.neutrals['color-border'], '#6fc3df')
  assert.equal(mapped.hue, '#f38518')
  assert.equal(mapVsCodeTheme({ ...fixture('high-contrast'), type: 'hcLight', colors: { 'editor.background': '#ffffff', 'editor.foreground': '#000000' } }).appearance, 'light')
})

test('a theme that fails after selection keeps its colours and lists each failure, its own and core\'s', () => {
  const theme = fixture('fails-after-selection')
  const mapped = mapVsCodeTheme(theme)
  // No hue key passes, so the first present one stays, unchanged.
  assert.equal(mapped.hue, theme.colors['button.background'])
  assert.deepEqual(failing(mapped), ['theme focus', 'theme nav', 'theme primary', 'theme terminal', 'core status'])
  for (const problem of mapped.problems) {
    assert.equal(problem.mode, 'dark')
    assert.ok(!(problem.ratio >= problem.min))
    assert.ok(problem.pairs.length > 0 && problem.pairs.every(({ ratio }) => !(ratio >= problem.min)))
  }
})

test('a theme without a usable background or text throws ThemeValidationError', () => {
  assert.throws(() => mapVsCodeTheme(fixture('no-background')), ThemeValidationError)
  const colors = { 'editor.background': '#1e1e1e', 'editor.foreground': '#555555' }
  assert.throws(() => mapVsCodeTheme({ type: 'dark', colors: { ...colors, 'editor.background': 'rgb(0 0 0)' } }), ThemeValidationError)
  // A text colour under 4.5:1 is not usable, and nothing else is.
  assert.throws(() => mapVsCodeTheme({ type: 'dark', colors }), /4\.5:1/)
  assert.equal(mapVsCodeTheme({ type: 'dark', colors: { ...colors, foreground: '#dddddd' } }).neutrals['color-text'], '#dddddd')
})

test('themeVariables sets the hue pair, the neutrals, and the selected-fill text, as the engine resolves them', () => {
  const mapped = mapVsCodeTheme(graphiteIndigo('light'))
  const variables = themeVariables(mapped)
  assert.deepEqual(Object.keys(variables), [
    '--color-project', '--color-project-dark', ...NEUTRALS.map((name) => `--${name}`), '--color-nav-current-text', '--color-segmented-current-text',
    ...SYNTAX_ROLES.map((role) => `--color-syntax-${role}`),
  ])
  assert.equal(variables['--color-project'], '#6359a7')
  assert.equal(variables['--color-project-dark'], '#ffffff')
  assert.equal(variables['--color-bg'], '#f8f9fb')
  // The selected-fill text resolves: the accent reaches 4.5:1 on its own tinted fill here.
  assert.equal(variables['--color-nav-current-text'], '#6359a7')
})

test('themeVariables refuses a value that is not #rrggbb, so persisted input cannot inject CSS', () => {
  const mapped = mapVsCodeTheme(graphiteIndigo('dark'))
  for (const bad of [
    null,
    { ...mapped, hue: 'red' },
    { ...mapped, hueOnDark: '#fff' },
    { ...mapped, neutrals: { ...mapped.neutrals, 'color-bg': '#000000; background: url(x)' } },
    { ...mapped, neutrals: { ...mapped.neutrals, 'color-muted': undefined } },
    { ...mapped, appearance: 'dim' },
    { ...mapped, syntax: { comment: 'red' } },
    { ...mapped, syntax: { heading: '#000000' } },
    { ...mapped, syntax: null },
  ]) assert.throws(() => themeVariables(bad), ThemeValidationError)
})

// A dark theme with Dracula's palette: its comment colour reaches about 3:1 on its own background.
const DRACULA_LIKE = {
  type: 'dark',
  colors: { 'editor.background': '#282a36', 'editor.foreground': '#f8f8f2', 'sideBar.background': '#282a36', 'button.background': '#bd93f9' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6272a4' } },
    { scope: 'string', settings: { foreground: '#f1fa8c' } },
    { scope: 'keyword, storage.type', settings: { foreground: '#ff79c6' } },
    { scope: 'entity.name.function', settings: { foreground: '#50fa7b' } },
  ],
}

test('an imported theme keeps its own syntax colours, and a failing one is the theme\'s problem', () => {
  const mapped = mapVsCodeTheme(DRACULA_LIKE)
  assert.deepEqual(mapped.syntax, { comment: '#6272a4', punctuation: '#6272a4', string: '#f1fa8c', keyword: '#ff79c6', function: '#50fa7b' })
  const syntax = mapped.problems.filter(({ check }) => check === 'syntax')
  assert.deepEqual(syntax.map(({ kind, pairs }) => [kind, pairs.map(({ ink }) => ink)]), [
    ['theme', ['{color-syntax-comment}', '{color-syntax-punctuation}']],
  ])
  // The variables set the theme's roles, and the core colour for each role it leaves out, so applying another
  // theme replaces every one of them.
  const variables = themeVariables(mapped)
  assert.equal(variables['--color-syntax-comment'], '#6272a4')
  assert.equal(variables['--color-syntax-number'], '#d5b98c')
  // Tag follows keyword, which the theme sets.
  assert.equal(variables['--color-syntax-tag'], '#ff79c6')
  const plain = themeVariables(mapVsCodeTheme({ ...DRACULA_LIKE, tokenColors: undefined }))
  assert.deepEqual(Object.keys(plain), Object.keys(variables))
  assert.equal(plain['--color-syntax-comment'], '#a0a6b1')
})

test('a role the theme leaves out stays core, so a core syntax colour that fails is core\'s problem', () => {
  // A mid-grey code well that the core light comment colour cannot read on.
  const mapped = mapVsCodeTheme({ type: 'light', colors: { 'editor.background': '#ffffff', 'editor.foreground': '#000000', 'sideBar.background': '#9a9a9a' } })
  assert.deepEqual(mapped.syntax, {})
  const syntax = mapped.problems.filter(({ check }) => check === 'syntax')
  // Every core role fails on the grey well. Variable, operator, and punctuation follow the theme's text, which reads.
  assert.deepEqual(syntax.map(({ kind, pairs }) => [kind, pairs.map(({ ink }) => ink)]), [
    ['core', ['keyword', 'string', 'number', 'comment', 'function', 'type', 'tag', 'attribute'].map((role) => `{color-syntax-${role}}`)],
  ])
})

test('each role takes the rule nearest its scope family, a later rule winning a tie', () => {
  const syntaxOf = (tokenColors) => mapVsCodeTheme({ type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#ffffff' }, tokenColors }).syntax
  assert.deepEqual(syntaxOf([
    { scope: 'keyword', settings: { foreground: '#111111' } },
    // Deeper than keyword, so it does not replace it, even later.
    { scope: 'keyword.control.anchor.regexp', settings: { foreground: '#222222' } },
    // An operator is its own role, not a keyword.
    { scope: 'keyword.operator', settings: { foreground: '#333333' } },
    // A selector with context counts as its last scope.
    { scope: 'meta.embedded string', settings: { foreground: '#444444' } },
    { scope: 'string', settings: { foreground: '#555555' } },
    // Not readable rules are skipped, and one that cannot be read does not displace one that can.
    { scope: 'comment', settings: {} },
    { scope: 'variable', settings: { foreground: '#777777' } },
    { scope: 'variable', settings: { foreground: 'not-a-colour' } },
    { scope: 'variable', settings: { foreground: null } },
    { settings: { foreground: '#666666' } },
    null,
  ]), { keyword: '#111111', operator: '#333333', string: '#555555', variable: '#777777' })
  assert.deepEqual(syntaxOf('not rules'), {})
})

test('muted text must also read on the muted surface, where neutral badges sit', () => {
  // As in Monokai: the description colour reads on the page but not on the muted surface, so the line numbers take it.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: {
    'editor.background': '#272822', 'editor.foreground': '#f8f8f2', 'list.inactiveSelectionBackground': '#414339',
    descriptionForeground: '#90908a', 'editorLineNumber.foreground': '#c2c2bf',
  } })
  assert.equal(mapped.neutrals['color-muted'], '#c2c2bf')
  assert.ok(!failing(mapped).includes('theme text'))
})

test('a status badge that a theme surface leaves under 4.5:1 is a core problem', () => {
  // As in VS Code's Dark Modern: the danger badge's text, mixed into the theme's #cccccc, reads at about 4.4:1 on its tint.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: { 'editor.background': '#1f1f1f', 'editor.foreground': '#cccccc', 'editorWidget.background': '#202020' } })
  assert.deepEqual(failing(mapped), ['core status'])
})

test('a theme whose editor text is under 4.5:1 takes its input text instead', () => {
  // As in Solarized Light: #657b83 on #fdf6e3 is about 4.1:1, and its input text #586e75 reaches 5:1.
  const mapped = mapVsCodeTheme({ type: 'light', colors: { 'editor.background': '#fdf6e3', 'editor.foreground': '#657b83', 'input.foreground': '#586e75' } })
  assert.equal(mapped.neutrals['color-text'], '#586e75')
  // It still reads at about 4.2:1 on the core status alerts, so that is reported.
  assert.deepEqual(failing(mapped), ['theme text'])
  assert.deepEqual(mapped.problems[0].pairs.map(({ fill }) => fill).filter((fill) => fill.endsWith('-surface}')), ['{color-success-surface}', '{color-warning-surface}', '{color-error-surface}', '{color-info-surface}'])
})

test('soft text that reads on the page but not on a secondary button or a status alert is a theme problem', () => {
  // The one text candidate reads on the page, so it stays, and each fill it fails on is reported.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#777777', 'button.background': '#a99ce2' } })
  assert.equal(mapped.neutrals['color-text'], '#777777')
  const text = mapped.problems.find(({ check }) => check === 'text')
  assert.equal(text.kind, 'theme')
  const fills = text.pairs.filter(({ ink }) => ink === '{color-text}').map(({ fill }) => fill)
  for (const fill of ['{color-control-thumb}', '{color-success-surface}', '{color-warning-surface}', '{color-error-surface}', '{color-info-surface}']) assert.ok(fills.includes(fill), fill)
})

test('the text takes the first candidate that reads on every fill, not only on the page', () => {
  // #777777 reads on black, but not on the status alerts; #dddddd reads on all of them.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#777777', foreground: '#dddddd' } })
  assert.equal(mapped.neutrals['color-text'], '#dddddd')
  assert.deepEqual(mapped.problems, [])
})

test('muted text must read on a hovered row too, or the text stands in', () => {
  // The description colour reads on black at 4.7:1 but on the hover fill at 2.2:1, where a pager's direction sits.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#ffffff', descriptionForeground: '#777777', 'list.hoverBackground': '#444444' } })
  assert.equal(mapped.neutrals['color-row-hover'], '#444444')
  assert.equal(mapped.neutrals['color-muted'], '#ffffff')
  assert.deepEqual(mapped.problems, [])
})

test('a focus ring drawn inside a hovered row must reach 3:1 on the row fill', () => {
  // The hue reads on the black page, but the row and option rings sit inside the hover fill at about 1.85:1.
  const mapped = mapVsCodeTheme({ type: 'dark', colors: {
    'editor.background': '#000000', 'editor.foreground': '#ffffff', 'button.background': '#a99ce2', 'list.hoverBackground': '#767676',
  } })
  assert.deepEqual(failing(mapped), ['theme focus'])
})

test('a role that follows a role the theme sets fails as the theme\'s', () => {
  // The theme sets only a dim keyword; function and tag follow it.
  const mapped = mapVsCodeTheme({
    type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#ffffff' },
    tokenColors: [{ scope: 'keyword', settings: { foreground: '#333333' } }],
  })
  const syntax = mapped.problems.filter(({ check }) => check === 'syntax')
  assert.deepEqual(syntax.map(({ kind, pairs }) => [kind, pairs.map(({ ink }) => ink)]), [
    ['theme', ['{color-syntax-keyword}', '{color-syntax-function}', '{color-syntax-tag}']],
  ])
})
