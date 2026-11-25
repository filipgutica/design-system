# Design system

Filip's design language for any framework: the spec, the tokens, the component catalogue, and the editor themes. It ships as the npm package `@filipgutica/design-system`.

- **Agents** get the `design-system` plugin for Claude and Codex. Its skill reads `language/`; see [Install for agents](#install-for-agents).
- **Vue apps** can use [`@filipgutica/ui`](https://github.com/filipgutica/ui), a Vue component library built on this design system.
- **Site:** <https://filipgutica.github.io/design-system/> has the Overview, Foundations, and Components pages, with `index.json` and `llms.txt` for agents.

## Contents

| Path | What it holds |
| --- | --- |
| `language/` | The payload: `DESIGN.md`, `components.md`, `decisions.md`, `visualizations.md`, `tokens.css`, the experimental `ui-sdk.css` component styles for ui-sdk, the catalogue (`components.html`), example pages, visualization helpers, and the Graphite Indigo editor theme |
| `skills/design-system/`, `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/` | The agent plugin: the skill that points agents at `language/`, and the Claude and Codex plugin and marketplace manifests. The repository root is the plugin root |
| `tokens/core.json`, `tokens/themes/*.tokens.json` | The token values, the only place a value lives, and each token's role. Core holds every token; each theme file is a W3C Design Tokens file (2025.10) that holds only its name, a note, its hue pair, and optional fonts, base radius, and neutrals |
| `scripts/build-tokens.mjs` | The token generator: writes `language/tokens.css`, `dist/`, and the theme mapper's `core.js`; generates and checks declarations from JSDoc for `theme-mapper/` and `open-vsx/` |
| `open-vsx/` | Experimental JSONC theme-file parser and Open VSX client, with resolved includes and unaltered colours and syntax rules |
| `theme-mapper/` | The theme engine the token build shares, and the experimental theme mapper built on it |
| `scripts/build-site.mjs` | The site build: writes `site/` for GitHub Pages from `components.html`, the tokens, and `package.json` |
| `dist/` | Generated theme files, JSON, and JavaScript |
| `fonts/` | Inter and JetBrains Mono latin and latin-ext `woff2` files, `fonts.css`, `SOURCE.json` (the packages and file hashes they come from), and their OFL licences |
| `tests/` | Guard tests for the payload, the tokens, and the site build, the React smoke test, and behaviour tests for the catalogue and the built site |

To change a value, edit the JSON and run `pnpm tokens:build`. `pnpm tokens:check` fails when a generated file is stale or a token has no role.

`pnpm site:build` writes the site to `site/`. It reads the version from the latest `ds-v*` tag, so it needs the tags in the checkout.

## Install

```sh
npm install @filipgutica/design-system
```

| Import | What it is |
| --- | --- |
| `@filipgutica/design-system/tokens.css` | The tokens. Dark mode follows `prefers-color-scheme`; set `data-theme="light"` or `"dark"` on `<html>` to override it. `data-theme="light"` or `"dark"` on any element below `<html>`, or a `.dark` class on `<html>` or below it, themes that subtree: every token that changes with the mode resolves again inside it. The subtree takes its mode's text colour; on an element with both, `data-theme="light"` wins over `.dark`. A theme written by hand, loaded after `tokens.css`, repeats its light values on `:root [data-theme="light"]` and its dark values on the selectors of the dark subtree block at the end of `tokens.css`, beside its `:root` and root dark rules, so its hue, neutrals, and text on the hue hold in a subtree too; a theme file from the token build does this already. |
| `@filipgutica/design-system/ui-sdk.css` | Experimental: draws [ui-sdk](https://ui-sdk.dev)'s headless Button, Field, Input, Textarea, Checkbox, and Radio as the component specs do, checked against `@ui-sdk/*` 0.1.0-beta.5. Load it after `tokens.css`, without ui-sdk's `web.css`; [DESIGN.md](language/DESIGN.md#ui-sdk-experimental) gives the layer order and the supported components. |
| `@filipgutica/design-system/themes/*.css` | A theme's inputs (hue pair, and any fonts, base radius, or neutrals): `graphite-indigo` (the default, already in `tokens.css`); the family sites' hues `lagoon` (annoterm), `copper` (devps), `iris` (filip-stack), `lapis` (Workbench), and `fern` (wtree); or the open palettes `catppuccin` and `github`. Load one after `tokens.css`, on `:root`. |
| `@filipgutica/design-system/themes/*.tokens.json` | Each theme's source as a W3C Design Tokens file (2025.10), for design-token tools such as Style Dictionary and Tokens Studio. |
| `@filipgutica/design-system/fonts.css` | Inter and JetBrains Mono, the default theme's fonts. |
| `@filipgutica/design-system` | `tokens` (resolved values per theme and mode, as `getComputedStyle` reports them, so `radius-panel` and `radius-mark` are `calc()` strings of `radius-base`) and `cssVar(name)`, with types. |
| `@filipgutica/design-system/tokens.json` | The resolved values as JSON. |
| `@filipgutica/design-system/theme-inputs.json` | The tokens a theme may set, without their dashes: `names`, and the same names by kind in `groups` (`hue`, `textOnHue`, `fonts`, `radius`, `neutrals`, `syntax`). Every other token is core. A component library's test can read it and fail when one of its themes sets any other token. |
| `@filipgutica/design-system/language/*` | The spec, catalogue, and example pages. |
| `@filipgutica/design-system/theme-mapper` | Experimental: the API may change until a component library uses it. `mapVsCodeTheme(theme)` maps a VS Code colour theme onto theme inputs for its one mode, by selecting the theme's own colours, keeps the syntax colours its `tokenColors` set, and lists each check it still fails as a `theme` or `core` problem. `checkTheme(inputs)` runs the contrast checks every shipped theme passes on any theme's inputs (`{ hue: { light, dark }, fonts?, radius?, neutrals?, textOnHue? }`; colours are `#rrggbb`, `white`, `black`, or a token reference such as `{color-bg}`, for example `textOnHue: { light: { 'color-accent-text': '#ffffff' } }`) and returns each check's lowest ratio per mode with `ok`. `themeVariables(mapped)` returns the CSS custom properties to set inline on `<html>`, with `data-theme` forced to the theme's mode. Typed, with no framework and no runtime dependencies. |
| `@filipgutica/design-system/open-vsx` | Experimental: the API may change in a minor release. `parseVsCodeTheme({ source, fileName })` parses a JSONC theme file and normalises its name. `createOpenVsxThemeService({ fetchImpl })` accepts an optional fetch implementation, searches Open VSX, and imports a verified package, resolving includes into `{ name, type?, colors, tokenColors? }` for `mapVsCodeTheme`. The parser throws `ThemeValidationError` with `malformed-json` or `invalid-shape`; the client returns success or error results. Uses native ZIP decompression and `jsonc-parser`; picker UI, persistence, and applying a theme belong to component libraries. |

In a React app, import `tokens.css` and `fonts.css` once in the entry and write `var(--color-text)` in styles, or `cssVar('color-text')` in TypeScript. `tests/react-smoke/` is a working example.

## Install for agents

The repository is a Claude and Codex plugin marketplace. The `design-system` skill tells the agent to read `language/DESIGN.md` and the files it names.

```sh
claude plugin marketplace add filipgutica/design-system
claude plugin install design-system@design-system
```

```sh
codex plugin marketplace add filipgutica/design-system
codex plugin add design-system@design-system
```

Update with `claude plugin update design-system@design-system` or `codex plugin marketplace upgrade design-system`. Each release stamps its version into the plugin manifests, so an update fetches the new files.

## Develop

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` checks the generated files, runs the tests, the React smoke test, and the catalogue tests (Find, shortcuts, location, drawer, overflow, and axe), then `pnpm pack --dry-run` and `publint`. The browser tests need Chromium: `pnpm exec playwright install chromium`.

## Release

semantic-release publishes from `main` with npm provenance. Releases stay 1.0.x while the design system has no outside users ([decisions.md](language/decisions.md), Versioning):

- Any commit that releases, such as `fix`, `feat`, `docs`, or a breaking change, releases a patch. `docs` releases because agents read `language/` through the plugin.
- The release notes name a breaking change only when its commit message has `!` after the type or a `BREAKING CHANGE:` or `BREAKING-CHANGE:` footer. Put it there; a marker only in the PR body releases a patch but does not reach the notes.
- `build`, `chore`, `test`, and similar types release nothing, unless the commit or its PR marks a breaking change.
- Each release stamps its version into the four plugin manifests and commits them to `main` as `chore(release): <version> [skip ci]`. `package.json` keeps `0.0.0-development`.
- Release tags are `ds-v*`. The `v1.0.0`–`v2.4.0` tags and npm versions are the earlier series.

Commits follow Conventional Commits, and CI checks them with commitlint. Do not edit a version by hand.

## History

`language/` came from `host-config/design-language/` in [filip-stack](https://github.com/filipgutica/filip-stack), with its history. The token JSON, generator, and fonts came from [ui](https://github.com/filipgutica/ui).

## License

MIT. The Inter and JetBrains Mono fonts in `fonts/` are under the SIL Open Font License; see the `OFL-*.txt` files beside them. The editor theme in `language/editor-themes/graphite-indigo/` derives from Visual Studio Code's default themes; see its `LICENSE` and `THIRD_PARTY_NOTICES.md`. The Catppuccin and GitHub themes take their colours from those projects' MIT palettes; see `dist/themes/THIRD_PARTY_NOTICES.md` and the licenses beside it.
