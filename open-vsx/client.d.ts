export function createOpenVsxThemeService({ fetchImpl, }?: OpenVsxThemeServiceDependencies): OpenVsxThemeService;
export type ParseError = import("jsonc-parser").ParseError;
export type VsCodeTheme = import("./parse.js").VsCodeTheme;
export type OpenVsxThemeSummary = import("./index.js").OpenVsxThemeSummary;
export type OpenVsxThemeSearchResult = import("./index.js").OpenVsxThemeSearchResult;
export type ThemeImportErrorCode = import("./index.js").ThemeImportErrorCode;
export type ThemeImportResult = import("./index.js").ThemeImportResult;
export type OpenVsxThemeService = import("./index.js").OpenVsxThemeService;
export type OpenVsxThemeServiceDependencies = import("./index.js").OpenVsxThemeServiceDependencies;
export type PreferredAppearance = "light" | "dark";
export type ThemeContribution = {
    label?: unknown;
    uiTheme?: unknown;
    path?: unknown;
};
export type Requester = ReturnType<typeof createRequester>;
export type ZipEntry = {
    name: string;
    uncompressed: number;
    compressed: number;
    compression: number;
    data: Uint8Array;
    nextOffset: number;
};
export type ReadZipText = (options: {
    path: string;
    description: string;
    limit?: number;
}) => Promise<string>;
/**
 * @param {typeof fetch} fetchImpl
 * @returns {(options: {url: string | URL, limit: number, failureMessage: string, tooLargeMessage: string, allowResourceOrigin?: boolean}) => Promise<Uint8Array>}
 */
declare function createRequester(fetchImpl: typeof fetch): (options: {
    url: string | URL;
    limit: number;
    failureMessage: string;
    tooLargeMessage: string;
    allowResourceOrigin?: boolean;
}) => Promise<Uint8Array>;
export {};
