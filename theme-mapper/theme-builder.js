// @filipgutica/design-system/theme-builder: a theme file to the CSS that loads after tokens.css, the same CSS the
// package's own themes/*.css come from. No framework and no runtime dependencies. theme-file.js describes the
// theme file format.
import { core, defaultTheme } from './core.js'
import { applyTheme } from './engine.js'
import { renderThemeCss } from './css.js'
import { parseTheme } from './theme-file.js'

export { THEME_EXTENSION, parseTheme } from './theme-file.js'

/** @typedef {import('./theme-file.js').ThemeFile} ThemeFile */

/** A theme file that the builder cannot take. `problems` lists each problem, as `parseTheme` reports it. */
export class ThemeFileError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(`The theme file has problems:\n  ${problems.join('\n  ')}`)
    this.name = 'ThemeFileError'
    this.problems = problems
  }
}

/**
 * The CSS for a theme file, to load after tokens.css, in its cascade layer or a later one: the theme's inputs on
 * :root, and the mode and subtree blocks for any neutrals or text on the hue it sets. It is the CSS the package's
 * themes/*.css come from.
 * @param {unknown} file The theme file's parsed JSON.
 * @param {{ source?: string }} [options] `source` names the file in the CSS's first comment line.
 * @returns {string}
 * @throws {ThemeFileError} When the file has a problem.
 */
export const themeCss = (file, { source = 'a theme file' } = {}) => {
  const { problems, inputs } = parseTheme(file)
  const { name, hue } = inputs
  if (problems.length > 0 || name === undefined || hue === undefined) throw new ThemeFileError(problems)
  return renderThemeCss({ name, data: applyTheme(core, { ...inputs, hue }), source }, applyTheme(core, defaultTheme))
}
