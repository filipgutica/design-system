// Maps a VS Code colour theme onto the design system's theme inputs by selecting the theme's own colours:
// each input takes the first key in its row whose colour passes the row's gate, and no colour is changed.
// What still fails once every input is chosen goes to `problems`.
import { core } from './core.js'
import { CHECKS, LIGHT, NEUTRALS, SYNTAX_ROLES, TEXT_ON_FILL_TOKENS, applyTheme, flatTokens, measurePairs, over, parseColour, passes, ratio, reference, resolveData, valueFor } from './engine.js'

/** @typedef {import('./engine.js').Colour} Colour */
/** @typedef {import('./engine.js').Mode} Mode */
/** @typedef {import('./engine.js').PairResult} PairResult */
/** @typedef {import('./engine.js').ThemeInputs} ThemeInputs */

/**
 * A VS Code colour theme, parsed, with any `include` already merged in by the caller.
 * @typedef {object} VsCodeTheme
 * @property {string} [name] Many theme files have none; the extension manifest's `label` names the theme.
 * @property {string} [type] `light`, `dark`, `hc`, or `hcLight`; inferred from the background when missing, and a
 *   theme then never counts as high contrast. Many theme files leave the type to the extension manifest's `uiTheme`;
 *   translate it: `vs` is `light`, `vs-dark` is `dark`, `hc-black` is `hc`, and `hc-light` is `hcLight`.
 * @property {Record<string, unknown>} [colors] Workbench colours by key, as #rgb, #rgba, #rrggbb, or #rrggbbaa.
 * @property {unknown} [tokenColors] TextMate rules, `{ scope, settings: { foreground } }`, as the file supplies them;
 *   anything but an array of rules is ignored, so `./open-vsx` output passes as is. Merge an `include`'s
 *   rules first, so the including file's rules come later and win.
 */
/**
 * A contrast check the mapped theme fails in its mode. A `theme` problem is in the theme's own colours, or a
 * colour that follows them, such as a syntax colour the theme sets. A `core` problem is a core colour, such as a
 * link, status, or core syntax colour, on the theme's fills: the theme cannot fix it. One check can report both.
 * @typedef {object} Problem
 * @property {'theme' | 'core'} kind
 * @property {string} check The check's id.
 * @property {Mode} mode
 * @property {number} ratio The lowest ratio the check measured.
 * @property {number} min The lowest ratio that passes.
 * @property {PairResult[]} pairs Each ink on each fill that fails, as the engine resolves them.
 */
/**
 * One VS Code theme as design-system theme inputs, for its one mode. Colours are lowercase #rrggbb.
 * @typedef {object} MappedTheme
 * @property {string} name
 * @property {Mode} appearance The mode the theme is for; a page shows it in that mode only.
 * @property {boolean} highContrast Whether VS Code marks it high contrast (`hc` or `hcLight`).
 * @property {string} hue `--color-project`.
 * @property {string} hueOnDark `--color-project-dark`: the terminal capture accent, on its dark plate in both modes.
 * @property {Record<string, string>} neutrals Every neutral token, by name, such as `color-bg`.
 * @property {Record<string, string>} syntax The syntax colours the theme sets, by role, such as `comment`. A role
 *   it leaves out stays core.
 * @property {Problem[]} problems Every check the theme fails after selection.
 */
/** @typedef {Pick<MappedTheme, 'appearance' | 'hue' | 'hueOnDark' | 'neutrals'> & { syntax?: Record<string, string> }} ThemeColours */

/** A theme that cannot be mapped, or mapped values that are not safe to set. */
export class ThemeValidationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = 'ThemeValidationError'
  }
}

/** @type {Colour} */
const WHITE = [255, 255, 255, 1]
/** @type {Colour} */
const BLACK = [0, 0, 0, 1]
const HUE_KEYS = ['button.background', 'focusBorder', 'textLink.foreground', 'progressBar.background']

// Each syntax role's TextMate scope families. A scope takes the roles whose family matches it most closely, so
// `keyword.operator` is an operator, not a keyword.
/** @type {Record<string, string[]>} */
const SCOPE_FAMILIES = {
  comment: ['comment'],
  keyword: ['keyword', 'storage'],
  string: ['string'],
  number: ['constant.numeric', 'constant.language'],
  function: ['entity.name.function', 'support.function'],
  type: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
  variable: ['variable'],
  operator: ['keyword.operator'],
  punctuation: ['punctuation'],
  tag: ['entity.name.tag'],
  attribute: ['entity.other.attribute-name'],
}
/**
 * The roles a scope belongs to, by its closest family, with how many segments the scope adds to that family:
 * `keyword.control` adds one to `keyword`.
 * @param {string} scope
 * @returns {{ role: string, extra: number }[]}
 */
const rolesForScope = (scope) => {
  const matches = SYNTAX_ROLES.map((role) => ({
    role,
    family: SCOPE_FAMILIES[role].filter((family) => scope === family || scope.startsWith(`${family}.`)).sort((a, b) => b.length - a.length)[0] ?? '',
  }))
  const closest = matches.map(({ family }) => family).reduce((a, b) => (b.length > a.length ? b : a))
  if (closest === '') return []
  const extra = scope.split('.').length - closest.split('.').length
  return matches.filter(({ family }) => family.length === closest.length).map(({ role }) => ({ role, extra }))
}
/**
 * Each role's raw colour from TextMate rules: the rule whose scope is nearest the role's family, so a theme's
 * `keyword` colour wins over its `keyword.control.anchor.regexp` colour; a later rule wins a tie. A rule that is
 * not readable is skipped, as a missing key is. A selector with context, such as `meta.tag string`, counts as
 * its last scope.
 * @param {unknown} rules
 * @returns {Record<string, unknown>}
 */
const syntaxColours = (rules) => {
  /** @type {Record<string, { extra: number, foreground: unknown }>} */
  const found = {}
  for (const rule of Array.isArray(rules) ? rules : []) {
    const foreground = rule?.settings?.foreground
    const scopes = typeof rule?.scope === 'string' ? [rule.scope] : rule?.scope
    // A colour that cannot be read is skipped before it can displace a readable rule.
    if (readColour(foreground) === undefined || !Array.isArray(scopes)) continue
    for (const selector of scopes.filter((scope) => typeof scope === 'string').flatMap((scope) => scope.split(','))) {
      for (const { role, extra } of rolesForScope(selector.trim().split(/\s+/).at(-1) ?? '')) {
        if (!(extra > (found[role]?.extra ?? Infinity))) found[role] = { extra, foreground }
      }
    }
  }
  return Object.fromEntries(Object.entries(found).map(([role, { foreground }]) => [role, foreground]))
}

/**
 * A #rgb, #rgba, #rrggbb, or #rrggbbaa value as a colour; anything else is undefined, as a missing key is.
 * @param {unknown} value
 * @returns {Colour | undefined}
 */
const readColour = (value) => {
  const digits = typeof value === 'string' ? value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1] : undefined
  if (!digits) return undefined
  const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits
  const [r, g, b, a = 255] = [0, 2, 4, 6].filter((i) => i < full.length).map((i) => parseInt(full.slice(i, i + 2), 16))
  return [r, g, b, a / 255]
}
/**
 * An opaque colour as lowercase #rrggbb. Gates measure this rounded value, so a check cannot pass on a
 * fraction the theme's colours lose.
 * @param {Colour} colour
 */
const toHex = (colour) => `#${colour.slice(0, 3).map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
/**
 * The lowest ratio of a colour over every surface.
 * @param {string} ink
 * @param {string[]} surfaces
 */
const contrast = (ink, surfaces) => Math.min(...surfaces.map((surface) => ratio(parseColour(ink), parseColour(surface))))

/**
 * A theme's colours as the engine's inputs. The mapper fills both modes with the same values, so the
 * engine's one mode the theme is for reads them; the hue pair stays a pair.
 * @param {ThemeColours} theme
 * @returns {ThemeInputs}
 */
export const themeInputs = ({ hue, hueOnDark, neutrals, syntax = {} }) => ({
  hue: { light: hue, dark: hueOnDark }, neutrals: { light: neutrals, dark: neutrals }, syntax: { light: syntax, dark: syntax },
})

/**
 * Whether a token is a theme input or follows one through plain references, such as the muted syntax roles.
 * @param {Record<string, import('./engine.js').TokenValue>} tokens
 * @param {Set<string>} inputs
 * @param {string} name
 * @returns {boolean}
 */
const followsInput = (tokens, inputs, name) => {
  if (inputs.has(name)) return true
  const target = valueFor(tokens, name, LIGHT).match(/^\{([\w-]+)\}$/)?.[1]
  return target !== undefined && followsInput(tokens, inputs, target)
}

/**
 * Each check that fails in the theme's mode, with the pairs that fail it.
 * @param {ThemeColours} theme
 * @returns {Problem[]}
 */
const failures = (theme) => {
  const mode = theme.appearance
  const data = applyTheme(core, themeInputs(theme))
  const values = resolveData(data)[mode]
  const tokens = flatTokens(data)
  const inputs = new Set(['color-project', 'color-project-dark', ...NEUTRALS, ...Object.keys(theme.syntax ?? {}).map((role) => `color-syntax-${role}`)])
  /**
   * A core check's pair is the theme's when its ink is one token that is, or follows, a theme input.
   * @param {'theme' | 'core'} kind
   * @param {PairResult} pair
   */
  const kindOf = (kind, { ink }) => {
    const name = ink.match(new RegExp(`^${reference.source}$`))?.[1]
    return kind === 'core' && name !== undefined && followsInput(tokens, inputs, name) ? 'theme' : kind
  }
  return CHECKS.flatMap(({ id, kind, min, pairs }) => {
    const measured = measurePairs(values, pairs, mode)
    const failing = measured.filter((pair) => !passes(pair.ratio, min))
    return /** @type {const} */ (['theme', 'core']).flatMap((found) => {
      const own = failing.filter((pair) => kindOf(kind, pair) === found)
      return own.length === 0 ? [] : [{ kind: found, check: id, mode, ratio: Math.min(...own.map((pair) => pair.ratio)), min, pairs: own }]
    })
  })
}
/**
 * Whether an ink fails anywhere it sits in a theme check.
 * @param {ThemeColours} theme
 * @param {string} ink
 */
const failsInk = (theme, ink) => failures(theme).some(({ kind, pairs }) => kind === 'theme' && pairs.some((pair) => pair.ink === ink))

/**
 * Maps one resolved VS Code colour theme onto design-system theme inputs for its one mode. Experimental.
 * @param {VsCodeTheme} theme
 * @returns {MappedTheme}
 * @throws {ThemeValidationError} When `editor.background` is missing or malformed, or no text candidate
 *   reaches 4.5:1 on it.
 */
export const mapVsCodeTheme = (theme) => {
  const colors = theme?.colors ?? {}
  const background = readColour(colors['editor.background'])
  if (!background) throw new ThemeValidationError('The theme has no editor.background colour')
  const highContrast = theme.type === 'hc' || theme.type === 'hcLight'
  /** @type {Mode} */
  const appearance = theme.type === 'light' || theme.type === 'hcLight' ? 'light'
    : theme.type === 'dark' || theme.type === 'hc' ? 'dark'
    // Without a type, the background over white decides: dark when white text reads better on it.
    : ratio(WHITE, over(background, WHITE)) > ratio(BLACK, over(background, WHITE)) ? 'dark' : 'light'
  const bg = toHex(over(background, appearance === 'dark' ? BLACK : WHITE))

  /** @param {unknown} raw Every other colour composites over the page. */
  const composite = (raw) => {
    const value = readColour(raw)
    return value && toHex(over(value, parseColour(bg)))
  }
  /** @param {string} key */
  const colour = (key) => composite(colors[key])
  /**
   * The first key whose colour passes the gate.
   * @param {string[]} keys
   * @param {(value: string) => boolean} gate
   */
  const select = (keys, gate) => keys.map(colour).find((value) => value !== undefined && gate(value))

  /**
   * The first candidate whose finished theme draws the ink readably everywhere it sits, the fills that follow
   * from later rows included.
   * @param {(string | undefined)[]} candidates
   * @param {string} ink The ink's paint in the checks, such as `{color-text}`.
   * @param {(value: string) => ThemeColours} finish The rest of the mapping with this candidate.
   * @returns {ThemeColours | undefined}
   */
  const readableEverywhere = (candidates, ink, finish) => {
    for (const value of candidates) {
      const finished = value === undefined ? undefined : finish(value)
      if (finished && !failsInk(finished, ink)) return finished
    }
    return undefined
  }

  /**
   * Every input once the text is chosen. Each row takes the first key that passes its gate.
   * @param {string} text
   * @returns {ThemeColours}
   */
  const withText = (text) => {
    /** @param {string} surface */
    const readable = (surface) => contrast(text, [surface]) >= 4.5
    const surface = select(['sideBar.background', 'panel.background'], readable) ?? bg
    const raised = select(['editorWidget.background', 'panel.background'], readable) ?? surface
    const surfaceMuted = select(['list.inactiveSelectionBackground', 'editorWidget.background'], readable) ?? surface
    const rowHover = select(['list.hoverBackground'], readable) ?? surfaceMuted
    const surfaces = [bg, surface, raised]

    /**
     * Every input once the muted text is chosen too.
     * @param {string} muted
     * @returns {ThemeColours}
     */
    const withMuted = (muted) => {
      const border = select(['input.border', 'dropdown.border', 'checkbox.border', 'contrastBorder', 'editorLineNumber.foreground'], (value) => contrast(value, surfaces) >= 3) ?? muted
      // Hairlines carry no minimum.
      const borderSubtle = select(['panel.border', 'sideBar.border', 'editorGroup.border'], () => true) ?? border
      const neutrals = {
        'color-bg': bg, 'color-surface': surface, 'color-surface-raised': raised, 'color-surface-muted': surfaceMuted,
        'color-row-hover': rowHover, 'color-border-subtle': borderSubtle, 'color-border': border, 'color-text': text, 'color-muted': muted,
      }
      /**
       * Whether a hue pair passes the named checks in the theme's mode.
       * @param {string} hue
       * @param {string} hueOnDark
       * @param {string[]} ids
       */
      const huePasses = (hue, hueOnDark, ids) => !failures({ appearance, hue, hueOnDark, neutrals }).some(({ check }) => ids.includes(check))
      // When no hue key passes, the first present one stays and its failures are reported; without any, the text.
      const hue = select(HUE_KEYS, (value) => huePasses(value, value, ['focus', 'nav', 'thumb', 'primary']))
        ?? HUE_KEYS.map(colour).find((value) => value !== undefined) ?? text
      // A terminal capture is dark in both modes; a dark theme's hue already reads on it.
      const hueOnDark = appearance === 'dark' ? hue
        : select([...HUE_KEYS, 'button.foreground'], (value) => huePasses(hue, value, ['terminal'])) ?? bg
      return { appearance, hue, hueOnDark, neutrals }
    }
    // Muted text sits on more fills than the surfaces, such as a hovered row; the text stands in when no key reads on all of them.
    return readableEverywhere(['descriptionForeground', 'editorLineNumber.foreground'].map(colour), '{color-muted}', withMuted) ?? withMuted(text)
  }

  // A theme whose editor text is soft, such as Solarized Light at about 4.1:1, has a stronger text colour for inputs.
  const texts = ['editor.foreground', 'foreground', 'input.foreground'].map(colour)
    .filter(/** @returns {value is string} */ (value) => value !== undefined && contrast(value, [bg]) >= 4.5)
  if (texts.length === 0) throw new ThemeValidationError('No text colour in the theme reaches 4.5:1 on editor.background')
  // Text also sits on core fills, such as status alerts. When no candidate reads on every fill, the first that reads
  // on the page stays and its failures are reported.
  const colours = readableEverywhere(texts, '{color-text}', withText) ?? withText(texts[0])
  // Syntax colours are the author's, kept as they are; the checks report the ones that fail.
  /** @type {Record<string, string>} */
  const syntax = {}
  for (const [role, raw] of Object.entries(syntaxColours(theme.tokenColors))) {
    const value = composite(raw)
    if (value !== undefined) syntax[role] = value
  }
  return {
    name: typeof theme.name === 'string' ? theme.name : '',
    appearance,
    highContrast,
    hue: colours.hue,
    hueOnDark: colours.hueOnDark,
    neutrals: colours.neutrals,
    syntax,
    problems: failures({ ...colours, syntax }),
  }
}

const HEX = /^#[\da-f]{6}$/i

/**
 * The CSS custom properties a mapped theme sets, by name with their dashes: the hue pair, the neutrals,
 * the text on the selected fills, and every syntax colour, as the engine resolves them in the theme's mode. Each
 * theme sets the same properties, so applying one replaces the last; a syntax role the theme leaves out takes
 * its core colour. Set them as inline
 * properties on the root element, with `data-theme` forced to the theme's appearance. Experimental.
 * @param {ThemeColours} theme
 * @returns {Record<string, string>}
 * @throws {ThemeValidationError} When the theme is not an object, its mode is not light or dark, a syntax role is
 *   unknown, or a colour is not #rrggbb.
 */
export const themeVariables = (theme) => {
  // Persisted input may be anything, whatever its type says.
  if (typeof theme !== 'object' || theme === null) throw new ThemeValidationError('The theme is not an object')
  const { appearance, hue, hueOnDark, neutrals, syntax = {} } = theme
  if (appearance !== 'light' && appearance !== 'dark') throw new ThemeValidationError('appearance is not light or dark')
  if (typeof syntax !== 'object' || syntax === null) throw new ThemeValidationError('syntax is not an object')
  const unknown = Object.keys(syntax).find((role) => !SYNTAX_ROLES.includes(role))
  if (unknown !== undefined) throw new ThemeValidationError(`syntax["${unknown}"] is not a syntax role`)
  const colours = [
    ['hue', hue], ['hueOnDark', hueOnDark], ...NEUTRALS.map((name) => [`neutrals["${name}"]`, neutrals?.[name]]),
    ...Object.entries(syntax).map(([role, value]) => [`syntax["${role}"]`, value]),
  ]
  for (const [where, value] of colours) {
    if (typeof value !== 'string' || !HEX.test(value)) throw new ThemeValidationError(`${where} is not a #rrggbb colour`)
  }
  const values = resolveData(applyTheme(core, themeInputs(theme)))[appearance]
  return Object.fromEntries([
    'color-project', 'color-project-dark', ...NEUTRALS, ...TEXT_ON_FILL_TOKENS, ...SYNTAX_ROLES.map((role) => `color-syntax-${role}`),
  ].map((name) => [`--${name}`, values[name]]))
}
