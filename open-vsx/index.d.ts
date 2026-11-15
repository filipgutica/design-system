export { createOpenVsxThemeService } from "./client.js";
export type VsCodeTheme = import("./parse.js").VsCodeTheme;
export type ThemeValidationErrorCode = import("./parse.js").ThemeValidationErrorCode;
export type ThemeImportErrorCode = ThemeValidationErrorCode | "file-too-large" | "integrity-failed" | "open-vsx-unavailable" | "unsupported-extension";
export type ThemeImportResult = {
    status: "success";
    theme: VsCodeTheme;
} | {
    status: "error";
    error: {
        code: ThemeImportErrorCode;
        message: string;
    };
};
export type OpenVsxThemeSummary = {
    /**
     * Publisher and extension name, separated by a dot.
     */
    id: string;
    name: string;
    publisher: string;
    description: string;
    downloadCount: number;
};
export type OpenVsxThemeSearchResult = {
    status: "success";
    themes: OpenVsxThemeSummary[];
} | {
    status: "error";
    message: string;
};
export type OpenVsxThemeServiceDependencies = {
    /**
     * Defaults to global fetch; inject for other runtimes or offline tests.
     */
    fetchImpl?: typeof fetch | undefined;
};
export type OpenVsxThemeService = {
    /**
     * Blank queries list popular themes.
     */
    search: (query: string) => Promise<OpenVsxThemeSearchResult>;
    /**
     *   Imports the first theme matching the preferred type, or the first contribution when no type matches.
     */
    importTheme: (extensionId: string, preferredAppearance: "light" | "dark") => Promise<ThemeImportResult>;
};
export { ThemeValidationError, parseVsCodeTheme } from "./parse.js";
