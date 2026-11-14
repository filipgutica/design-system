// Themes: each theme's inputs, a labelled preview in light and in dark, and its contrast checks. A select
// loads a theme's own file after tokens.css, as an app would, to show the whole page in it.
// Every value comes from the theme files and dist/tokens.json. Each preview carries all of its theme's
// resolved tokens: the tokens that follow the hue resolve on :root, so setting the hue on an element
// alone would leave the default theme's accent below it.
import { over, parseColour, ratio } from '../colour.mjs'
import { esc, stackedTablesCss } from './shell.mjs'

const SURFACES = ['color-bg', 'color-surface', 'color-surface-raised']

/** The contrast checks each theme must pass, in both modes. Each measure returns its lowest ratio. */
export const CHECKS = [
  { id: 'focus', label: 'Focus ring on the page, a surface, and a raised surface', min: 3,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-focus'), c(s)))) },
  { id: 'nav', label: 'Current row text on its fill, on each surface', min: 4.5,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-nav-current-text'), over(c('color-nav-current'), c(s))))) },
  { id: 'thumb', label: 'Selected segmented label on its thumb', min: 4.5,
    measure: (c) => ratio(c('color-segmented-current-text'), over(c('color-control-thumb'), c('color-well'))) },
  { id: 'primary', label: 'Primary label on its fill, at rest and on hover', min: 4.5,
    measure: (c) => Math.min(ratio(c('color-accent-text'), c('color-accent')), ratio(c('color-accent-text'), c('color-button-hover'))) },
  { id: 'prompt', label: 'The <code>$</code> prompt on the command plate', min: 3,
    measure: (c) => ratio(c('color-project-dark'), c('color-command-bg')) },
  { id: 'text', label: 'Text and muted text on the page, a surface, and a raised surface', min: 4.5,
    measure: (c) => Math.min(...['color-text', 'color-muted'].flatMap((ink) => SURFACES.map((s) => ratio(c(ink), c(s))))) },
  { id: 'edge', label: 'Control edge on the page, a surface, and a raised surface', min: 3,
    measure: (c) => Math.min(...SURFACES.map((s) => ratio(c('color-border'), c(s)))) },
]

/** Every check for one theme's resolved values: [{ id, label, min, light, dark }], each mode's ratio. */
export const themeChecks = (values) => CHECKS.map(({ measure, ...check }) => ({
  ...check,
  ...Object.fromEntries(['light', 'dark'].map((mode) => [mode, measure((name) => parseColour(values[mode][name]))])),
}))

const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`
const MODES = [['light', 'Light'], ['dark', 'Dark']]

// The parts the hue reaches, in the catalogue's markup. The specimen is inert: it shows states, not controls,
// while the preview's label stays readable to assistive technology.
const preview = (id, mode) => {
  const n = `${id}-${mode}`
  return `<div class="specimen" inert>
        <div class="spec-row"><button class="btn" type="button">${icon('plus')}New monitor</button><button class="btn secondary" type="button">Cancel</button><button class="btn is-focus" type="button">Focused</button></div>
        <div class="spec-row"><div class="segmented" role="group" aria-label="View"><button type="button" aria-pressed="true">List</button><button type="button" aria-pressed="false">Board</button><button type="button" aria-pressed="false">Timeline</button></div></div>
        <div class="spec-split">
          <div class="navlist" role="group" aria-label="Rows"><a href="#${id}" aria-current="page">Overview</a><a class="is-hover" href="#${id}">Checks</a><a href="#${id}">History</a></div>
          <div class="spec-stack">
            <div class="switch-row"><button class="switch" id="sw-${n}" type="button" role="switch" aria-checked="true" aria-labelledby="sw-${n}-label"><span class="switch-track" aria-hidden="true"></span></button><label id="sw-${n}-label" for="sw-${n}">Alerts</label></div>
            <label class="check"><input type="checkbox" checked>Notify on recovery</label>
          </div>
        </div>
        <div class="field"><label class="field-label" for="in-${n}">Service</label><input class="input is-focus" id="in-${n}" value="checkout-api"></div>
        <div class="code command compact"><pre><code><span class="line"><span>pnpm tokens:build</span></span></code></pre></div>
      </div>`
}

// One labelled preview: the theme's name and the mode are always visible.
const frame = ({ id, name }, mode, label) => `<figure class="theme-frame" data-theme-id="${id}" data-mode="${mode}">
        <figcaption class="frame-label"><b>${esc(name)}</b><span>${label}</span></figcaption>
        ${preview(id, mode)}
      </figure>`

const result = (value, min) => {
  const pass = value >= min
  return `<div><span class="result ${pass ? 'pass' : 'fail'}">${icon(pass ? 'check' : 'alert')}${pass ? 'Pass' : 'Fail'}</span><span class="ratio">${value.toFixed(2)}:1</span></div>`
}
const checkTable = ({ id, name }, checks) => `<table class="checks stack" aria-label="${esc(name)} contrast checks" data-checks="${id}">
      <colgroup><col><col class="c-mode"><col class="c-mode"></colgroup>
      <thead><tr><th scope="col">Check</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead>
      <tbody>
      ${checks.map(({ id: check, label, min, light, dark }) => `<tr data-check="${check}"><th scope="row">${label}<small>Needs ${min}:1</small></th><td data-label="Light">${result(light, min)}</td><td data-label="Dark">${result(dark, min)}</td></tr>`).join('\n      ')}
      </tbody>
    </table>`

const same = (defaultTheme) => `<span class="muted">Same as ${esc(defaultTheme.name)}</span>`
const fontName = (stack) => stack.match(/^"([^"]+)"/)?.[1] ?? stack.split(',')[0]

// A theme's own neutrals, as swatches for each mode: the page, the raised surface, the edge, and the text.
const SWATCHES = ['color-bg', 'color-surface-raised', 'color-border', 'color-text']
const neutrals = (theme) => MODES.map(([mode, label]) => `<span class="hue"><span class="swatches">${SWATCHES.map((name) => `<i class="chip" aria-hidden="true"><i style="background:${theme.neutrals[mode][name]}"></i></i>`).join('')}</span>${label}</span>`).join('')

// The default theme names its fonts; another theme names them only when it brings its own. Neutrals likewise.
const inputs = (theme, defaultTheme, values) => {
  const fonts = theme.id === defaultTheme.id || theme.fonts
    ? ['ui', 'mono'].map((font) => `<span style="font-family:var(--font-${font})">${esc(fontName(values.light[`font-${font}`]))} for ${font === 'ui' ? 'text' : 'code'}</span>`).join('')
    : same(defaultTheme)
  return `<dl class="inputs">
      <dt>Hue</dt>
      <dd>${MODES.map(([mode, label]) => `<span class="hue"><i class="chip" aria-hidden="true"><i data-theme-id="${theme.id}" data-mode="${mode}"></i></i>${label} <code>${theme.hue[mode]}</code></span>`).join('')}</dd>
      <dt>Neutrals</dt>
      <dd>${theme.neutrals ? neutrals(theme) : theme.id === defaultTheme.id ? '<span class="muted">Core</span>' : same(defaultTheme)}</dd>
      <dt>Fonts</dt>
      <dd>${fonts}</dd>
    </dl>`
}

const themeSection = (theme, defaultTheme, values) => `  <section class="theme" id="${theme.id}" aria-labelledby="${theme.id}-title">
    <header class="layer-head"><h2 id="${theme.id}-title">${esc(theme.name)}</h2>${theme.id === defaultTheme.id ? '<span class="badge">Default</span>' : ''}</header>
    <p class="theme-note">${esc(theme.note)}</p>
    ${inputs(theme, defaultTheme, values)}
    <div class="frames">
      ${MODES.map(([mode, label]) => frame(theme, mode, label)).join('\n      ')}
    </div>
    <h3>Contrast</h3>
    ${checkTable(theme, themeChecks(values))}
  </section>`

const command = ({ id, label, line }) => `<div class="code command compact"><pre tabindex="0" role="region" aria-label="${esc(label)}"><code id="${id}"><span class="line"><span>${esc(line)}</span></span></code></pre><button class="quiet-action copy" type="button" data-copy="${id}" aria-label="Copy ${esc(label.toLowerCase())}">${icon('copy')}</button></div>`
const source = ({ id, file, lines }) => `<div class="code"><div class="code-head"><b>${esc(file)}</b><button class="quiet-action copy" type="button" data-copy="${id}">${icon('copy')}Copy</button></div><pre tabindex="0" role="region" aria-label="${esc(file)}"><code id="${id}">${lines.map((line) => `<span class="line"><span>${esc(line)}</span></span>`).join('')}</code></pre></div>`

const useSection = (packageName, example) => `  <section class="theme" id="use" aria-labelledby="use-title">
    <header class="layer-head"><h2 id="use-title">Use a theme</h2></header>
    <p class="theme-note"><code>tokens.css</code> carries the default theme. To use another, load its theme file after <code>tokens.css</code>. It sets the theme's inputs on <code>:root</code>, with dark blocks for the values that differ in dark, so light and dark both follow.</p>
    ${source({ id: 'src-use', file: 'styles.css', lines: [`@import "${packageName}/tokens.css";`, `@import "${packageName}/themes/${example.id}.css";`] })}
    <p class="theme-note">Load a theme on <code>:root</code> only. The tokens that follow the hue resolve there, so a theme scoped to an element below <code>:root</code> changes the hue there, but the accent, focus ring, and selection keep the default theme's colours.</p>
    <p class="theme-note">Each theme's source also ships as <code>themes/&lt;id&gt;.tokens.json</code>, a W3C Design Tokens file, for design-token tools such as Style Dictionary and Tokens Studio.</p>
  </section>`

const makeSection = (example) => `  <section class="theme" id="make" aria-labelledby="make-title">
    <header class="layer-head"><h2 id="make-title">Make a theme</h2></header>
    <p class="theme-note">Add a <code>.tokens.json</code> file to <code>tokens/themes/</code> with only the inputs, then build. A theme file uses the W3C Design Tokens format (2025.10): a <code>light</code> and a <code>dark</code> group of sRGB colour tokens, a <code>$description</code> for its note, and its name under <code>$extensions</code>. A theme sets a hue for light and dark, and may name its own font stacks and its own neutrals: the page, surfaces, hover, edges, and text, for both modes. That is how an open palette, such as Catppuccin or GitHub's Primer, becomes a theme. Everything else is core. Where the hue cannot carry the text on a selected fill, the build takes the theme's text colour, then black or white. The tests check every theme against the contrast checks above, in both modes.</p>
    ${source({ id: 'src-theme', file: `tokens/themes/${example.id}.tokens.json`, lines: example.source.trimEnd().split('\n') })}
    ${command({ id: 'cmd-build', label: 'Build command', line: 'pnpm tokens:build' })}
  </section>`

// Each preview takes every token of its theme and mode, and its own colour scheme. Swatches take the hue.
const previewCss = (themes, values) => themes.flatMap(({ id }) => MODES.map(([mode]) =>
  `  [data-theme-id="${id}"][data-mode="${mode}"] { color-scheme: ${mode}; ${Object.entries(values[id][mode]).map(([name, value]) => `--${name}: ${value};`).join(' ')} }`)).join('\n')

const CSS = `
  .theme { display: grid; gap: var(--space-4); }
  .theme .layer-head { grid-auto-flow: column; justify-content: start; align-items: center; gap: var(--space-3); }
  .theme h3 { font-size: var(--text-lg); margin-top: var(--space-2); }
  .theme-note { max-width: var(--measure); }
  .muted { color: var(--color-muted); }
  .inputs { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: var(--space-3) var(--space-6); align-items: center; }
  .inputs dt { color: var(--color-muted); font-size: var(--text-sm); }
  .inputs dd { margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); align-items: center; }
  .hue { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
  .hue code { font-size: var(--text-xs); }
  /* The fill takes the theme's hue; the outline stays the page's, so both chips draw the same edge. */
  .chip { display: grid; flex: none; width: 1.5rem; height: 1.5rem; overflow: hidden; border-radius: var(--radius-inline); }
  .chip > i { grid-area: 1 / 1; background: var(--color-project); }
  .swatches { display: inline-flex; }
  .swatches .chip:not(:first-child) { margin-inline-start: -0.375rem; }
  .theme-pick { max-width: 20rem; }
  .chip::after { content: ""; grid-area: 1 / 1; border-radius: inherit; box-shadow: inset 0 0 0 1px var(--color-border-subtle); }
  .frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: var(--space-4); }
  .theme-frame { display: grid; gap: var(--space-4); align-content: start; margin: 0; padding: var(--space-4); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-panel); background: var(--color-bg); color: var(--color-text); font-family: var(--font-ui); }
  .frame-label { display: flex; flex-wrap: wrap; gap: var(--space-2); font: var(--weight-regular) var(--text-xs) / 1.3 var(--font-mono); color: var(--color-muted); }
  .frame-label b { color: var(--color-text); font-weight: var(--weight-semibold); }
  .frame-label span::before { content: "·" / ""; margin-inline-end: var(--space-2); }
  .specimen { display: grid; gap: var(--space-4); }
  .spec-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
  .spec-split { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); align-items: start; gap: var(--space-3) var(--space-6); }
  .spec-stack { display: grid; gap: var(--space-3); }
  .theme-frame .code { margin: 0; }
  .checks { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: var(--text-sm); }
  .checks .c-mode { width: 10rem; }
  .checks th, .checks td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border-subtle); text-align: left; vertical-align: top; }
  .checks :is(th, td):first-child { padding-inline-start: 0; }
  .checks thead th { font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-muted); white-space: nowrap; }
  .checks tbody th { font-weight: var(--weight-regular); }
  .checks tbody th small { display: block; color: var(--color-muted); font-size: var(--text-xs); }
  .checks td > div { display: flex; align-items: baseline; gap: var(--space-2); white-space: nowrap; }
  .result { display: inline-flex; align-items: center; gap: var(--space-1); font-weight: var(--weight-medium); }
  .result .icon { width: 1rem; height: 1rem; align-self: center; }
  .result.pass .icon { color: var(--color-success); }
  .result.fail, .result.fail .icon { color: var(--color-error); }
  .ratio { color: var(--color-muted); font-variant-numeric: tabular-nums; }
  @media (max-width: 640px) {
    .inputs { grid-template-columns: minmax(0, 1fr); gap: var(--space-1); }
    .inputs dd { margin-bottom: var(--space-3); }
  }
${stackedTablesCss('640px')}
`

// Without a script the select cannot load a file, so it stays hidden. The default theme is tokens.css itself.
const THEMES_JS = `
  const pick = document.getElementById('page-theme');
  const showTheme = () => {
    document.getElementById('page-theme-file')?.remove();
    if (pick.selectedIndex === 0) return;
    document.head.append(Object.assign(document.createElement('link'), { id: 'page-theme-file', rel: 'stylesheet', href: \`themes/\${pick.value}.css\` }));
  };
  pick.closest('.field').hidden = false;
  pick.addEventListener('change', showTheme);
  showTheme();
`

/**
 * The Themes page. `themes` are the theme files in page order, the default first ({ id, name, note, hue,
 * fonts?, neutrals?, source }, source being the theme file's text); `values` is tokens.json's themes map. A theme without values, or values without a theme
 * file, stops the build.
 */
export const themesPage = ({ themes, values, packageName }) => {
  const ids = themes.map(({ id }) => id)
  if (ids.join() !== Object.keys(values).join()) throw new Error(`Themes: the theme files (${ids.join(', ')}) and tokens.json (${Object.keys(values).join(', ')}) disagree`)
  const [defaultTheme] = themes
  const example = themes.at(-1)
  const main = `  <section class="intro" aria-labelledby="title">
    <h1 id="title">Themes</h1>
    <p>A theme sets only its inputs: a hue for light and for dark, and optionally its two fonts and its neutrals. Every other token is core and follows from them, so every theme keeps the same shapes, spacing, states, and status colours. The family's sites each have a theme in their own hue, and open palettes such as Catppuccin and GitHub's Primer map onto the same inputs. The tests measure each theme's contrast in both modes.</p>
    <p>Each preview renders in one theme and one mode, and its label says which. The page around the previews is ${esc(defaultTheme.name)} unless you choose another theme below, which loads that theme's file after <code>tokens.css</code>, as an app would.</p>
    <div class="field theme-pick" hidden><label class="field-label" for="page-theme">Show this page in</label><select class="select" id="page-theme">${themes.map(({ id, name }) => `<option value="${id}">${esc(name)}</option>`).join('')}</select></div>
  </section>

${themes.map((theme) => themeSection(theme, defaultTheme, values[theme.id])).join('\n\n')}

${useSection(packageName, example)}

${makeSection(example)}`

  const rail = {
    label: 'Themes',
    noun: 'a theme',
    groups: [
      { id: 'themes', label: 'Themes', links: themes.map((theme) => ({ href: `#${theme.id}`, text: theme.name, terms: `${theme.hue.light} ${theme.hue.dark} ${theme.note}` })) },
      { id: 'more', label: 'More', links: [
        { href: '#use', text: 'Use a theme', terms: 'import load root css' },
        { href: '#make', text: 'Make a theme', terms: 'create new json build contrast' },
      ] },
    ],
  }
  return { title: 'Themes · Design system', rail, main, css: `${CSS}${previewCss(themes, values)}\n`, js: THEMES_JS }
}
