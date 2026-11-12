// Components: the catalogue itself, read from language/components.html. index.json and llms.txt list
// the same components.
import { SITE_URL, between, esc } from './shell.mjs'

/**
 * Every component in the catalogue, in page order: its id, name, layer, purpose group (the rail
 * group it sits in), and one-line purpose.
 */
export const catalogueComponents = (template) => {
  const rail = between(template, '<nav class="rail-list" id="contents"', '<div class="find-empty"')
  const groupOf = new Map([...rail.matchAll(/<span class="group-label" id="rail-[\w-]+">([^<]+)<\/span>\n\s*([^\n]+)/g)]
    .flatMap(([, group, links]) => [...links.matchAll(/<a href="#([\w-]+)"/g)].map(([, id]) => [id, group])))
  const components = [...template.matchAll(/<section class="component" id="([\w-]+)" data-layer="(\w+)"[^>]*>\n {4}<header><h3 id="[\w-]+">([^<]+)<\/h3>.*\n {4}<p class="purpose">([^<]+)<\/p>/g)]
    .map(([, id, layer, name, purpose]) => ({ id, name: name.replace(/&amp;/g, '&'), layer, group: groupOf.get(id), purpose: purpose.replace(/&amp;/g, '&') }))
  const sections = template.split('<section class="component"').length - 1
  const ungrouped = components.filter(({ group }) => !group).map(({ id }) => id)
  if (components.length !== sections || ungrouped.length) throw new Error(`components.html: read ${components.length} of ${sections} components; no rail group for ${ungrouped.join(', ') || 'none'}`)
  return components
}

/**
 * Each component's Do and Don't lines from language/components.md, by section id. The lines carry no
 * links, so index.json holds them as written. Throws when a catalogue component has no line.
 */
export const specGuidance = ({ markdown, components }) => {
  const slug = (title) => title.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-')
  const sections = new Map(markdown.split(/^(?=#{2,3} )/m).filter((block) => block.startsWith('## '))
    .map((block) => [slug(block.match(/^## (.+)/)[1]), block]))
  const problems = []
  const guidance = new Map(components.map(({ id }) => {
    const section = sections.get(id) ?? ''
    const lines = { do: section.match(/^- \*\*Do\.\*\* (.+)$/m)?.[1], dont: section.match(/^- \*\*Don't\.\*\* (.+)$/m)?.[1] }
    for (const [key, line] of Object.entries(lines)) if (!line || line.includes('](')) problems.push(`${id}: ${key}`)
    return [id, lines]
  }))
  if (problems.length) throw new Error(`components.md: a Do or Don't line is missing or holds a link: ${problems.join(', ')}`)
  return guidance
}

/** site/index.json: one entry per component, for agents and tools. */
export const componentIndex = ({ components, guidance, pkg, version }) => ({
  name: pkg.name,
  version,
  site: SITE_URL,
  components: components.map(({ id, name, layer, group, purpose }) => ({
    id,
    name,
    layer,
    group,
    purpose,
    do: guidance.get(id).do,
    dont: guidance.get(id).dont,
    url: `${SITE_URL}components.html#${id}`,
    spec: `${SITE_URL}components.md#${id}`,
  })),
})

/** site/llms.txt: what the system is, how to install it, and where the specs and the index are. */
export const llmsTxt = ({ components, pkg, version }) => `# ${pkg.name}

> Filip's design language: tokens, component specs, and a component catalogue in plain CSS and HTML, for any framework. Version ${version}.

Install it with \`pnpm add ${pkg.name}\`, then import \`${pkg.name}/fonts.css\` and \`${pkg.name}/tokens.css\` before your own styles. \`cssVar()\` from the package gives typed \`var()\` references.

Read DESIGN.md first: it holds the selection rules and acceptance checks. Copy component markup and styles from components.html, and follow each component's spec in components.md.

## Docs

- [DESIGN.md](${SITE_URL}DESIGN.md): the design language, selection rules, and acceptance checks
- [components.md](${SITE_URL}components.md): one spec per component: anatomy, states, Do and Don't, keyboard, motion, and forced colors
- [decisions.md](${SITE_URL}decisions.md): why each decision was made, and the 2.0.0 token rename table
- [index.json](${SITE_URL}index.json): every component with its layer, purpose, Do and Don't lines, page, and spec

## Pages

- [Overview](${SITE_URL}): install paths for plain HTML, React, and agents, and the package exports
- [Foundations](${SITE_URL}foundations.html): every token with its light and dark value and its role
- [Components](${SITE_URL}components.html): every component in each state, with markup to copy
- [tokens.css](${SITE_URL}tokens.css): every token as a CSS variable, light and dark

## Components

${components.map(({ id, name, purpose }) => `- [${name}](${SITE_URL}components.html#${id}): ${purpose}`).join('\n')}
`
