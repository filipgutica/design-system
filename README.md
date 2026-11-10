# Design system

Filip's design language for any framework: the spec, the tokens, the component catalogue, and the editor themes. It ships as the npm package `@filipgutica/design-system`.

- **Agents** get `language/` at `~/design-language` through filip-stack host config.
- **Vue apps** use [`@filipgutica/ui`](https://github.com/filipgutica/ui), which implements this design language.
- **Site:** <https://filipgutica.github.io/design-system/> has the Overview, Foundations, and Components pages, with `index.json` and `llms.txt` for agents.

## Contents

| Path | What it holds |
| --- | --- |
| `language/` | The payload: `DESIGN.md`, `components.md`, `decisions.md`, `visualizations.md`, `tokens.css`, the catalogue (`components.html`), `implementations.json` (each component's Vue and React version), example pages, visualization helpers, and the Graphite Indigo editor theme |
| `tokens/graphite-indigo.json` | The Graphite Indigo token values, the only place a value lives, and each token's role |
| `scripts/build-tokens.mjs` | The token generator: writes `language/tokens.css` and `dist/` |
| `scripts/build-site.mjs` | The site build: writes `site/` for GitHub Pages from `components.html`, the tokens, and `package.json` |
| `dist/` | Generated token files for the class flavour, theme overrides, JSON, and JavaScript |
| `fonts/` | IBM Plex latin `woff2` files, `fonts.css`, and their OFL licences |
| `tests/` | Guard tests for the payload, the tokens, and the site build, the React smoke test, and behaviour tests for the catalogue and the built site |

To change a value, edit the JSON and run `pnpm tokens:build`. `pnpm tokens:check` fails when a generated file is stale or a token has no role.

`pnpm site:build` writes the site to `site/`. It reads the version from the latest `ds-v*` tag, so it needs the tags in the checkout.

## Install

```sh
npm install @filipgutica/design-system
```

| Import | What it is |
| --- | --- |
| `@filipgutica/design-system/tokens.css` | The tokens with their standalone names. Dark mode follows `prefers-color-scheme`; set `data-theme="light"` or `"dark"` on `<html>` to override it. |
| `@filipgutica/design-system/class/base.css`, `class/themes/*.css` | The same values with `@filipgutica/ui`'s names, for apps that toggle a `.dark` class on `<html>`. Use one flavour per app. |
| `@filipgutica/design-system/themes/*.css` | A theme's identity inputs (hue pair and fonts), loaded after `tokens.css`. |
| `@filipgutica/design-system/fonts.css` | IBM Plex Sans and Mono. |
| `@filipgutica/design-system` | `tokens` (resolved values per theme and mode) and `cssVar(name)`, with types. |
| `@filipgutica/design-system/tokens.json` | The resolved values as JSON. |
| `@filipgutica/design-system/language/*` | The spec, catalogue, and example pages. |

In a React app, import `tokens.css` and `fonts.css` once in the entry and write `var(--color-text)` in styles, or `cssVar('color-text')` in TypeScript. `tests/react-smoke/` is a working example.

## Develop

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` checks the generated files, runs the tests, the React smoke test, and the catalogue tests (Find, shortcuts, location, drawer, overflow, and axe), then `pnpm pack --dry-run` and `publint`. The browser tests need Chromium: `pnpm exec playwright install chromium`.

## Release

semantic-release publishes from `main` with npm provenance. Releases stay 1.0.x while the design system has no outside users ([decisions.md](language/decisions.md), Versioning):

- Any commit that releases, such as `fix`, `feat`, or a breaking change, releases a patch. The release notes still name breaking changes.
- `build`, `chore`, `docs`, `test`, and similar types release nothing.
- Release tags are `ds-v*`. The `v1.0.0`–`v2.4.0` tags and npm versions are the earlier series.

Commits follow Conventional Commits, and CI checks them with commitlint. Do not edit the version by hand.

## History

`language/` came from `host-config/design-language/` in [filip-stack](https://github.com/filipgutica/filip-stack), with its history. The token JSON, generator, and fonts came from [ui](https://github.com/filipgutica/ui).

## License

MIT. The IBM Plex fonts in `fonts/` are under the SIL Open Font License; see the `OFL-*.txt` files beside them. The editor theme in `language/editor-themes/graphite-indigo/` derives from Visual Studio Code's default themes; see its `LICENSE` and `THIRD_PARTY_NOTICES.md`.
