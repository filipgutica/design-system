import { parse, printParseErrorCode } from 'jsonc-parser'

/** @typedef {'malformed-json' | 'invalid-shape'} ThemeValidationErrorCode */
/**
 * A resolved VS Code theme, ready for `mapVsCodeTheme`. Colours and syntax rules are kept as supplied.
 * @typedef {object} VsCodeTheme
 * @property {string} name Normalised theme name, with the file name as a fallback.
 * @property {string} [type] `light`, `dark`, `hc`, or `hcLight` when supplied by the file or manifest.
 * @property {Record<string, unknown>} colors Workbench colours; validation and mapping belong to the mapper.
 * @property {unknown} [tokenColors] Syntax rules as supplied; include arrays concatenate base first, child last.
 */

/** A theme file that cannot be parsed, before any colour mapping. */
export class ThemeValidationError extends Error {
  /**
   * @param {ThemeValidationErrorCode} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    this.name = 'ThemeValidationError'
    this.code = code
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
export const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/** @param {string} fileName */
const themeNameFromFile = (fileName) => {
  const baseName = fileName.split(/[\\/]/).at(-1) ?? 'Imported theme'
  return (baseName.replace(/\.jsonc?$/i, '') || 'Imported theme').slice(0, 80)
}

/**
 * Parses one JSONC theme file. Resolve package `include` chains with the Open VSX client first.
 * @param {{ source: string, fileName: string }} options
 * @returns {VsCodeTheme}
 * @throws {ThemeValidationError} `malformed-json` includes a location; `invalid-shape` describes the field.
 */
export const parseVsCodeTheme = ({ source, fileName }) => {
  /** @type {import('jsonc-parser').ParseError[]} */
  const errors = []
  /** @type {unknown} */
  const parsed = parse(source, errors, { allowTrailingComma: true })
  const firstError = errors[0]
  if (firstError) {
    const lines = source.slice(0, firstError.offset).split('\n')
    const line = lines.length
    const column = (lines.at(-1)?.length ?? 0) + 1
    throw new ThemeValidationError('malformed-json', `The theme could not be parsed (${printParseErrorCode(firstError.error)} at line ${line}, column ${column}).`)
  }
  if (!isRecord(parsed)) throw new ThemeValidationError('invalid-shape', 'The theme file must contain a JSON object.')
  if (parsed.name !== undefined && typeof parsed.name !== 'string') {
    throw new ThemeValidationError('invalid-shape', 'The theme name must be a string when provided.')
  }
  if (!isRecord(parsed.colors)) throw new ThemeValidationError('invalid-shape', 'The theme must contain a "colors" object.')
  return {
    name: parsed.name?.trim().replace(/\s+/g, ' ').slice(0, 80) || themeNameFromFile(fileName),
    ...(typeof parsed.type === 'string' ? { type: parsed.type } : {}),
    colors: parsed.colors,
    ...(parsed.tokenColors !== undefined ? { tokenColors: parsed.tokenColors } : {}),
  }
}
