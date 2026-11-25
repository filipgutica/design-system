/** @typedef {import('./engine.js').ModePair} ModePair */
/** @typedef {{ [key: string]: unknown }} JsonObject */
/**
 * A theme file's inputs, in the shape the theme engine takes, with its name and note.
 * @typedef {object} ThemeFile
 * @property {string} name
 * @property {string} note
 * @property {ModePair} hue `color-project` in light and in dark.
 * @property {{ ui?: string, mono?: string }} [fonts] The two font stacks, as CSS.
 * @property {string} [radius] `radius-base`, as a CSS length.
 * @property {{ light: Record<string, string>, dark: Record<string, string> }} [neutrals] Every NEUTRALS token, per mode.
 * @property {{ light?: Record<string, string>, dark?: Record<string, string> }} [textOnHue] TEXT_ON_HUE_TOKENS the
 *   file sets, per mode.
 */
/** The $extensions namespace that holds a theme's name. */
export const THEME_EXTENSION: "io.github.filipgutica.design-system";
export function parseTheme(file: unknown): {
    problems: string[];
    inputs: Partial<ThemeFile>;
};
export type ModePair = import("./engine.js").ModePair;
export type JsonObject = {
    [key: string]: unknown;
};
/**
 * A theme file's inputs, in the shape the theme engine takes, with its name and note.
 */
export type ThemeFile = {
    name: string;
    note: string;
    /**
     * `color-project` in light and in dark.
     */
    hue: ModePair;
    /**
     * The two font stacks, as CSS.
     */
    fonts?: {
        ui?: string;
        mono?: string;
    } | undefined;
    /**
     * `radius-base`, as a CSS length.
     */
    radius?: string | undefined;
    /**
     * Every NEUTRALS token, per mode.
     */
    neutrals?: {
        light: Record<string, string>;
        dark: Record<string, string>;
    } | undefined;
    /**
     * TEXT_ON_HUE_TOKENS the
     * file sets, per mode.
     */
    textOnHue?: {
        light?: Record<string, string>;
        dark?: Record<string, string>;
    } | undefined;
};
