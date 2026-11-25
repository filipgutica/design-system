// The theme file parser that the token build and the theme builder share. Not a package entry: theme-builder.js
// re-exports it. It needs no core tokens, so the token build can read the theme files before it writes core.js.
//
// A theme file is a W3C Design Tokens file (Format and Color modules 2025.10) that holds only the theme's inputs:
// - $description: a note about the theme, and $extensions["io.github.filipgutica.design-system"].name: its name.
// - A `light` and a `dark` group of color tokens: `color-project`, the hue (required); optionally the whole set of
//   neutrals (NEUTRALS); and optionally the text on the hue's fills (TEXT_ON_HUE_TOKENS) for a hue that cannot carry
//   the default.
// - Optionally `font-ui` and `font-mono` (fontFamily tokens) and `radius-base` (a dimension token in px or rem).
// Colours are opaque sRGB. A token's $type is its own, else its group's, else the file's.
import { NEUTRALS, TEXT_ON_HUE_TOKENS } from './engine.js'

/** @typedef {import('./engine.js').ModePair} ModePair */
/** @typedef {{ [key: string]: unknown }} JsonObject */
/**
 * A theme file's inputs, in the shape the theme engine takes, with its name and note.
 * @typedef {object} ThemeFile
 * @property {string} name
 * @property {string} note
 * @property {ModePair} hue `color-project` in light and in dark.
 * @property {{ ui?: string, mono?: string }} [fonts] The two font stacks, as CSS.
 * @property {string} [radius] `radius-base`, as a CSS length.
 * @property {{ light: Record<string, string>, dark: Record<string, string> }} [neutrals] Every NEUTRALS token, per mode.
 * @property {{ light?: Record<string, string>, dark?: Record<string, string> }} [textOnHue] TEXT_ON_HUE_TOKENS the
 *   file sets, per mode.
 */

/** The $extensions namespace that holds a theme's name. */
export const THEME_EXTENSION = 'io.github.filipgutica.design-system'
/** @type {('light' | 'dark')[]} */
const MODES = ['light', 'dark']
/** @type {[string, 'ui' | 'mono'][]} */
const FONTS = [['font-ui', 'ui'], ['font-mono', 'mono']]
const RADIUS = 'radius-base'
// Properties the build ignores: they describe a token or group and change no value. Any other $ property,
// such as $value on a group, $extends, or $ref, is a problem rather than silently skipped.
const METADATA = ['$description', '$extensions', '$deprecated']

/**
 * @param {unknown} value
 * @returns {value is JsonObject}
 */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A colour token's value as #rrggbb, or the problem with it: the build takes opaque sRGB only, and a hex
 * fallback, when given, must agree with the components.
 * @param {unknown} value
 * @returns {[string] | [undefined, string]}
 */
const srgbHex = (value) => {
  if (!isObject(value) || value.colorSpace !== 'srgb') return [undefined, 'is not an srgb colour']
  const { components, alpha = 1, hex } = value
  if (!Array.isArray(components) || components.length !== 3 || !components.every((c) => typeof c === 'number' && c >= 0 && c <= 1)) {
    return [undefined, 'needs three components from 0 to 1']
  }
  if (alpha !== 1) return [undefined, 'is not opaque']
  const derived = `#${components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
  if (hex !== undefined && typeof hex !== 'string') return [undefined, 'has a hex that is not a string']
  if (hex !== undefined && hex.toLowerCase() !== derived) return [undefined, `has hex ${hex}, but its components are ${derived}`]
  return [derived]
}

/**
 * @param {unknown} value
 * @returns {value is string | string[]}
 */
const isFontFamily = (value) => [value].flat().length > 0
  && [value].flat().every((name) => typeof name === 'string' && name !== '' && !/[\u0000-\u001f]/.test(name))
// A fontFamily value as a CSS font stack. A name that is a CSS identifier stays bare, so generic families
// and keywords such as sans-serif and -apple-system keep their meaning; any other name, such as one with
// a space or one that starts with a digit, is a quoted string with its quotes and backslashes escaped, and its
// braces as code points, which the token engine would otherwise read as a reference. A CSS-wide keyword, or
// `default`, would make the whole list invalid, so it is quoted too.
const CSS_WIDE = ['initial', 'inherit', 'unset', 'revert', 'revert-layer', 'revert-rule', 'default']
/** @param {string | string[]} value */
const fontStack = (value) => [value].flat()
  .map((name) => (/^-?[A-Za-z_][\w-]*$/.test(name) && !CSS_WIDE.includes(name.toLowerCase())
    ? name
    : `"${name.replace(/[\\"]/g, '\\$&').replaceAll('{', '\\7b ').replaceAll('}', '\\7d ')}"`)).join(', ')

/**
 * A dimension value ({ value, unit }) as a CSS length. The base radius takes px or rem, and no negative size.
 * @param {unknown} value
 * @returns {value is { value: number, unit: string }}
 */
const isLength = (value) => isObject(value) && Object.keys(value).length === 2 && (value.unit === 'px' || value.unit === 'rem')
  && typeof value.value === 'number' && Number.isFinite(value.value) && value.value >= 0

/** @param {JsonObject[]} layers */
const typeOf = (...layers) => layers.find((layer) => '$type' in layer)?.$type

/**
 * A theme file's inputs and its problems: no name or note, a key a theme cannot set, a token of the wrong type, a
 * colour the build cannot take, a missing hue, or neutrals that are not the whole set in both modes. `inputs` is
 * there only when there is no problem.
 * @param {unknown} file The theme file's parsed JSON.
 * @returns {{ problems: string[], inputs?: ThemeFile }}
 */
export const parseTheme = (file) => {
  if (!isObject(file)) return { problems: ['is not a JSON object'] }
  /** @type {string[]} */
  const problems = []
  const extension = isObject(file.$extensions) ? file.$extensions[THEME_EXTENSION] : undefined
  const name = isObject(extension) && typeof extension.name === 'string' && extension.name ? extension.name : undefined
  if (name === undefined) problems.push(`no $extensions["${THEME_EXTENSION}"].name`)
  const note = typeof file.$description === 'string' && file.$description ? file.$description : undefined
  if (note === undefined) problems.push('no $description')
  for (const key of Object.keys(file)) {
    if (![...METADATA, '$type', ...MODES, ...FONTS.map(([token]) => token), RADIUS].includes(key)) problems.push(`${key} is not a theme input`)
  }

  const colourInputs = [...NEUTRALS, 'color-project', ...TEXT_ON_HUE_TOKENS]
  /** @type {Record<string, JsonObject>} */
  const groups = {}
  /** @type {Record<string, Record<string, string>>} */
  const colours = {}
  for (const mode of MODES) {
    const raw = file[mode]
    const group = isObject(raw) ? raw : {}
    groups[mode] = group
    /** @type {Record<string, string>} */
    const values = {}
    if (mode in file && !isObject(raw)) problems.push(`${mode} is not a group`)
    for (const [token, entry] of Object.entries(group)) {
      if (token.startsWith('$')) {
        if (![...METADATA, '$type'].includes(token)) problems.push(`${mode}.${token} is not supported in a theme file`)
        continue
      }
      if (!colourInputs.includes(token)) { problems.push(`${mode}.${token} is not a theme input`); continue }
      if (!isObject(entry) || !('$value' in entry)) { problems.push(`${mode}.${token} is not a token`); continue }
      const unsupported = Object.keys(entry).filter((key) => ![...METADATA, '$type', '$value'].includes(key))
      if (unsupported.length > 0) { problems.push(`${mode}.${token} has ${unsupported.join(', ')}, which a theme file does not support`); continue }
      const [hex, problem] = srgbHex(entry.$value)
      if (typeOf(entry, group, file) !== 'color') problems.push(`${mode}.${token} is not a color token`)
      else if (problem) problems.push(`${mode}.${token} ${problem}`)
      else if (hex) values[token] = hex
    }
    if (!('color-project' in group)) problems.push(`no ${mode}.color-project`)
    colours[mode] = values
  }
  const hasNeutrals = MODES.some((mode) => NEUTRALS.some((token) => token in groups[mode]))
  if (hasNeutrals) {
    for (const mode of MODES) for (const token of NEUTRALS) if (!(token in groups[mode])) problems.push(`no ${mode}.${token}: neutrals are a whole set in both modes`)
  }

  /** @type {{ ui?: string, mono?: string }} */
  const fonts = {}
  for (const [token, font] of FONTS) {
    if (!(token in file)) continue
    const entry = file[token]
    const unsupported = isObject(entry) ? Object.keys(entry).filter((key) => ![...METADATA, '$type', '$value'].includes(key)) : []
    if (!isObject(entry) || !('$value' in entry)) problems.push(`${token} is not a token`)
    else if (unsupported.length > 0) problems.push(`${token} has ${unsupported.join(', ')}, which a theme file does not support`)
    else if (typeOf(entry, file) !== 'fontFamily') problems.push(`${token} is not a fontFamily token`)
    else if (!isFontFamily(entry.$value)) problems.push(`${token} is not a font name or a list of them`)
    else fonts[font] = fontStack(entry.$value)
  }

  /** @type {string | undefined} */
  let radius
  if (RADIUS in file) {
    const entry = file[RADIUS]
    const unsupported = isObject(entry) ? Object.keys(entry).filter((key) => ![...METADATA, '$type', '$value'].includes(key)) : []
    if (!isObject(entry) || !('$value' in entry)) problems.push(`${RADIUS} is not a token`)
    else if (unsupported.length > 0) problems.push(`${RADIUS} has ${unsupported.join(', ')}, which a theme file does not support`)
    else if (typeOf(entry, file) !== 'dimension') problems.push(`${RADIUS} is not a dimension token`)
    else if (!isLength(entry.$value)) problems.push(`${RADIUS} is not a px or rem length of 0 or more`)
    else radius = `${entry.$value.value}${entry.$value.unit}`
  }

  /** @param {string[]} tokens */
  const modeValues = (tokens) => ({
    light: Object.fromEntries(tokens.filter((token) => token in colours.light).map((token) => [token, colours.light[token]])),
    dark: Object.fromEntries(tokens.filter((token) => token in colours.dark).map((token) => [token, colours.dark[token]])),
  })
  const textOnHue = modeValues(TEXT_ON_HUE_TOKENS)
  const hasTextOnHue = Object.keys(textOnHue.light).length + Object.keys(textOnHue.dark).length > 0
  const hue = { light: colours.light['color-project'], dark: colours.dark['color-project'] }
  if (problems.length > 0 || name === undefined || note === undefined || hue.light === undefined || hue.dark === undefined) return { problems }
  return {
    problems,
    inputs: {
      name,
      note,
      hue: { light: hue.light, dark: hue.dark },
      ...(Object.keys(fonts).length > 0 && { fonts }),
      ...(radius !== undefined && { radius }),
      ...(hasNeutrals && { neutrals: modeValues(NEUTRALS) }),
      ...(hasTextOnHue && { textOnHue }),
    },
  }
}
