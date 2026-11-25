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
 * One theme's inputs, for light and for dark. Fonts, the base radius, and neutrals stay core unless the theme
 * names its own.
 * @typedef {object} ThemeInputs
 * @property {ModePair} hue The hue, `--color-project` in light and `--color-project-dark`.
 * @property {{ ui?: string, mono?: string }} [fonts] The two font stacks.
 * @property {string} [radius] The base radius, `--radius-base`, as a CSS length.
 * @property {{ light: Record<string, string>, dark: Record<string, string> }} [neutrals] Every NEUTRALS token, per mode.
 * @property {{ light?: Record<string, string>, dark?: Record<string, string> }} [syntax] Syntax colours by SYNTAX_ROLES
 *   role, per mode. A role a theme leaves out stays core.
 * @property {{ light?: Record<string, string>, dark?: Record<string, string> }} [textOnHue] The text on the hue's
 *   fills, by TEXT_ON_HUE_TOKENS name, per mode, for a theme that sets its own. Each value is `#rrggbb`, `white`,
 *   `black`, or a token reference such as `{color-bg}`; for example `{ light: { 'color-accent-text': '#ffffff' } }`.
 *   A token a theme leaves out keeps its default: `color-accent-text` stays `{color-bg}`, which a pale hue can fail,
 *   and the selected-fill text tokens take the first candidate that reaches 4.5:1, or the accent when none does.
 *   Run checkTheme on the result.
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
    // A mix without its percentage, or with one outside 0 to 100, is not a colour the tokens resolve to.
    if (!(share >= 0 && share <= 1)) throw new Error(`unsupported colour: ${value}`)
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

/**
 * The syntax roles, `--color-syntax-<role>`. Keyword, string, number, and comment have core colours; the others
 * follow one of those or the code text, muted or not, unless a theme sets them.
 */
export const SYNTAX_ROLES = ['keyword', 'string', 'number', 'comment', 'function', 'type', 'variable', 'operator', 'punctuation', 'tag', 'attribute']

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
/** The text on the hue's fills, which a theme may set: the primary label and the selected-fill text. */
export const TEXT_ON_HUE_TOKENS = ['color-accent-text', ...TEXT_ON_FILL_TOKENS]

/**
 * The tokens a theme may set, by kind, without their leading dashes. Every other token is core, and a theme
 * never overrides it: the identity group's hue pair, fonts, and base radius; the text on the hue's fills,
 * which a theme sets when its hue cannot carry the default; the neutrals, as a whole set; and the syntax
 * colours, which an imported theme sets.
 * @param {TokenSource} data
 * @returns {{ hue: string[], textOnHue: string[], fonts: string[], radius: string[], neutrals: string[], syntax: string[] }}
 */
export const themeInputNames = (data) => {
  const identity = Object.keys(data.groups.find(({ identity: isIdentity }) => isIdentity)?.tokens ?? {})
  /** @param {string} prefix */
  const take = (prefix) => identity.filter((name) => name.startsWith(prefix))
  const inputs = {
    hue: take('color-'),
    textOnHue: [...TEXT_ON_HUE_TOKENS],
    fonts: take('font-'),
    radius: take('radius-'),
    neutrals: [...NEUTRALS],
    syntax: SYNTAX_ROLES.map((role) => `color-syntax-${role}`),
  }
  const sorted = Object.values(inputs).flat()
  const unsorted = identity.filter((name) => !sorted.includes(name))
  if (unsorted.length > 0) throw new Error(`Identity tokens with no input kind: ${unsorted.join(', ')}`)
  return inputs
}

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
 * The core tokens with one theme's inputs filled in. Core leaves the hue pair empty; its font stacks, base
 * radius, and neutrals stay unless the theme names its own. Then each selected-fill text token takes its readable value,
 * and any text on the hue the theme sets replaces it.
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
  if (theme.radius) identity['radius-base'] = theme.radius
  const { neutrals } = theme
  if (neutrals) for (const name of NEUTRALS) groupOf(data, name).tokens[name] = [neutrals.light[name], neutrals.dark[name]]
  for (const role of SYNTAX_ROLES) {
    const [light, dark] = [theme.syntax?.light?.[role], theme.syntax?.dark?.[role]]
    if (light === undefined && dark === undefined) continue
    const name = `color-syntax-${role}`
    const { tokens } = groupOf(data, name)
    tokens[name] = [light ?? valueFor(tokens, name, LIGHT), dark ?? valueFor(tokens, name, DARK)]
  }
  withReadableText(data)
  for (const name of TEXT_ON_HUE_TOKENS) {
    const [light, dark] = [theme.textOnHue?.light?.[name], theme.textOnHue?.dark?.[name]]
    if (light === undefined && dark === undefined) continue
    const { tokens } = groupOf(data, name)
    tokens[name] = [light ?? valueFor(tokens, name, LIGHT), dark ?? valueFor(tokens, name, DARK)]
  }
  return data
}

// The contrast checks, as data: each pair is an ink and the fill below it, as language/components.html draws
// them, including the hover, pressed, and focus states a reader only sees on interaction. A fill is its layers,
// top first, over an opaque one. A paint is a colour with {token} references; an ink may differ per mode.
/** @typedef {string | [string, string]} Paint */
/** @typedef {{ ink: Paint, fill: string[] }} Pair */
/**
 * @typedef {object} Check
 * @property {string} id
 * @property {string} label What the check measures, in plain text.
 * @property {number} min The lowest ratio that passes.
 * @property {'theme' | 'core'} kind Follows the ink: `theme` when it is a theme input or derives from one,
 *   `core` when it is a core colour, which a theme cannot change.
 * @property {Pair[]} pairs Every place the check measures.
 */

/**
 * Every ink on every fill.
 * @param {Paint[]} inks
 * @param {(string | string[])[]} fills A fill's layers, top first, or one opaque paint.
 * @returns {Pair[]}
 */
const on = (inks, fills) => inks.flatMap((ink) => fills.map((fill) => ({ ink, fill: typeof fill === 'string' ? [fill] : fill })))
/**
 * @param {string} paint
 * @param {number} share
 * @param {string} below
 */
const mix = (paint, share, below) => `color-mix(in srgb, ${paint} ${share}%, ${below})`
const ON_SURFACES = SURFACES.map((name) => `{${name}}`)
// A quiet action with a text label sits on the page, as the project switcher, or on a raised code header.
const QUIET_ACTION_SURFACES = ['{color-bg}', '{color-surface-raised}']
const STATUS = ['color-success', 'color-warning', 'color-error', 'color-info']
/**
 * A status colour as text: the tone mixed into the status ink, 75% in light and 85% in dark.
 * @param {string} tone
 * @returns {Paint}
 */
const statusInk = (tone) => [mix(`{${tone}}`, 75, '{color-status-ink}'), mix(`{${tone}}`, 85, '{color-status-ink}')]

/**
 * The contrast checks each theme must pass, in both modes.
 * @type {Check[]}
 */
export const CHECKS = [
  // Rows, tabs, segmented buttons, and code blocks draw their ring inside, over their own fill.
  // Accent on code also measures the shell prompt: color-focus follows color-accent.
  { id: 'focus', label: 'Focus ring on the page, a surface, a raised surface, and the fills an inset ring sits on', min: 3, kind: 'theme',
    pairs: on(['{color-focus}'], [
      ...ON_SURFACES, '{color-row-hover}', '{color-well}', ['{color-control-thumb}', '{color-well}'], '{color-code}',
      ...ON_SURFACES.map((surface) => ['{color-nav-current}', surface]),
    ]) },
  // Selected tabs, rows, and options draw the same fill. A phone header's current link is the accent alone, on the page.
  { id: 'nav', label: 'Current row text on its fill, on each surface, and a current link on the page', min: 4.5, kind: 'theme',
    pairs: [
      ...on(['{color-nav-current-text}'], ON_SURFACES.map((surface) => ['{color-nav-current}', surface])),
      ...on(['{color-accent}'], ['{color-bg}']),
    ] },
  { id: 'thumb', label: 'Selected segmented label on its thumb', min: 4.5, kind: 'theme',
    pairs: on(['{color-segmented-current-text}'], [['{color-control-thumb}', '{color-well}']]) },
  { id: 'primary', label: 'Primary label on its fill, at rest and on hover', min: 4.5, kind: 'theme',
    pairs: on(['{color-accent-text}'], ['{color-accent}', '{color-button-hover}']) },
  { id: 'text', label: 'Text and muted text on every fill that carries them, at rest, on hover, and pressed', min: 4.5, kind: 'theme',
    pairs: [
      // Code and command text are included: color-code follows color-surface, and color-code-text follows color-text.
      // Surfaces, neutral badges, pressed and disabled-looking wells, fields, hovered rows, radio cards, and pressed toggles.
      ...on(['{color-text}', '{color-muted}'], [
        ...ON_SURFACES, '{color-surface-muted}', '{color-well}', '{color-field-bg}', '{color-row-hover}',
        mix('{color-surface-muted}', 45, '{color-surface-raised}'), mix('{color-accent}', 8, '{color-surface-raised}'),
      ]),
      // Secondary buttons at rest and on hover, status alerts, a hovered segment, and a pressed quiet action.
      ...on(['{color-text}'], [
        '{color-control-thumb}', mix('{color-text}', 8, '{color-control-thumb}'),
        ...STATUS.map((tone) => `{${tone}-surface}`),
        [mix('{color-control-thumb}', 45, 'transparent'), '{color-well}'],
        ...QUIET_ACTION_SURFACES.map((surface) => [mix('{color-text}', 12, 'transparent'), surface]),
      ]),
      // A quiet action pressed without the pointer over it keeps its muted colour, on a tint of that colour.
      ...on(['{color-muted}'], QUIET_ACTION_SURFACES.map((surface) => [mix('{color-muted}', 12, 'transparent'), surface])),
    ] },
  { id: 'edge', label: 'Control edge on the page, a surface, and a raised surface', min: 3, kind: 'theme',
    pairs: on(['{color-border}'], ON_SURFACES) },
  // A terminal capture's highlight and its current tab, in the dark hue on the terminal.
  { id: 'terminal', label: 'Highlighted text in a terminal capture, and its current tab', min: 4.5, kind: 'theme',
    pairs: on(['{color-project-dark}'], ['{color-terminal}', [mix('{color-project-dark}', 20, 'transparent'), '{color-terminal}']]) },
  // ANSI colour 0 is black: captures use it as a background, so only colours 1 to 15 are measured as text.
  { id: 'ansi', label: 'ANSI text colours on a terminal capture, and its text on the ANSI blue background', min: 4.5, kind: 'core',
    pairs: [
      ...on(Array.from({ length: 15 }, (_, slot) => `{color-terminal-ansi-${slot + 1}}`), ['{color-terminal}']),
      ...on(['{color-terminal-text}'], ['{color-terminal-ansi-4-bg}']),
    ] },
  { id: 'link', label: 'Link text on the page, a surface, and a raised surface', min: 4.5, kind: 'core',
    pairs: on(['{color-link}'], ON_SURFACES) },
  { id: 'status', label: 'Status text on the page, a surface, and a raised surface, on its badge, and on a danger button', min: 4.5, kind: 'core',
    pairs: [
      ...on(STATUS.map((tone) => `{${tone}}`), ON_SURFACES),
      ...STATUS.flatMap((tone) => on([statusInk(tone)], [mix(`{${tone}}`, 22, '{color-surface-raised}')])),
      ...on([statusInk('color-error')], ['{color-error-surface}', ...[10, 16].map((share) => mix('{color-error}', share, '{color-error-surface}'))]),
    ] },
  // Core unless a theme sets a role, or the role follows a theme input such as the muted text; the mapper reports
  // those pairs as the theme's.
  { id: 'syntax', label: 'Syntax colours on a code block', min: 4.5, kind: 'core',
    pairs: on(SYNTAX_ROLES.map((role) => `{color-syntax-${role}}`), ['{color-code}']) },
]

/** @typedef {{ ink: string, fill: string, ratio: number }} PairResult */
/**
 * Each pair's ratio in one mode, with the ink and the fill as resolved paints.
 * @param {Record<string, string>} values One mode's resolved values.
 * @param {Pair[]} pairs
 * @param {Mode} mode
 * @returns {PairResult[]}
 */
export const measurePairs = (values, pairs, mode) => {
  /** @param {string} paint */
  const read = (paint) => parseColour(paint.replace(reference, (_, name) => values[name] ?? `unknown token ${name}`))
  return pairs.map(({ ink, fill }) => {
    const inkPaint = Array.isArray(ink) ? ink[mode === 'light' ? LIGHT : DARK] : ink
    const layers = fill.map(read)
    if (layers.at(-1)?.[3] !== 1) throw new Error(`The fill ${fill.join(' over ')} does not end on an opaque colour`)
    const below = layers.reduceRight((under, layer) => over(layer, under))
    return { ink: inkPaint, fill: fill.join(' over '), ratio: ratio(read(inkPaint), below) }
  })
}
/**
 * Whether a ratio passes. A ratio that is not a number fails, so a check cannot pass on an unread colour.
 * @param {number} value
 * @param {number} min
 */
export const passes = (value, min) => Number.isFinite(value) && value >= min

/** @typedef {{ id: string, label: string, min: number, kind: 'theme' | 'core', light: number, dark: number }} CheckResult */
/**
 * Every check for one theme's resolved values, with each mode's lowest ratio.
 * @param {ResolvedValues} values
 * @param {Check[]} [checks] The checks to run; every check unless given.
 * @returns {CheckResult[]}
 */
export const themeChecks = (values, checks = CHECKS) => checks.map(({ pairs, ...check }) => ({
  ...check,
  light: Math.min(...measurePairs(values.light, pairs, 'light').map((pair) => pair.ratio)),
  dark: Math.min(...measurePairs(values.dark, pairs, 'dark').map((pair) => pair.ratio)),
}))
