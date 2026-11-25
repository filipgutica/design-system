// @filipgutica/design-system/theme-mapper: maps other theme formats onto the design system's theme inputs,
// with no framework and no runtime dependencies. Experimental: the API may change in a minor release.
import { core } from './core.js'
import { applyTheme, passes, resolveData, themeChecks } from './engine.js'

export { ThemeValidationError, mapVsCodeTheme, themeVariables } from './vscode.js'

/** @typedef {import('./vscode.js').VsCodeTheme} VsCodeTheme */
/** @typedef {import('./vscode.js').MappedTheme} MappedTheme */
/** @typedef {import('./vscode.js').Problem} Problem */
/** @typedef {import('./vscode.js').ThemeColours} ThemeColours */
/** @typedef {import('./engine.js').ThemeInputs} ThemeInputs */
/** @typedef {import('./engine.js').CheckResult & { ok: boolean }} ThemeCheck */

/**
 * Runs the contrast checks every shipped theme passes, in light and dark, on one theme's inputs: the same
 * checks as the token build. Each result has its lowest ratio per mode, and `ok` when both reach its minimum.
 * Use it to check a theme this package does not ship. Experimental.
 * @param {ThemeInputs} inputs
 * @returns {ThemeCheck[]}
 */
export const checkTheme = (inputs) => themeChecks(resolveData(applyTheme(core, inputs)))
  .map((check) => ({ ...check, ok: passes(check.light, check.min) && passes(check.dark, check.min) }))
