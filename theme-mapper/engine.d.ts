/**
 * A token's value: one value for both modes, a [light, dark] pair, or null for an input core leaves empty.
 * @typedef {string | [string, string] | null} TokenValue
 */
/**
 * The token source: groups of tokens. The identity group holds the theme's own inputs.
 * @typedef {{ groups: { identity?: boolean, tokens: Record<string, TokenValue> }[] }} TokenSource
 */
/** @typedef {{ light: string, dark: string }} ModePair */
/**
 * One theme's inputs, for light and for dark. Fonts and neutrals stay core unless the theme names its own.
 * @typedef {object} ThemeInputs
 * @property {ModePair} hue The hue, `--color-project` in light and `--color-project-dark`.
 * @property {{ ui?: string, mono?: string }} [fonts] The two font stacks.
 * @property {{ light: Record<string, string>, dark: Record<string, string> }} [neutrals] Every NEUTRALS token, per mode.
 */
/**
 * Every token's resolved value in light and in dark, as getComputedStyle reports it.
 * @typedef {{ light: Record<string, string>, dark: Record<string, string> }} ResolvedValues
 */
/**
 * A colour as [r, g, b, alpha], channels 0 to 255 and alpha 0 to 1.
 * @typedef {number[]} Colour
 */
/** @typedef {'light' | 'dark'} Mode */
export const LIGHT: 0;
export const DARK: 1;
/** A token reference in a value, such as {color-accent}. */
export const reference: RegExp;
export function parseColour(value: string): Colour;
export function over(top: Colour, below: Colour): Colour;
export function ratio(ink: Colour, below: Colour): number;
/** The core neutrals a theme may replace, as a set: a palette that brings its own neutrals sets all of them. */
export const NEUTRALS: string[];
export function flatTokens(data: TokenSource): {
    [k: string]: TokenValue;
};
export function valueFor(tokens: Record<string, TokenValue>, name: string, mode: number): string;
export function resolveData(data: TokenSource): ResolvedValues;
/** The surfaces text and edges sit on: the page, a surface, and a raised surface. */
export const SURFACES: string[];
/** The selected-fill text tokens, which take their readable value from the theme. */
export const TEXT_ON_FILL_TOKENS: string[];
export function applyTheme<Data extends TokenSource>(core: Data, theme: ThemeInputs): Data;
/**
 * The contrast checks each theme must pass, in both modes.
 * @type {Check[]}
 */
export const CHECKS: Check[];
export function measurePairs(values: Record<string, string>, pairs: Pair[], mode: Mode): PairResult[];
export function passes(value: number, min: number): boolean;
export function themeChecks(values: ResolvedValues, checks?: Check[]): CheckResult[];
/**
 * A token's value: one value for both modes, a [light, dark] pair, or null for an input core leaves empty.
 */
export type TokenValue = string | [string, string] | null;
/**
 * The token source: groups of tokens. The identity group holds the theme's own inputs.
 */
export type TokenSource = {
    groups: {
        identity?: boolean;
        tokens: Record<string, TokenValue>;
    }[];
};
export type ModePair = {
    light: string;
    dark: string;
};
/**
 * One theme's inputs, for light and for dark. Fonts and neutrals stay core unless the theme names its own.
 */
export type ThemeInputs = {
    /**
     * The hue, `--color-project` in light and `--color-project-dark`.
     */
    hue: ModePair;
    /**
     * The two font stacks.
     */
    fonts?: {
        ui?: string;
        mono?: string;
    } | undefined;
    /**
     * Every NEUTRALS token, per mode.
     */
    neutrals?: {
        light: Record<string, string>;
        dark: Record<string, string>;
    } | undefined;
};
/**
 * Every token's resolved value in light and in dark, as getComputedStyle reports it.
 */
export type ResolvedValues = {
    light: Record<string, string>;
    dark: Record<string, string>;
};
/**
 * A colour as [r, g, b, alpha], channels 0 to 255 and alpha 0 to 1.
 */
export type Colour = number[];
export type Mode = "light" | "dark";
export type Paint = string | [string, string];
export type Pair = {
    ink: Paint;
    fill: string[];
};
export type Check = {
    id: string;
    /**
     * What the check measures, in plain text.
     */
    label: string;
    /**
     * The lowest ratio that passes.
     */
    min: number;
    /**
     * Follows the ink: `theme` when it is a theme input or derives from one,
     * `core` when it is a core colour, which a theme cannot change.
     */
    kind: "theme" | "core";
    /**
     * Every place the check measures.
     */
    pairs: Pair[];
};
export type PairResult = {
    ink: string;
    fill: string;
    ratio: number;
};
export type CheckResult = {
    id: string;
    label: string;
    min: number;
    kind: "theme" | "core";
    light: number;
    dark: number;
};
