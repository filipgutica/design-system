export function block(indent: string, declarations: Declarations): string[];
export function darkOverrides(names: string[], resolve: Resolve): Declarations;
export function standaloneResolver(data: TokenSource): Resolve;
export function standaloneNames(data: TokenSource): string[];
export function subtreeNames(data: TokenSource): string[];
export function subtreeBlocks(blocks: {
    dark: Declarations;
    light: Declarations;
}, { scheme }?: {
    scheme?: boolean;
}): string[];
export function renderThemeCss({ name, data, source }: {
    name: string;
    data: TokenSource;
    source: string;
}, defaultData: TokenSource): string;
export type TokenSource = import("./engine.js").TokenSource;
export type Declarations = [string, string][];
export type Resolve = (name: string, mode: number) => string;
