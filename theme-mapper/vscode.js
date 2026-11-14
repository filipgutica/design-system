// Maps a VS Code colour theme onto the design system's theme inputs by selecting the theme's own colours:
// each input takes the first key in its row whose colour passes the row's gate, and no colour is changed.
// What still fails once every input is chosen goes to `problems`.
import { core } from './core.js'
import { CHECKS, NEUTRALS, TEXT_ON_FILL_TOKENS, applyTheme, measurePairs, over, parseColour, passes, ratio, resolveData } from './engine.js'

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
 */
/**
 * A contrast check the mapped theme fails in its mode. A `theme` problem is in the theme's own colours, or a
 * colour that follows them. A `core` problem is a core colour, such as a link, status, or syntax colour, on the
 * theme's fills: the theme cannot fix it.
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
 * @property {string} hueOnDark `--color-project-dark`: the prompt on the command plate, which is dark in both modes.
 * @property {Record<string, string>} neutrals Every neutral token, by name, such as `color-bg`.
 * @property {Problem[]} problems Every check the theme fails after selection.
 */
/** @typedef {Pick<MappedTheme, 'appearance' | 'hue' | 'hueOnDark' | 'neutrals'>} ThemeColours */

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
export const themeInputs = ({ hue, hueOnDark, neutrals }) => ({ hue: { light: hue, dark: hueOnDark }, neutrals: { light: neutrals, dark: neutrals } })

/**
 * Each check that fails in the theme's mode, with the pairs that fail it.
 * @param {ThemeColours} theme
 * @returns {Problem[]}
 */
const failures = (theme) => {
  const mode = theme.appearance
  const values = resolveData(applyTheme(core, themeInputs(theme)))[mode]
  return CHECKS.flatMap(({ id, kind, min, pairs }) => {
    const measured = measurePairs(values, pairs, mode)
    const failing = measured.filter((pair) => !passes(pair.ratio, min))
    return failing.length === 0 ? [] : [{ kind, check: id, mode, ratio: Math.min(...measured.map((pair) => pair.ratio)), min, pairs: failing }]
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

  /** @param {string} key Every other colour composites over the page. */
  const colour = (key) => {
    const value = readColour(colors[key])
    return value && toHex(over(value, parseColour(bg)))
  }
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
      // The command plate and a terminal capture are dark in both modes; a dark theme's hue already reads on them.
      const hueOnDark = appearance === 'dark' ? hue
        : select([...HUE_KEYS, 'button.foreground'], (value) => huePasses(hue, value, ['prompt', 'terminal'])) ?? bg
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
  return {
    name: typeof theme.name === 'string' ? theme.name : '',
    appearance,
    highContrast,
    hue: colours.hue,
    hueOnDark: colours.hueOnDark,
    neutrals: colours.neutrals,
    problems: failures(colours),
  }
}

const HEX = /^#[\da-f]{6}$/i

/**
 * The CSS custom properties a mapped theme sets, by name with their dashes: the hue pair, the neutrals,
 * and the text on the selected fills, as the engine resolves them in the theme's mode. Set them as inline
 * properties on the root element, with `data-theme` forced to the theme's appearance. Experimental.
 * @param {ThemeColours} theme
 * @returns {Record<string, string>}
 * @throws {ThemeValidationError} When the theme is not an object, its mode is not light or dark, or a colour is
 *   not #rrggbb.
 */
export const themeVariables = (theme) => {
  // Persisted input may be anything, whatever its type says.
  if (typeof theme !== 'object' || theme === null) throw new ThemeValidationError('The theme is not an object')
  const { appearance, hue, hueOnDark, neutrals } = theme
  if (appearance !== 'light' && appearance !== 'dark') throw new ThemeValidationError('appearance is not light or dark')
  const colours = [['hue', hue], ['hueOnDark', hueOnDark], ...NEUTRALS.map((name) => [`neutrals["${name}"]`, neutrals?.[name]])]
  for (const [where, value] of colours) {
    if (typeof value !== 'string' || !HEX.test(value)) throw new ThemeValidationError(`${where} is not a #rrggbb colour`)
  }
  const values = resolveData(applyTheme(core, themeInputs(theme)))[appearance]
  return Object.fromEntries(['color-project', 'color-project-dark', ...NEUTRALS, ...TEXT_ON_FILL_TOKENS].map((name) => [`--${name}`, values[name]]))
}
