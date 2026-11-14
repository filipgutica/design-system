// The theme engine the token build and the theme mapper share: colour arithmetic for the contrast checks,
// a theme's inputs applied to the core tokens, the resolved values, and the checks every theme must pass.
// It takes the core tokens as a parameter, so it needs neither tokens/core.json nor the file system.

/**
 * A token's value: one value for both modes, a [light, dark] pair, or null for an input core leaves empty.
 * @typedef {string | [string, string] | null} TokenValue
 */
/**
 * The token source: groups of tokens. The identity group holds the theme's own inputs.
 * @typedef {{ groups: { identity?: boolean, tokens: Record<string, TokenValue> }[] }} TokenSource
 */
/** @typedef {{ light: string, dark: string }} ModePair */
/**
 * One theme's inputs, for light and for dark. Fonts and neutrals stay core unless the theme names its own.
 * @typedef {object} ThemeInputs
 * @property {ModePair} hue The hue, `--color-project` in light and `--color-project-dark`.
 * @property {{ ui?: string, mono?: string }} [fonts] The two font stacks.
 * @property {{ light: Record<string, string>, dark: Record<string, string> }} [neutrals] Every NEUTRALS token, per mode.
 */
/**
 * Every token's resolved value in light and in dark, as getComputedStyle reports it.
 * @typedef {{ light: Record<string, string>, dark: Record<string, string> }} ResolvedValues
 */
/**
 * A colour as [r, g, b, alpha], channels 0 to 255 and alpha 0 to 1.
 * @typedef {number[]} Colour
 */
/** @typedef {'light' | 'dark'} Mode */

export const LIGHT = 0
export const DARK = 1
/** A token reference in a value, such as {color-accent}. */
export const reference = /\{([\w-]+)\}/g

// Colour arithmetic. The colour syntax the tokens resolve to: #rrggbb, white, black, transparent, and
// color-mix(in srgb, A p%, B), nested. Anything else throws, so a check cannot pass on an unread colour.
/** @type {Record<string, Colour>} */
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] }
/** @param {string} text */
const splitTop = (text) => {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1
    if (text[i] === ')') depth -= 1
    if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  return [...parts, text.slice(start).trim()]
}
/**
 * A resolved token colour as [r, g, b, alpha], channels 0 to 255, mixed as the browser mixes it.
 * @param {string} value
 * @returns {Colour}
 */
export const parseColour = (value) => {
  const text = value.trim()
  if (NAMED[text]) return NAMED[text]
  const hex = text.match(/^#([\da-f]{6})$/i)?.[1]
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1)
  const mix = text.match(/^color-mix\(in srgb, (.*)\)$/)
  if (mix) {
    const [first, second] = splitTop(mix[1])
    const share = Number(first.match(/ ([\d.]+)%$/)?.[1]) / 100
    const a = parseColour(first.replace(/ [\d.]+%$/, ''))
    const b = parseColour(second)
    // Premultiplied, as CSS mixes a colour with transparent.
    const alpha = a[3] * share + b[3] * (1 - share)
    /** @param {number} i */
    const channel = (i) => (alpha === 0 ? 0 : (a[i] * a[3] * share + b[i] * b[3] * (1 - share)) / alpha)
    return [channel(0), channel(1), channel(2), alpha]
  }
  throw new Error(`unsupported colour: ${value}`)
}
/**
 * A colour composited over an opaque one.
 * @param {Colour} top
 * @param {Colour} below
 * @returns {Colour}
 */
export const over = (top, below) => [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3])).concat(1)
/** @param {Colour} colour */
const luminance = (colour) => colour.slice(0, 3)
  .map((c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4))
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
/**
 * The WCAG contrast ratio of a colour, composited over an opaque one, against that one.
 * @param {Colour} ink
 * @param {Colour} below
 */
export const ratio = (ink, below) => {
  const [hi, lo] = [luminance(over(ink, below)), luminance(below)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

/** The core neutrals a theme may replace, as a set: a palette that brings its own neutrals sets all of them. */
export const NEUTRALS = ['color-bg', 'color-surface', 'color-surface-raised', 'color-surface-muted', 'color-row-hover', 'color-border-subtle', 'color-border', 'color-text', 'color-muted']

/** @param {TokenSource} data */
export const flatTokens = (data) => Object.fromEntries(data.groups.flatMap(({ tokens }) => Object.entries(tokens)))
/**
 * @param {TokenSource} data
 * @param {string} name
 */
const groupOf = (data, name) => {
  const group = data.groups.find(({ tokens }) => name in tokens)
  if (!group) throw new Error(`Unknown token "${name}"`)
  return group
}
/**
 * A token's value in one mode, LIGHT or DARK, with its references left in.
 * @param {Record<string, TokenValue>} tokens
 * @param {string} name
 * @param {number} mode
 */
export const valueFor = (tokens, name, mode) => {
  const value = tokens[name]
  if (value === undefined) throw new Error(`Unknown token "${name}"`)
  if (value === null) throw new Error(`Token "${name}" has no value`)
  return Array.isArray(value) ? value[mode] : value
}

/**
 * One theme's values in light and dark, with every reference substituted.
 * @param {TokenSource} data
 * @returns {ResolvedValues}
 */
export const resolveData = (data) => {
  const tokens = flatTokens(data)
  /** @type {(name: string, mode: number) => string} */
  const resolve = (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => resolve(target, mode))
  /** @param {number} mode */
  const values = (mode) => Object.fromEntries(Object.keys(tokens).map((name) => [name, resolve(name, mode)]))
  return { light: values(LIGHT), dark: values(DARK) }
}

/** The surfaces text and edges sit on: the page, a surface, and a raised surface. */
export const SURFACES = ['color-bg', 'color-surface', 'color-surface-raised']

// Each selected fill's text, with how its contrast is measured on resolved values: the lowest ratio
// over every place the fill sits. The candidates come from the tokens' roles in core.json.
/** @type {Record<string, (ink: Colour, value: (token: string) => Colour) => number>} */
const TEXT_ON_FILL = {
  'color-nav-current-text': (ink, value) => Math.min(...SURFACES
    .map((surface) => ratio(ink, over(value('color-nav-current'), value(surface))))),
  'color-segmented-current-text': (ink, value) => ratio(ink, over(value('color-control-thumb'), value('color-well'))),
}
/** The selected-fill text tokens, which take their readable value from the theme. */
export const TEXT_ON_FILL_TOKENS = Object.keys(TEXT_ON_FILL)
const TEXT_CANDIDATES = ['{color-accent}', '{color-text}', 'black', 'white']

// Sets each TEXT_ON_FILL token to its first candidate that reaches 4.5:1, per mode. When none does, the
// accent stays, so the contrast tests fail on it rather than on a silently chosen colour.
/**
 * @template {TokenSource} Data
 * @param {Data} data
 * @returns {Data}
 */
const withReadableText = (data) => {
  const values = resolveData(data)
  for (const [name, measure] of Object.entries(TEXT_ON_FILL)) {
    /** @param {Mode} mode */
    const pick = (mode) => {
      /** @param {string} token */
      const value = (token) => parseColour(values[mode][token])
      /** @param {string} candidate */
      const colour = (candidate) => parseColour(candidate.replace(reference, (_, target) => values[mode][target]))
      return TEXT_CANDIDATES.find((candidate) => measure(colour(candidate), value) >= 4.5) ?? TEXT_CANDIDATES[0]
    }
    const [light, dark] = [pick('light'), pick('dark')]
    groupOf(data, name).tokens[name] = light === dark ? light : [light, dark]
  }
  return data
}

/**
 * The core tokens with one theme's inputs filled in. Core leaves the hue pair empty; its font stacks and
 * neutrals stay unless the theme names its own. Then each selected-fill text token takes its readable value.
 * @template {TokenSource} Data
 * @param {Data} core
 * @param {ThemeInputs} theme
 * @returns {Data}
 */
export const applyTheme = (core, theme) => {
  // A deep copy: the token source is plain JSON.
  /** @type {Data} */
  const data = JSON.parse(JSON.stringify(core))
  const identity = data.groups.find(({ identity: isIdentity }) => isIdentity)?.tokens
  if (!identity) throw new Error('The token source has no identity group')
  identity['color-project'] = [theme.hue.light, '{color-project-dark}']
  identity['color-project-dark'] = theme.hue.dark
  if (theme.fonts?.ui) identity['font-ui'] = theme.fonts.ui
  if (theme.fonts?.mono) identity['font-mono'] = theme.fonts.mono
  const { neutrals } = theme
  if (neutrals) for (const name of NEUTRALS) groupOf(data, name).tokens[name] = [neutrals.light[name], neutrals.dark[name]]
  return withReadableText(data)
}

/**
 * @typedef {object} Check
 * @property {string} id
 * @property {string} label What the check measures, in plain text.
 * @property {number} min The lowest ratio that passes.
 * @property {(colour: (token: string) => Colour) => number} measure The lowest ratio over every place it measures.
 */
/**
 * The contrast checks each theme must pass, in both modes.
 * @type {Check[]}
 */
export const CHECKS = [
  { id: 'focus', label: 'Focus ring on the page, a surface, and a raised surface', min: 3,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-focus'), c(s)))) },
  { id: 'nav', label: 'Current row text on its fill, on each surface', min: 4.5,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-nav-current-text'), over(c('color-nav-current'), c(s))))) },
  { id: 'thumb', label: 'Selected segmented label on its thumb', min: 4.5,
    measure: (c) => ratio(c('color-segmented-current-text'), over(c('color-control-thumb'), c('color-well'))) },
  { id: 'primary', label: 'Primary label on its fill, at rest and on hover', min: 4.5,
    measure: (c) => Math.min(ratio(c('color-accent-text'), c('color-accent')), ratio(c('color-accent-text'), c('color-button-hover'))) },
  { id: 'prompt', label: 'The $ prompt on the command plate', min: 3,
    measure: (c) => ratio(c('color-project-dark'), c('color-command-bg')) },
  { id: 'text', label: 'Text and muted text on the page, a surface, and a raised surface', min: 4.5,
    measure: (c) => Math.min(...['color-text', 'color-muted'].flatMap((ink) => SURFACES.map((s) => ratio(c(ink), c(s))))) },
  { id: 'edge', label: 'Control edge on the page, a surface, and a raised surface', min: 3,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-border'), c(s)))) },
]

/** @typedef {{ id: string, label: string, min: number, light: number, dark: number }} CheckResult */
/**
 * Every check for one theme's resolved values, with each mode's ratio.
 * @param {ResolvedValues} values
 * @param {Check[]} [checks] The checks to run; the theme checks unless given.
 * @returns {CheckResult[]}
 */
export const themeChecks = (values, checks = CHECKS) => checks.map(({ measure, ...check }) => ({
  ...check,
  light: measure((name) => parseColour(values.light[name])),
  dark: measure((name) => parseColour(values.dark[name])),
}))
