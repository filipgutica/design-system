/** @typedef {import('./theme-file.js').ThemeFile} ThemeFile */
/** A theme file that the builder cannot take. `problems` lists each problem, as `parseTheme` reports it. */
export class ThemeFileError extends Error {
    /** @param {string[]} problems */
    constructor(problems: string[]);
    problems: string[];
}
export function themeCss(file: unknown, { source }?: {
    source?: string;
}): string;
export type ThemeFile = import("./theme-file.js").ThemeFile;
export { THEME_EXTENSION, parseTheme } from "./theme-file.js";
