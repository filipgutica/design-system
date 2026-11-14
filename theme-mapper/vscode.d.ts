/** @typedef {import('./engine.js').Colour} Colour */
/** @typedef {import('./engine.js').Mode} Mode */
/** @typedef {import('./engine.js').Check} Check */
/** @typedef {import('./engine.js').ThemeInputs} ThemeInputs */
/**
 * A VS Code colour theme, parsed, with any `include` already merged in by the caller.
 * @typedef {object} VsCodeTheme
 * @property {string} [name]
 * @property {string} [type] `light`, `dark`, `hc`, or `hcLight`; inferred from the background when missing. Many
 *   theme files leave it to the extension manifest's `uiTheme` (`vs`, `vs-dark`, `hc-black`, `hc-light`), so pass it
 *   from there.
 * @property {Record<string, unknown>} [colors] Workbench colours by key, as #rgb, #rgba, #rrggbb, or #rrggbbaa.
 */
/**
 * A contrast check the mapped theme fails in its mode. A `theme` problem is in the theme's own colours.
 * A `core` problem is a core colour, a link or status colour, on the theme's surfaces: the theme cannot fix it.
 * @typedef {object} Problem
 * @property {'theme' | 'core'} kind
 * @property {string} check The check's id.
 * @property {Mode} mode
 * @property {number} ratio The lowest ratio the check measured.
 * @property {number} min The lowest ratio that passes.
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
    constructor(message: string);
}
export function themeInputs({ hue, hueOnDark, neutrals }: ThemeColours): ThemeInputs;
export function mapVsCodeTheme(theme: VsCodeTheme): MappedTheme;
export function themeVariables(theme: ThemeColours): Record<string, string>;
export type Colour = import("./engine.js").Colour;
export type Mode = import("./engine.js").Mode;
export type Check = import("./engine.js").Check;
export type ThemeInputs = import("./engine.js").ThemeInputs;
/**
 * A VS Code colour theme, parsed, with any `include` already merged in by the caller.
 */
export type VsCodeTheme = {
    name?: string | undefined;
    /**
     * `light`, `dark`, `hc`, or `hcLight`; inferred from the background when missing. Many
     * theme files leave it to the extension manifest's `uiTheme` (`vs`, `vs-dark`, `hc-black`, `hc-light`), so pass it
     * from there.
     */
    type?: string | undefined;
    /**
     * Workbench colours by key, as #rgb, #rgba, #rrggbb, or #rrggbbaa.
     */
    colors?: Record<string, unknown> | undefined;
};
/**
 * A contrast check the mapped theme fails in its mode. A `theme` problem is in the theme's own colours.
 * A `core` problem is a core colour, a link or status colour, on the theme's surfaces: the theme cannot fix it.
 */
export type Problem = {
    kind: "theme" | "core";
    /**
     * The check's id.
     */
    check: string;
    mode: Mode;
    /**
     * The lowest ratio the check measured.
     */
    ratio: number;
    /**
     * The lowest ratio that passes.
     */
    min: number;
};
/**
 * One VS Code theme as design-system theme inputs, for its one mode. Colours are lowercase #rrggbb.
 */
export type MappedTheme = {
    name: string;
    /**
     * The mode the theme is for; a page shows it in that mode only.
     */
    appearance: Mode;
    /**
     * Whether VS Code marks it high contrast (`hc` or `hcLight`).
     */
    highContrast: boolean;
    /**
     * `--color-project`.
     */
    hue: string;
    /**
     * `--color-project-dark`: the prompt on the command plate, which is dark in both modes.
     */
    hueOnDark: string;
    /**
     * Every neutral token, by name, such as `color-bg`.
     */
    neutrals: Record<string, string>;
    /**
     * Every check the theme fails after selection.
     */
    problems: Problem[];
};
export type ThemeColours = Pick<MappedTheme, "appearance" | "hue" | "hueOnDark" | "neutrals">;
