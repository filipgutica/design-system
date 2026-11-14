// Theme files are W3C Design Tokens files (2025.10); parseTheme turns one into the build's inputs.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { THEME_EXTENSION, parseTheme } from '../scripts/build-tokens.mjs'

const read = (id) => JSON.parse(readFileSync(new URL(`../tokens/themes/${id}.tokens.json`, import.meta.url), 'utf8'))
const colour = (hex) => ({ colorSpace: 'srgb', components: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), hex })
const hueOnly = () => ({
  $description: 'A test theme.',
  $extensions: { [THEME_EXTENSION]: { name: 'Test' } },
  light: { $type: 'color', 'color-project': { $value: colour('#2b59d6') } },
  dark: { $type: 'color', 'color-project': { $value: colour('#8aa8ff') } },
})

test('a theme file gives its name, note, hue, font stacks, and neutrals', () => {
  assert.deepEqual(parseTheme(hueOnly()), { problems: [], inputs: { name: 'Test', note: 'A test theme.', hue: { light: '#2b59d6', dark: '#8aa8ff' } } })
  const { problems, inputs } = parseTheme(read('github'))
  assert.deepEqual(problems, [])
  // fontFamily lists become CSS stacks: names with spaces are quoted, and generic families and keywords are not.
  assert.equal(inputs.fonts.ui, '"Mona Sans VF", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Backtick Fix", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"')
  assert.equal(inputs.fonts.mono, 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace')
  assert.equal(inputs.neutrals.dark['color-bg'], '#0d1117')
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
  assert.deepEqual(problemsWith((file) => { delete file.dark['color-project'] }), ['no dark.color-project'])
  assert.deepEqual(problemsWith((file) => { delete file.light.$type }), ['light.color-project is not a color token'])
  assert.deepEqual(problemsWith((file) => { file.accent = {} }), ['accent is not a theme input'])
  assert.deepEqual(problemsWith((file) => { file.light['color-link'] = { $value: colour('#000000') } }), ['light.color-link is not a theme input'])
  assert.deepEqual(problemsWith((file) => { delete file.$extensions }), [`no $extensions["${THEME_EXTENSION}"].name`])
  assert.deepEqual(problemsWith((file) => { file['font-ui'] = { $type: 'fontFamily', $value: [] } }), ['font-ui is not a font name or a list of them'])
  // Neutrals are a whole set in both modes.
  const partial = problemsWith((file) => { file.light['color-bg'] = { $value: colour('#ffffff') } })
  assert.equal(partial.length, 17)
  assert.ok(partial.includes('no dark.color-bg: neutrals are a whole set in both modes'))
})
