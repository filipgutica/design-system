export function checkTheme(inputs: ThemeInputs): ThemeCheck[];
export type VsCodeTheme = import("./vscode.js").VsCodeTheme;
export type MappedTheme = import("./vscode.js").MappedTheme;
export type Problem = import("./vscode.js").Problem;
export type ThemeColours = import("./vscode.js").ThemeColours;
export type ThemeInputs = import("./engine.js").ThemeInputs;
export type ThemeCheck = import("./engine.js").CheckResult & {
    ok: boolean;
};
export { ThemeValidationError, mapVsCodeTheme, themeVariables } from "./vscode.js";
