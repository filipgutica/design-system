# Design system

Filip's design language for any framework: the spec, the tokens, the component catalogue, and the editor themes. It ships as the npm package `@filipgutica/design-system`.

- **Agents** get `language/` at `~/design-language` through filip-stack host config.
- **Vue apps** use [`@filipgutica/ui`](https://github.com/filipgutica/ui), which implements this design language.
- **Pages:** the catalogue and example pages are at <https://filipgutica.github.io/design-system/components.html>.

## Contents

| Path | What it holds |
| --- | --- |
| `language/` | The payload: `DESIGN.md`, `components.md`, `decisions.md`, `visualizations.md`, `tokens.css`, the catalogue (`components.html`), example pages, visualization helpers, and the Graphite Indigo editor theme |
| `tokens/graphite-indigo.json` | The Graphite Indigo token values |
| `scripts/build-tokens.mjs` | The token generator |
| `tests/` | Guard tests for the payload and the tokens |

`language/tokens.css` is a hand copy of the token values. The generator does not write it yet. Its command line still reads ui's `src/theme.css` and writes ui's files, so run it in ui until the JSON takes in the values that only `theme.css` defines. Until then, `tests/token-agreement.test.mjs` holds `tokens.css` to the JSON wherever both define a value.

## Install

```sh
npm install @filipgutica/design-system
```

Read files from `node_modules/@filipgutica/design-system/language/`. For example, link `language/tokens.css` from a standalone HTML page.

## Develop

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` runs the tests, `pnpm pack --dry-run`, and `publint`.

## Release

semantic-release publishes from `main` with npm provenance, as in ui:

- `fix` releases a patch.
- `feat` releases a minor.
- A breaking change releases a major.

Commits follow Conventional Commits, and CI checks them with commitlint. Do not edit the version by hand.

## History

`language/` came from `host-config/design-language/` in [filip-stack](https://github.com/filipgutica/filip-stack), with its history. The token JSON and generator came from [ui](https://github.com/filipgutica/ui).

## License

MIT. The editor theme in `language/themes/graphite-indigo/` derives from Visual Studio Code's default themes; see its `LICENSE` and `THIRD_PARTY_NOTICES.md`.
