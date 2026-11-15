// @filipgutica/design-system/open-vsx: resolved VS Code theme files and an Open VSX client.
// Experimental: the API may change in a minor release. No framework or colour mapping.
export { ThemeValidationError, parseVsCodeTheme } from './parse.js'
export { createOpenVsxThemeService } from './client.js'

/** @typedef {import('./parse.js').VsCodeTheme} VsCodeTheme */
/** @typedef {import('./parse.js').ThemeValidationErrorCode} ThemeValidationErrorCode */
/** @typedef {ThemeValidationErrorCode | 'file-too-large' | 'integrity-failed' | 'open-vsx-unavailable' | 'unsupported-extension'} ThemeImportErrorCode */
/** @typedef {{ status: 'success', theme: VsCodeTheme } | { status: 'error', error: { code: ThemeImportErrorCode, message: string } }} ThemeImportResult */
/**
 * @typedef {object} OpenVsxThemeSummary
 * @property {string} id Publisher and extension name, separated by a dot.
 * @property {string} name
 * @property {string} publisher
 * @property {string} description
 * @property {number} downloadCount
 */
/** @typedef {{ status: 'success', themes: OpenVsxThemeSummary[] } | { status: 'error', message: string }} OpenVsxThemeSearchResult */
/**
 * @typedef {object} OpenVsxThemeServiceDependencies
 * @property {typeof fetch} [fetchImpl] Defaults to global fetch; inject for other runtimes or offline tests.
 */
/**
 * @typedef {object} OpenVsxThemeService
 * @property {(query: string) => Promise<OpenVsxThemeSearchResult>} search Blank queries list popular themes.
 * @property {(extensionId: string, preferredAppearance: 'light' | 'dark') => Promise<ThemeImportResult>} importTheme
 *   Imports the first theme matching the preferred type, or the first contribution when no type matches.
 */
