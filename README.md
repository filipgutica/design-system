# Design system

Filip's design language for any framework: the spec, the tokens, the component catalogue, and the editor themes. It ships as the npm package `@filipgutica/design-system`.

- **Agents** get `language/` at `~/design-language` through filip-stack host config.
- **Vue apps** use [`@filipgutica/ui`](https://github.com/filipgutica/ui), which implements this design language.
- **Pages:** the catalogue and example pages are at <https://filipgutica.github.io/design-system/components.html>.

## Contents

| Path | What it holds |
| --- | --- |
| `language/` | The payload: `DESIGN.md`, `components.md`, `decisions.md`, `visualizations.md`, `tokens.css`, the catalogue (`components.html`), example pages, visualization helpers, and the Graphite Indigo editor theme |
| `tokens/graphite-indigo.json` | The Graphite Indigo token values: the only place a value lives |
| `scripts/build-tokens.mjs` | The token generator: writes `language/tokens.css` and `dist/` |
| `dist/` | Generated token files for the class flavour, theme overrides, JSON, and JavaScript |
| `fonts/` | IBM Plex latin `woff2` files, `fonts.css`, and their OFL licences |
| `tests/` | Guard tests for the payload and the tokens, and the React smoke test |

To change a value, edit the JSON and run `pnpm tokens:build`. `pnpm tokens:check` fails when a generated file is stale.

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

`pnpm verify` checks the generated files, runs the tests and the React smoke test, then `pnpm pack --dry-run` and `publint`. The smoke test needs Chromium: `pnpm exec playwright install chromium`.

## Release

semantic-release publishes from `main` with npm provenance, as in ui:

- `fix` releases a patch.
- `feat` releases a minor.
- A breaking change releases a major.

Commits follow Conventional Commits, and CI checks them with commitlint. Do not edit the version by hand.

## History

`language/` came from `host-config/design-language/` in [filip-stack](https://github.com/filipgutica/filip-stack), with its history. The token JSON, generator, and fonts came from [ui](https://github.com/filipgutica/ui).

## License

MIT. The IBM Plex fonts in `fonts/` are under the SIL Open Font License; see the `OFL-*.txt` files beside them. The editor theme in `language/editor-themes/graphite-indigo/` derives from Visual Studio Code's default themes; see its `LICENSE` and `THIRD_PARTY_NOTICES.md`.
