// Theme files are W3C Design Tokens files (2025.10); parseTheme turns one into the build's inputs.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { THEME_EXTENSION, parseTheme } from '@filipgutica/design-system/theme-builder'

const read = (id) => JSON.parse(readFileSync(new URL(`../tokens/themes/${id}.tokens.json`, import.meta.url), 'utf8'))
const colour = (hex) => ({ colorSpace: 'srgb', components: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), hex })
const hueOnly = () => ({
  $description: 'A test theme.',
  $extensions: { [THEME_EXTENSION]: { name: 'Test' } },
  light: { $type: 'color', 'color-project': { $value: colour('#2b59d6') } },
  dark: { $type: 'color', 'color-project': { $value: colour('#8aa8ff') } },
})

test('a theme file gives its name, note, hue, font stacks, base radius, and neutrals', () => {
  assert.deepEqual(parseTheme(hueOnly()), { problems: [], inputs: { name: 'Test', note: 'A test theme.', hue: { light: '#2b59d6', dark: '#8aa8ff' } } })
  const { problems, inputs } = parseTheme(read('github'))
  assert.deepEqual(problems, [])
  // fontFamily lists become CSS stacks: names with spaces are quoted, and generic families and keywords are not.
  assert.equal(inputs.fonts.ui, '"Mona Sans VF", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Backtick Fix", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"')
  assert.equal(inputs.fonts.mono, 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace')
  assert.equal(inputs.neutrals.dark['color-bg'], '#0d1117')
  // Any other name is a quoted CSS string, escaped, including one that starts with a digit.
  const named = hueOnly()
  named['font-ui'] = { $type: 'fontFamily', $value: ['ACME "Display"', 'back\\slash', '123', 'sans-serif'] }
  assert.equal(parseTheme(named).inputs.fonts.ui, '"ACME \\"Display\\"", "back\\\\slash", "123", sans-serif')
  // The base radius is a Design Tokens dimension, written as a CSS length.
  const rounded = hueOnly()
  rounded['radius-base'] = { $type: 'dimension', $value: { value: 0.375, unit: 'rem' } }
  assert.equal(parseTheme(rounded).inputs.radius, '0.375rem')
  // A $type on the file reaches every group and token below it, as in the Design Tokens format.
  const rootTyped = hueOnly()
  rootTyped.$type = 'color'
  for (const mode of ['light', 'dark']) delete rootTyped[mode].$type
  assert.deepEqual(parseTheme(rootTyped).problems, [])
})

test('a theme file the build cannot take stops with its problem', () => {
  const problemsWith = (change) => {
    const file = hueOnly()
    change(file)
    return parseTheme(file).problems
  }
  assert.deepEqual(problemsWith((file) => { file.light['color-project'].$value.colorSpace = 'display-p3' }), ['light.color-project is not an srgb colour'])
  assert.deepEqual(problemsWith((file) => { file.light['color-project'].$value.alpha = 0.5 }), ['light.color-project is not opaque'])
  assert.deepEqual(problemsWith((file) => { file.dark['color-project'].$value.hex = '#000000' }), ['dark.color-project has hex #000000, but its components are #8aa8ff'])
  assert.deepEqual(problemsWith((file) => { file.dark['color-project'].$value.hex = ['#8aa8ff'] }), ['dark.color-project has a hex that is not a string'])
  assert.deepEqual(problemsWith((file) => { file.dark['color-project'].$value.hex = { toString: 1, valueOf: 1 } }), ['dark.color-project has a hex that is not a string'])
  assert.deepEqual(problemsWith((file) => { delete file.dark['color-project'] }), ['no dark.color-project'])
  assert.deepEqual(problemsWith((file) => { delete file.light.$type }), ['light.color-project is not a color token'])
  assert.deepEqual(problemsWith((file) => { file.accent = {} }), ['accent is not a theme input'])
  assert.deepEqual(problemsWith((file) => { file.light['color-link'] = { $value: colour('#000000') } }), ['light.color-link is not a theme input'])
  assert.deepEqual(problemsWith((file) => { delete file.$extensions }), [`no $extensions["${THEME_EXTENSION}"].name`])
  assert.deepEqual(problemsWith((file) => { file['font-ui'] = { $type: 'fontFamily', $value: [] } }), ['font-ui is not a font name or a list of them'])
  assert.deepEqual(problemsWith((file) => { file['font-ui'] = { $type: 'fontFamily', $value: 'Bad\nName' } }), ['font-ui is not a font name or a list of them'])
  assert.deepEqual(problemsWith((file) => { file['radius-base'] = { $type: 'dimension', $value: { value: 8, unit: 'em' } } }), ['radius-base is not a px or rem length of 0 or more'])
  assert.deepEqual(problemsWith((file) => { file['radius-base'] = { $type: 'dimension', $value: { value: -2, unit: 'px' } } }), ['radius-base is not a px or rem length of 0 or more'])
  assert.deepEqual(problemsWith((file) => { file['radius-base'] = { $type: 'number', $value: 8 } }), ['radius-base is not a dimension token'])
  assert.deepEqual(problemsWith((file) => { file['radius-base'] = { $type: 'dimension', $value: { value: 1, unit: 'rem' }, $ref: '#/other' } }), ['radius-base has $ref, which a theme file does not support'])
  // Structure the build does not resolve is a problem, not silently skipped.
  assert.deepEqual(problemsWith((file) => { file.light.$value = colour('#000000') }), ['light.$value is not supported in a theme file'])
  assert.deepEqual(problemsWith((file) => { file.light.$extends = '{dark}' }), ['light.$extends is not supported in a theme file'])
  assert.deepEqual(problemsWith((file) => { file.light['color-project'].$ref = '#/dark/color-project' }), ['light.color-project has $ref, which a theme file does not support'])
  assert.deepEqual(problemsWith((file) => { file.light['color-project'].$type = null }), ['light.color-project is not a color token'])
  assert.deepEqual(problemsWith((file) => { file.light['color-project'] = null }), ['light.color-project is not a token'])
  assert.deepEqual(problemsWith((file) => { file.light = 'blue' }), ['light is not a group', 'no light.color-project'])
  assert.deepEqual(parseTheme([]).problems, ['is not a JSON object'])
  // Inputs come only with no problem, so a caller that has them has a whole theme.
  assert.deepEqual(parseTheme({}), { problems: ['no $extensions["io.github.filipgutica.design-system"].name', 'no $description', 'no light.color-project', 'no dark.color-project'] })
  // Neutrals are a whole set in both modes.
  const partial = problemsWith((file) => { file.light['color-bg'] = { $value: colour('#ffffff') } })
  assert.equal(partial.length, 17)
  assert.ok(partial.includes('no dark.color-bg: neutrals are a whole set in both modes'))
})

test('a theme radius sets every corner that follows it, and leaves the pill and the circle', async () => {
  const { applyTheme, resolveData } = await import('../theme-mapper/engine.js')
  const { core } = await import('../theme-mapper/core.js')
  const { light } = resolveData(applyTheme(core, { hue: { light: '#2b59d6', dark: '#8aa8ff' }, radius: '6px' }))
  assert.deepEqual(['radius-base', 'radius-inline', 'radius-control', 'radius-field', 'radius-mark', 'radius-panel', 'radius-pill', 'radius-circle'].map((name) => light[name]),
    ['6px', '6px', '6px', '6px', 'calc(6px * 0.5)', 'calc(6px * 1.5)', '999px', '999px'])
})

test('a theme file may set the text on the hue per mode, as srgb colours', () => {
  const light = hueOnly()
  light.light['color-accent-text'] = { $value: colour('#ffffff') }
  light.dark['color-nav-current-text'] = { $value: colour('#000000') }
  assert.deepEqual(parseTheme(light), { problems: [], inputs: {
    name: 'Test', note: 'A test theme.', hue: { light: '#2b59d6', dark: '#8aa8ff' },
    textOnHue: { light: { 'color-accent-text': '#ffffff' }, dark: { 'color-nav-current-text': '#000000' } },
  } })
  const named = hueOnly()
  named.light['color-accent-text'] = { $value: 'white' }
  assert.deepEqual(parseTheme(named).problems, ['light.color-accent-text is not an srgb colour'])
})

// The theme-builder entry is the build's own theme CSS: it writes each shipped theme file byte for byte.
test('the theme-builder entry writes each shipped theme file as the build does', async () => {
  const { themeCss } = await import('@filipgutica/design-system/theme-builder')
  const ids = readdirSync(new URL('../tokens/themes/', import.meta.url)).map((file) => file.replace(/\.tokens\.json$/, ''))
  assert.ok(ids.length >= 8)
  for (const id of ids) {
    const shipped = readFileSync(new URL(`../dist/themes/${id}.css`, import.meta.url), 'utf8')
    assert.equal(themeCss(read(id), { source: `tokens/themes/${id}.tokens.json` }), shipped, id)
  }
})

test('the theme builder sets text on the hue in the modes the file names, and stops on a problem', async () => {
  const { ThemeFileError, themeCss } = await import('@filipgutica/design-system/theme-builder')
  const file = hueOnly()
  file.light['color-accent-text'] = { $value: colour('#ffffff') }
  const css = themeCss(file)
  assert.match(css, /^:root \{\n(?:  .+\n)*  --color-accent-text: #ffffff;\n/m)
  // The dark modes keep the default text on the hue.
  assert.match(css, /^:root\[data-theme="dark"\] \{\n(?:  .+\n)*  --color-accent-text: var\(--color-bg\);\n/m)
  assert.match(css, /^\/\* Generated from a theme file by the theme builder/)
  // A name or source cannot end the comment the CSS starts with.
  file.$extensions[THEME_EXTENSION].name = 'Odd */ :root { --color-bg: red } /*'
  assert.equal(themeCss(file, { source: 'a */ b' }).split('*/').length, 2)
  delete file.dark['color-project']
  assert.throws(() => themeCss(file), (error) => error instanceof ThemeFileError && error.problems.includes('no dark.color-project'))
})
