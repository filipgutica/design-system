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
    constructor(code: ThemeValidationErrorCode, message: string);
    code: ThemeValidationErrorCode;
}
export function isRecord(value: unknown): value is Record<string, unknown>;
export function parseVsCodeTheme({ source, fileName }: {
    source: string;
    fileName: string;
}): VsCodeTheme;
export type ThemeValidationErrorCode = "malformed-json" | "invalid-shape";
/**
 * A resolved VS Code theme, ready for `mapVsCodeTheme`. Colours and syntax rules are kept as supplied.
 */
export type VsCodeTheme = {
    /**
     * Normalised theme name, with the file name as a fallback.
     */
    name: string;
    /**
     * `light`, `dark`, `hc`, or `hcLight` when supplied by the file or manifest.
     */
    type?: string | undefined;
    /**
     * Workbench colours; validation and mapping belong to the mapper.
     */
    colors: Record<string, unknown>;
    /**
     * Syntax rules as supplied; include arrays concatenate base first, child last.
     */
    tokenColors?: unknown;
};
