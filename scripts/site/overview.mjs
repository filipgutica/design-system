// Overview: what the design system is, and the install path for each stack. The version and the
// exports table come from the build (the release tag and package.json), not from page text.
import { esc, stackedTablesCss } from './shell.mjs'

// A command plate (one shell line) and a source block with a header and Copy, in the catalogue's markup.
const command = ({ id, label, line }) => `<div class="code command compact"><pre tabindex="0" role="region" aria-label="${esc(label)}"><code id="${id}"><span class="line"><span>${esc(line)}</span></span></code></pre><button class="quiet-action copy" type="button" data-copy="${id}" aria-label="Copy ${esc(label.toLowerCase())}"><svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg></button></div>`
const source = ({ id, file, text }) => `<div class="code"><div class="code-head"><b>${esc(file)}</b><button class="quiet-action copy" type="button" data-copy="${id}"><svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg>Copy</button></div><pre tabindex="0" role="region" aria-label="${esc(file)}"><code id="${id}">${text.trim().split('\n').map((line) => `<span class="line"><span>${esc(line)}</span></span>`).join('')}</code></pre></div>`

/** What each export is for, keyed by its exports path. A new export without an entry fails the build. */
export const EXPORT_USES = {
  '.': 'Typed token data: <code>tokens</code> and <code>cssVar()</code>',
  './tokens.css': 'Every token, light and dark, with the base element styles',
  './class/base.css': 'The same tokens for apps that switch dark mode with a <code>.dark</code> class',
  './class/themes/*.css': 'Theme overrides for the class flavour',
  './themes/*.css': 'Theme overrides (identity inputs only)',
  './tokens.json': 'Every value per theme and mode, for tools and generators',
  './fonts.css': 'IBM Plex Sans and Mono, self-hosted',
  './fonts/*': 'The font files',
  './language/*': 'The spec, decisions, catalogue, and templates',
  './package.json': 'Package metadata',
}

const PATHS = [
  { id: 'html', name: 'Plain HTML', who: 'A static page, a prototype, or an explainer', pkg: '@filipgutica/design-system', start: '<code>tokens.css</code>' },
  { id: 'vue', name: 'Vue', who: 'A Vue 3.5 app built with Tailwind CSS 4', pkg: '@filipgutica/ui', start: 'Its styles and components' },
  { id: 'react', name: 'React', who: 'A React app', pkg: '@filipgutica/design-system', start: '<code>tokens.css</code> and <code>cssVar()</code>' },
  { id: 'agents', name: 'Agents', who: 'Claude or Codex doing UI work for you', pkg: 'filip-stack host config', start: '<code>~/design-language/DESIGN.md</code>' },
]

export const overviewPage = ({ pkg, version }) => {
  const unknown = Object.keys(pkg.exports).filter((path) => !(path in EXPORT_USES))
  if (unknown.length) throw new Error(`Overview: say what ${unknown.join(', ')} is for in EXPORT_USES`)
  const exportRows = Object.keys(pkg.exports).map((path) => `<tr><th scope="row"><code>${esc(path === '.' ? pkg.name : `${pkg.name}${path.slice(1)}`)}</code></th><td data-label="For"><div>${EXPORT_USES[path]}</div></td></tr>`).join('\n        ')

  const main = `  <section class="intro" aria-labelledby="title">
    <div class="title-row"><h1 id="title">Design system</h1><span class="badge">${esc(version)}</span></div>
    <p>Tokens, component specs, and a component catalogue for Filip’s products, written in plain CSS and HTML. Any framework can use them: <code>@filipgutica/ui</code> implements them in Vue, and a React library is next.</p>
  </section>

  <section class="doc-section" id="choose" aria-labelledby="choose-title">
    <h2 id="choose-title">Choose your path</h2>
    <table class="paths stack" aria-labelledby="choose-title">
      <thead><tr><th scope="col">You are building</th><th scope="col">Install</th><th scope="col">Start with</th></tr></thead>
      <tbody>
        ${PATHS.map((p) => `<tr><th scope="row"><a href="#${p.id}">${p.name}</a><span class="who">${p.who}</span></th><td data-label="Install"><div><code>${p.pkg}</code></div></td><td data-label="Start with"><div>${p.start}</div></td></tr>`).join('\n        ')}
      </tbody>
    </table>
  </section>

  <section class="doc-section" id="html" aria-labelledby="html-title">
    <h2 id="html-title">Plain HTML</h2>
    <p>Install the package, then import the fonts and tokens before your own styles.</p>
    ${command({ id: 'cmd-html', label: 'Install command for plain HTML', line: `pnpm add ${pkg.name}` })}
    ${source({ id: 'src-html', file: 'app.css', text: `
@import "${pkg.name}/fonts.css";
@import "${pkg.name}/tokens.css";

.panel { background: var(--color-surface-raised); border-radius: var(--radius-panel); }` })}
    <p>Without a bundler, link <code>fonts/fonts.css</code> and <code>language/tokens.css</code> from the package folder. Pages follow the reader’s system theme; set <code>data-theme="light"</code> or <code>"dark"</code> on <code>&lt;html&gt;</code> to choose one.</p>
    <p>Copy component markup and styles from <a href="components.html">Components</a>.</p>
  </section>

  <section class="doc-section" id="vue" aria-labelledby="vue-title">
    <h2 id="vue-title">Vue</h2>
    <p><code>@filipgutica/ui</code> carries the tokens with its components, so a Vue app does not install the design system itself. It needs Vue 3.5 or later and a stylesheet that Tailwind CSS 4 builds.</p>
    ${command({ id: 'cmd-vue', label: 'Install command for Vue', line: 'pnpm add @filipgutica/ui' })}
    ${source({ id: 'src-vue-css', file: 'main.css', text: `
@import "tailwindcss";
@import "@filipgutica/ui/theme.css";
@import "@filipgutica/ui/themes/graphite-indigo.css";
@import "@filipgutica/ui/components.css";` })}
    ${source({ id: 'src-vue', file: 'SaveButton.vue', text: `
<script setup lang="ts">
import { UiButton } from '@filipgutica/ui'
</script>

<template>
  <UiButton variant="secondary" size="sm">Save changes</UiButton>
</template>` })}
    <p>The <a href="https://filipgutica.github.io/ui/">ui documentation</a> lists every component and its props. Each component in <a href="components.html">Components</a> links to its Vue version.</p>
  </section>

  <section class="doc-section" id="react" aria-labelledby="react-title">
    <h2 id="react-title">React</h2>
    <div class="alert"><svg class="icon" aria-hidden="true"><use href="#i-help"/></svg><p>There is no React component library yet. Use the tokens and fonts, and copy each component’s markup and roles from <a href="components.html">Components</a>.</p></div>
    ${command({ id: 'cmd-react', label: 'Install command for React', line: `pnpm add ${pkg.name}` })}
    ${source({ id: 'src-react', file: 'main.tsx', text: `
import '${pkg.name}/tokens.css'
import '${pkg.name}/fonts.css'
import { cssVar } from '${pkg.name}'

export const Panel = ({ children }: { children: React.ReactNode }) => (
  <section style={{
    background: cssVar('color-surface-raised'),
    padding: cssVar('space-4'),
  }}>
    {children}
  </section>
)` })}
    <p><code>cssVar()</code> only accepts names that exist, so a 1.x name such as <code>text</code> fails the type check. Apps that switch dark mode with a <code>.dark</code> class import <code>class/base.css</code> instead of <code>tokens.css</code>.</p>
  </section>

  <section class="doc-section" id="agents" aria-labelledby="agents-title">
    <h2 id="agents-title">Agents</h2>
    <p>Claude and Codex read the design system from <code>~/design-language</code>. filip-stack’s host config installs it there from a pinned package version.</p>
    ${command({ id: 'cmd-agents', label: 'Apply command', line: 'filip-stack apply' })}
    <dl class="defs">
      <dt><a href="DESIGN.md"><code>DESIGN.md</code></a></dt><dd>Selection rules and acceptance checks. Agents read it first.</dd>
      <dt><a href="components.md"><code>components.md</code></a></dt><dd>One spec per component: anatomy, tokens, states, and keyboard.</dd>
      <dt><a href="components.html"><code>components.html</code></a></dt><dd>Markup and styles to copy, in every state.</dd>
      <dt><a href="llms.txt"><code>llms.txt</code></a> and <a href="index.json"><code>index.json</code></a></dt><dd>A generated index of every component: its layer, purpose, spec, and implementations.</dd>
    </dl>
  </section>

  <section class="doc-section" id="package" aria-labelledby="package-title">
    <h2 id="package-title">What the package ships</h2>
    <p>Every path <code>${esc(pkg.name)}</code> ${esc(version)} exports.</p>
    <table class="paths exports stack" aria-labelledby="package-title">
      <thead><tr><th scope="col">Import</th><th scope="col">What it is for</th></tr></thead>
      <tbody>
        ${exportRows}
      </tbody>
    </table>
    <p class="note"><code>tokens.css</code> also sets base element styles today. A planned release moves them to an opt-in <code>base.css</code>.</p>
  </section>`

  const rail = {
    label: 'Overview',
    noun: 'a section',
    groups: [
      { id: 'start', label: 'Start', links: [{ href: '#choose', text: 'Choose your path', terms: 'install setup start' }] },
      { id: 'install', label: 'Install', links: PATHS.map((p) => ({ href: `#${p.id}`, text: p.name, terms: `${p.pkg} ${p.who} install setup` })) },
      { id: 'reference', label: 'Reference', links: [{ href: '#package', text: 'What the package ships', terms: 'exports files tokens.json fonts css' }] },
    ],
  }

  return { title: 'Design system', rail, main, css: OVERVIEW_CSS }
}

const OVERVIEW_CSS = `
  .title-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
  .doc-section { display: grid; gap: var(--space-4); padding-top: var(--space-6); border-top: 1px solid var(--color-border-subtle); }
  .doc-section > h2 { font: var(--weight-semibold) var(--text-xl) / var(--leading-tight) var(--font-mono); }
  .doc-section > h2::before { content: "## " / ""; color: var(--color-accent); }
  .doc-section > p { max-width: var(--measure); font-size: var(--text-reading); line-height: var(--leading); }
  .paths { width: 100%; border-collapse: collapse; font-size: var(--text-md); }
  .paths th, .paths td { padding: var(--space-3); border-bottom: 1px solid var(--color-border-subtle); text-align: left; vertical-align: top; }
  .paths :is(th, td):first-child { padding-inline-start: 0; }
  .paths thead th { color: var(--color-muted); font-size: var(--text-xs); font-weight: var(--weight-medium); }
  .paths tbody th { font-weight: var(--weight-medium); }
  .paths .who { display: block; color: var(--color-muted); font-size: var(--text-sm); font-weight: var(--weight-regular); }
  .paths code { font-size: var(--text-code); }
  .exports tbody th { font-weight: var(--weight-regular); }
  .defs { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--space-2) var(--space-6); margin: 0; }
  .defs dd { margin: 0; }
  @media (max-width: 640px) {
    .paths code { overflow-wrap: anywhere; }
    .defs { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .defs dd { margin-bottom: var(--space-3); }
  }
${stackedTablesCss('640px')}`
