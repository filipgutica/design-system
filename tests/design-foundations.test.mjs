import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { siteFiles } from '../scripts/build-site.mjs'

const dir = new URL('../language/', import.meta.url)
const read = (file) => readFileSync(new URL(file, dir), 'utf8')

test('the foundations catalogue shows every token that tokens.css defines', () => {
  const lightRoot = read('tokens.css').match(/^:root \{([\s\S]*?)^\}/m)[1]
  const tokens = [...lightRoot.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1])
  const page = read('reference.html')
  assert.ok(tokens.length > 0)
  const missing = tokens.filter((token) => !page.includes(`data-token="${token}"`))
  assert.deepEqual(missing, [])
})

test('the component catalogue has one section per component spec, in the same layer', () => {
  const slug = (title) => title.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-')
  const specs = [...read('components.md').matchAll(/^## (.+)\n\nLayer: (Core|Identity)\./gm)]
    .map(([, title, layer]) => ({ id: slug(title), layer }))
  const sections = [...read('components.html').matchAll(/<section class="component" id="([\w-]+)" data-layer="(Core|Identity)"/g)]
    .map(([, id, layer]) => ({ id, layer }))
  assert.ok(specs.length > 0)
  assert.deepEqual(sections, specs)
})

// Each control section declares the interactive states its spec defines in data-states, and the
// Control states table shows the same marks. The states its spec's States line names, normalized
// through these words, must equal the declared set: no state missing from either side.
// "on" counts only as a list item ("Off, on, focus-visible"), not as a preposition.
const stateWords = {
  hover: /\bhover/i,
  pressed: /\bpress/i,
  selected: /\b(?:selected|checked|current)\b|(?:^|, )on,/i,
  focus: /\bfocus/i,
  disabled: /\bdisabled\b/i,
  busy: /\bbusy\b/i,
  invalid: /\binvalid\b/i,
}
const declaredStates = (html) => [...html.matchAll(/<section class="component" id="([\w-]+)" data-layer="\w+" data-states="([^"]*)"/g)]
  .map(([, id, states]) => ({ id, states: states.split(' ') }))
const tableStates = (html) => {
  const columns = [...html.match(/<table class="coverage">[\s\S]*?<\/thead>/)[0].matchAll(/<th scope="col">([^<]+)<\/th>/g)].slice(1).map(([, name]) => name.toLowerCase())
  return [...html.matchAll(/<tr data-for="([\w-]+)">([\s\S]*?)<\/tr>/g)].map(([, id, row]) => ({
    id,
    states: [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].flatMap(([, cell], i) => (cell.includes('class="none"') ? [] : [columns[i]])),
  }))
}
const specStates = (md, id) => {
  const slug = (title) => title.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-')
  const section = md.split(/^(?=## )/m).find((block) => slug(block.match(/^## (.+)/)?.[1] ?? '') === id)
  const line = section?.match(/^- \*\*States\.\*\* (.+)$/m)?.[1] ?? ''
  return Object.keys(stateWords).filter((state) => stateWords[state].test(line))
}
// Lists "id: state (missing in the spec)" and "id: state (missing in the catalogue)".
const stateDrift = (html, md) => declaredStates(html).flatMap(({ id, states }) => {
  const spec = specStates(md, id)
  return [
    ...states.filter((state) => !spec.includes(state)).map((state) => `${id}: ${state} (missing in the spec)`),
    ...spec.filter((state) => !states.includes(state)).map((state) => `${id}: ${state} (missing in the catalogue)`),
  ]
})

test('the state-coverage guard catches a state missing from either the spec or the catalogue, and a table that drifts', () => {
  const html = read('components.html')
  const md = read('components.md')
  const extra = html.replace(/(id="slider" data-layer="Core" data-states=")([^"]*)"/, '$1$2 busy"')
  assert.deepEqual(stateDrift(extra, md), ['slider: busy (missing in the spec)'])
  assert.notDeepEqual(tableStates(extra), declaredStates(extra))
  const missing = html.replace(/(id="slider" data-layer="Core" data-states=")focus ([^"]*)"/, '$1$2"')
  assert.deepEqual(stateDrift(missing, md), ['slider: focus (missing in the catalogue)'])
  assert.deepEqual(specStates('## Switch\n\nLayer: Core.\n\n- **States.** Off, on, focus-visible, and disabled.\n', 'switch'), ['selected', 'focus', 'disabled'])
  assert.deepEqual(specStates('## Slider\n\nLayer: Core.\n\n- **States.** Rest, and focus-visible on the thumb.\n', 'slider'), ['focus'])
})

test('the Control states table matches each section’s data-states, and each matches its spec both ways', () => {
  const html = read('components.html')
  assert.ok(declaredStates(html).length >= 13)
  assert.deepEqual(tableStates(html), declaredStates(html))
  assert.deepEqual(stateDrift(html, read('components.md')), [])
})

// The Foundations swatch of the current row draws a navigation row, so it takes the row's corners, and
// the radius list names navigation rows under the token they use.
const radiusOf = (html, selector) => cssRules(html).find((rule) => rule.selector === selector)?.body.match(/border-radius: ([^;]+);/)?.[1]
const radiusUse = (html, token) => html.match(new RegExp(`data-token="${token}"><div class="spec-meta"><code>${token}</code><span class="value"></span><span class="use">([^<]+)<`))?.[1] ?? ''

test('the Foundations current-row swatch and radius list follow the navigation row radius', () => {
  const row = radiusOf(read('components.html'), '.navlist a')
  assert.equal(row, 'var(--radius-inline)')
  const reference = read('reference.html')
  assert.equal(radiusOf(reference, '.nav-current-sample'), row)
  assert.match(radiusUse(reference, '--radius-inline'), /navigation rows/)
  assert.doesNotMatch(radiusUse(reference, '--radius-field'), /navigation rows|tabs/)
})

// A page writes a corner from tokens: 0, 50%, inherit, var() references, or a calc() of them.
const isRadiusAllowed = (value) => value.replace(/var\(--[\w-]+\)/g, ' ').replace(/calc\(|\)|[-+*/]/g, ' ').trim().split(/\s+/)
  .every((part) => ['', '0', '50%', 'inherit'].includes(part))
const radiusLiterals = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (property, value) => /^border(?:-[\w-]+)?-radius$/.test(property) && !isRadiusAllowed(value.replace(/\s*!important$/, '')),
})

// Engine pseudo-elements that computed styles cannot reach keep their role here: the slider track and
// fill are state marks, the thumb is round, and the select picker is a floating layer. Every rule that
// sets a corner on one, in any context, sets border-radius to this value.
const engineShapes = {
  '::-webkit-slider-runnable-track': 'var(--radius-pill)',
  '::-moz-range-track': 'var(--radius-pill)',
  '::-moz-range-progress': 'var(--radius-pill)',
  '::-webkit-slider-thumb': '50%',
  '::-moz-range-thumb': '50%',
  '::picker(select)': 'var(--radius-panel)',
}
const engineShapeDrift = (html) => {
  const corners = perSelector(cssRules(html)).flatMap(({ context, selector, body }) => {
    // The rule's target is its last pseudo-element; a trailing state such as :hover still targets it.
    const target = [...selector.matchAll(/::[\w-]+(?:\([^)]*\))?/g)].at(-1)?.[0]
    const pseudo = Object.keys(engineShapes).find((name) => name === target)
    return pseudo ? body.split(';').map((declaration) => declaration.trim().match(/^(border(?:-[\w-]+)?-radius)\s*:\s*(.+)$/)).filter(Boolean)
      .map(([, property, value]) => ({ pseudo, ok: property === 'border-radius' && value.replace(/\s*!important$/, '') === engineShapes[pseudo], line: `${`${context} ${selector}`.trim()} { ${property}: ${value} }` })) : []
  })
  return [...corners.filter(({ ok }) => !ok).map(({ line }) => line), ...Object.keys(engineShapes).filter((name) => !corners.some(({ pseudo }) => pseudo === name)).map((name) => `${name}: no radius`)]
}

test('the engine shape guard catches a slider track or picker off its role, in any context or longhand', () => {
  const html = read('components.html')
  assert.deepEqual(engineShapeDrift(`${html}<style>@media (prefers-color-scheme: dark) { .range::-webkit-slider-runnable-track{border-radius:0} }
    .select::picker(select) { border-top-left-radius: var(--radius-panel) } .select::picker(select):popover-open { border-radius: var(--radius-field) }
    .range::-webkit-slider-thumb:hover { border-radius: 0 } .range::-moz-range-track { border-radius: var(--radius-pill) !important }
    .select::picker(select)::backdrop { border-radius: 0 } .select::picker(select)::-webkit-scrollbar-thumb { border-radius: var(--radius-pill) }</style>`), [
    '@media (prefers-color-scheme: dark) .range::-webkit-slider-runnable-track { border-radius: 0 }',
    '.select::picker(select) { border-top-left-radius: var(--radius-panel) }',
    '.select::picker(select):popover-open { border-radius: var(--radius-field) }',
    '.range::-webkit-slider-thumb:hover { border-radius: 0 }',
  ])
  assert.deepEqual(engineShapeDrift(html.replace('.range::-moz-range-thumb { width: 14px; height: 14px; border: 2px solid var(--color-accent); border-radius: 50%;', '.range::-moz-range-thumb { width: 14px; height: 14px; border: 2px solid var(--color-accent);')), ['::-moz-range-thumb: no radius'])
})

test('the slider track, slider thumb, and select picker take their role’s corners', () => {
  assert.deepEqual(engineShapeDrift(read('components.html')), [])
})

test('the radius guard catches a literal corner in a rule, an inline style, a longhand, and a calc()', () => {
  const planted = `<style>.a{border-radius:12px} .b { border-top-left-radius: 4px } .c { border-radius: calc(var(--radius-panel) - 4px) }
    .d { border-radius: var(--radius-panel) var(--radius-panel) 0 0 } .e { border-radius: calc(var(--radius-panel) - var(--space-1)) }</style>
    <i style="border-radius: 3px"></i><i style="border-radius: 50%"></i>`
  assert.deepEqual(radiusLiterals('planted.html', planted).map((line) => line.split(' { ')[0]), ['planted.html: .a', 'planted.html: .b', 'planted.html: .c', 'planted.html: [style]'])
})

test('no page or the report stylesheet writes a literal corner radius', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  const sources = [...pages.map((page) => [page, read(page)]), ['visualizations/report.css', `<style>${read('visualizations/report.css')}</style>`]]
  assert.deepEqual(sources.flatMap(([file, html]) => radiusLiterals(file, html)), [])
})

// Flattens a page's <style> into rules, each with its @media or @supports context.
const cssRules = (html) => {
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, block]) => block).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  const squash = (text) => text.replace(/\s+/g, ' ').trim()
  const rules = []
  const context = []
  let start = 0
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      const prelude = squash(css.slice(start, i))
      if (prelude.startsWith('@')) {
        context.push(prelude)
        start = i + 1
        continue
      }
      const end = css.indexOf('}', i)
      rules.push({ context: context.join(' '), selector: prelude, body: squash(css.slice(i + 1, end)) })
      i = end
      start = end + 1
    } else if (css[i] === '}') {
      context.pop()
      start = i + 1
    }
  }
  return rules
}

// Splits a selector list on its top-level commas.
const selectors = (list) => {
  const parts = []
  let depth = 0
  let part = ''
  for (const char of list) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(part.trim())
      part = ''
    } else part += char
  }
  return [...parts, part.trim()]
}

// A page that copies a shared control copies the catalogue's rule unchanged. Each selector is
// checked on its own, with its @media context, so a list that mixes in page selectors cannot hide a
// drifted control rule. Focus selectors are left out: each page lists its own controls in one focus
// rule, by role. Each family names the pages that must copy it; any other page that copies it is
// checked too.
const families = [
  { name: 'button and quiet action', pattern: /^(?:a)?\.btn\b|^\.quiet-action\b|^:where\(\.quiet-action\)/, pages: ['reference.html', 'docs.html', 'product.html'] },
  { name: 'segmented control', pattern: /^\.segmented\b/, pages: ['reference.html'] },
  { name: 'tabs', pattern: /^\.tab(?:list)?\b/, pages: ['reference.html'] },
  { name: 'navigation row', pattern: /^\.navlist\b/, pages: ['docs.html', 'reference.html'] },
  { name: 'rail current section', pattern: /^:is\(\.rail, \.rail-specimen\)/, pages: ['docs.html'] },
  { name: 'checkbox and radio', pattern: /^\.check\b/, pages: ['reference.html'] },
  { name: 'badge', pattern: /^\.badge\b/, pages: ['reference.html'] },
  { name: 'alert', pattern: /^\.alert\b/, pages: ['reference.html'] },
  { name: 'code block and command plate', pattern: /^\.code\b/, pages: ['reference.html'] },
]
const perSelector = (rules) =>
  rules.flatMap(({ context, selector, body }) => selectors(selector).map((part) => ({ context, selector: part, list: selector, body })))
const key = ({ context, selector, body }) => `${context} ${selector} { ${body} }`.trim()

// Page sizing rules that touch a shared control on purpose: touch targets grow at tablet width,
// including the sized buttons and segmented controls that the catalogue keeps at their size.
const sizingExemptions = [
  { page: 'reference.html', context: '@media (max-width: 800px)', selector: '.btn[data-size]', body: 'min-height: var(--control-lg); min-width: var(--control-lg);' },
  { page: 'reference.html', context: '@media (max-width: 800px)', selector: '.segmented button', body: 'min-height: var(--control-lg); min-width: var(--control-lg);' },
]

test('example pages copy the catalogue rules for the shared controls and components they use unchanged', () => {
  const catalogue = new Set(perSelector(cssRules(read('components.html'))).map(key))
  const exempt = new Set(sizingExemptions.map(({ page, ...rule }) => `${page} ${key(rule)}`))
  for (const page of ['reference.html', 'docs.html', 'product.html']) {
    const rules = perSelector(cssRules(read(page))).filter(({ selector }) => !selector.includes(':focus-visible'))
    for (const { name, pattern, pages } of families) {
      const copied = rules.filter(({ selector }) => pattern.test(selector))
      if (pages.includes(page)) assert.ok(copied.length > 0, `${page} has no ${name} rules`)
      const drifted = copied
        .filter((rule) => !catalogue.has(key(rule)) && !exempt.has(`${page} ${key(rule)}`))
        .map((rule) => `${key(rule)}${rule.list === rule.selector ? '' : `  (from the list "${rule.list}")`}`)
      assert.deepEqual(drifted, [], `${page} ${name} selectors that differ from components.html`)
    }
  }
})

// The copy guard above checks the rules a page has, so it passes when a page drops a whole state rule.
// Each entry here names a component variant by the classes its markup uses (none of the classes in
// "without"), and the catalogue state rules that variant needs, so a page that uses it must copy them.
const pressed = ':is(:active, [aria-pressed="true"], .is-active):not(:disabled)'
const stateNeeds = [
  { classes: ['btn'], states: ['@media (hover: hover) .btn:hover:not(:disabled)', `.btn:not(.text)${pressed}`] },
  { classes: ['btn'], without: ['secondary', 'ghost', 'danger', 'text'], states: [`.btn:not(.secondary, .ghost, .danger, .text)${pressed}`] },
  { classes: ['btn', 'secondary'], states: ['@media (hover: hover) .btn.secondary:hover:not(:disabled)', `.btn:is(.secondary, .ghost)${pressed}`] },
  { classes: ['btn', 'ghost'], states: ['@media (hover: hover) .btn.ghost:hover:not(:disabled)', `.btn:is(.secondary, .ghost)${pressed}`] },
  { classes: ['btn', 'danger'], states: ['@media (hover: hover) .btn.danger:hover:not(:disabled)', `.btn.danger${pressed}`] },
  { classes: ['quiet-action'], states: ['@media (hover: hover) .quiet-action:hover:where(:not(:disabled))', '.quiet-action:is(:active, .is-active):where(:not(:disabled))'] },
  {
    classes: ['segmented'],
    states: [
      '@media (hover: hover) .segmented button:hover:not(:disabled, [aria-pressed="true"])',
      '.segmented button[aria-pressed="true"]',
      '.segmented button[aria-pressed="true"]::before',
      '@media (forced-colors: active) .segmented button[aria-pressed="true"]',
      '@media (forced-colors: active) .segmented button[aria-pressed="true"]::before',
    ],
  },
  {
    classes: ['tab'],
    states: [
      '@media (hover: hover) .tab:hover:where(:not(:disabled))',
      '.tab[aria-selected="true"]',
      '.tab[aria-selected="true"]::before',
      '@media (forced-colors: active) .tab[aria-selected="true"]',
      '@media (forced-colors: active) .tab[aria-selected="true"]::before',
    ],
  },
  {
    classes: ['navlist'],
    states: [
      '@media (hover: hover) .navlist a:hover', '.navlist a[aria-current="page"]', '@media (forced-colors: active) .navlist a[aria-current="page"]',
      '@supports (text-box: trim-both cap alphabetic) .navlist a:not(:has(> *))',
      '@supports (text-box: trim-both cap alphabetic) .navlist a:not(:has(> *))[aria-current="location"]::before',
    ],
  },
  {
    classes: ['rail'],
    states: [
      ':is(.rail, .rail-specimen) a[aria-current="location"]',
      ':is(.rail, .rail-specimen) a[aria-current="location"]::before',
      '@media (forced-colors: active) :is(.rail, .rail-specimen) a[aria-current="location"]',
    ],
  },
]
const missingStates = (page, html) => {
  const used = [...html.matchAll(/\bclass="([^"]*)"/g)].map(([, list]) => new Set(list.split(/\s+/)))
  const have = new Set(perSelector(cssRules(html)).map(({ context, selector }) => `${context} ${selector}`.trim()))
  return stateNeeds
    .filter(({ classes, without = [] }) => used.some((set) => classes.every((c) => set.has(c)) && !without.some((c) => set.has(c))))
    .flatMap(({ states }) => states.filter((state) => !have.has(state)).map((state) => `${page}: ${state}`))
}

test('every state rule the guard requires exists in the catalogue', () => {
  const catalogue = new Set(perSelector(cssRules(read('components.html'))).map(({ context, selector }) => `${context} ${selector}`.trim()))
  assert.deepEqual(stateNeeds.flatMap(({ states }) => states).filter((state) => !catalogue.has(state)), [])
})

test('the state guard catches a page that drops a whole state rule', () => {
  const page = read('reference.html')
  // Each line is one rule in reference.html, removed on its own.
  const drops = [
    { line: /^\s*\.btn:not\(\.text\):is\(:active[^\n]*\n/m, missing: `.btn:not(.text)${pressed}` },
    { line: /^\s*\.segmented button\[aria-pressed="true"\]::before \{ z-index[^\n]*\n/m, missing: '.segmented button[aria-pressed="true"]::before' },
    {
      line: /^\s*\.segmented button\[aria-pressed="true"\]::before \{ forced-color-adjust[^\n]*\n/m,
      missing: '@media (forced-colors: active) .segmented button[aria-pressed="true"]::before',
    },
  ]
  for (const { line, missing } of drops) {
    assert.deepEqual(missingStates('reference.html', page.replace(page.match(line)[0], '')), [`reference.html: ${missing}`])
  }
})

test('the state guard catches a rail page that drops the current-section recipe', () => {
  const page = read('docs.html')
  const line = page.match(/^:is\(\.rail, \.rail-specimen\) a\[aria-current="location"\] \{ background[^\n]*\n/m)[0]
  assert.deepEqual(missingStates('docs.html', page.replace(line, '')), ['docs.html: :is(.rail, .rail-specimen) a[aria-current="location"]'])
})

test('example pages copy the state rules of every component variant their markup uses', () => {
  assert.deepEqual(['reference.html', 'docs.html', 'product.html'].flatMap((page) => missingStates(page, read(page))), [])
})

// At tablet width touch targets use --control-lg (components.md, rules for every control). A page that
// shows a search field or an unsized button grows it there, as the catalogue does.
const touchNeeds = [
  { uses: /\bclass="(?:[^"]* )?search(?: [^"]*)?"/, rule: '@media (max-width: 800px) .search { height: var(--control-lg); }' },
  { uses: /<(?![^>]*\bdata-size=)[^>]*\bclass="(?:[^"]* )?btn(?: [^"]*)?"/, rule: '@media (max-width: 800px) .btn:not([data-size]) { min-height: var(--control-lg); }' },
]
const missingTouch = (page, html) => {
  const have = new Set(perSelector(cssRules(html)).map(key))
  return touchNeeds.filter(({ uses, rule }) => uses.test(html) && !have.has(rule)).map(({ rule }) => `${page}: ${rule}`)
}

test('the touch guard catches a page that keeps a search field or an unsized button small at tablet width', () => {
  const catalogue = read('components.html').replace(/^\s*\.search \{ height: var\(--control-lg\); \}\n/m, '')
  assert.deepEqual(missingTouch('components.html', catalogue), [`components.html: ${touchNeeds[0].rule}`])
  const page = read('reference.html').replace(/^\s*\.btn:not\(\[data-size\]\), \.navlist a[^\n]*\n/m, '')
  assert.deepEqual(missingTouch('reference.html', page), [`reference.html: ${touchNeeds[1].rule}`])
})

test('search fields and unsized buttons use --control-lg at tablet width on every page', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => missingTouch(page, read(page))), [])
})

// Viewport media queries use only the two named breakpoints, the desktop-only query, and the
// documented hero split (DESIGN.md, layout and spacing). Container queries are not viewport breakpoints.
const allowedWidths = new Set(['max-width: 640px', 'max-width: 800px', 'min-width: 801px', 'min-width: 1024px'])
const offBreakpoints = (file, css) => [...css.matchAll(/@media\b([^{]*)\{/g)]
  .flatMap(([, query]) => [...query.matchAll(/\((min|max)-width\s*:\s*([^)]+?)\s*\)/g)])
  .map(([, edge, width]) => `${edge}-width: ${width}`)
  .filter((width) => !allowedWidths.has(width))
  .map((width) => `${file}: ${width}`)

test('the breakpoint guard catches an unnamed viewport breakpoint in spaced or minified CSS', () => {
  const planted = '@media(max-width:700px){} @media (max-width: 560px) {} @media (min-width: 801px) {} @media(max-width:800px){} @container (max-width: 876px) {}'
  assert.deepEqual(offBreakpoints('planted.css', planted), ['planted.css: max-width: 700px', 'planted.css: max-width: 560px'])
})

test('pages and the report stylesheet use only the named breakpoints', () => {
  const files = [...readdirSync(dir).filter((file) => file.endsWith('.html')), 'visualizations/report.css']
  assert.deepEqual(files.flatMap((file) => offBreakpoints(file, read(file))), [])
})

// Depth lives in tokens.css. A page's shadow is none, a tokens.css variable, or a zero-blur line in a
// token colour: a focus ring or a divider. --depth passes because the guard checks
// each place a page sets it. Custom properties named like a shadow are checked too, so a page cannot
// hide a literal behind its own variable.
const tokenNames = new Set([...read('tokens.css').matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1]))
const isToken = (reference) => reference === '--depth' || tokenNames.has(reference)
const isShadowLayerAllowed = (layer) => {
  const match = layer.match(/^(?:inset )?(?:-?[\d.]+(?:px)? -?[\d.]+(?:px)?(?: 0(?:px)?(?: -?[\d.]+(?:px)?)?)? )?var\((--[\w-]+)\)$/)
  return Boolean(match) && isToken(match[1])
}
const isShadowAllowed = (value) => value === 'none' || selectors(value).every(isShadowLayerAllowed)

// Lists each declaration in a page's style blocks and inline styles that isViolation flags, as
// "file: selector { declaration }".
const flaggedDeclarations = ({ file, html, isViolation }) => {
  const inline = [...html.matchAll(/\bstyle=(["'])([\s\S]*?)\1/g)].map(([, , body]) => ({ context: '', selector: '[style]', body }))
  return [...cssRules(html), ...inline].flatMap(({ context, selector, body }) =>
    body.split(';').map((declaration) => declaration.trim()).filter(Boolean)
      .map((declaration) => declaration.match(/^([\w-]+)\s*:\s*(.+)$/))
      .filter((match) => match && isViolation(match[1], match[2], context))
      .map(([declaration]) => `${file}: ${`${context} ${selector}`.trim()} { ${declaration} }`))
}

const shadowLiterals = (page, html) => flaggedDeclarations({
  file: page,
  html,
  isViolation: (property, value) => /^(?:box-shadow|--depth|--[\w-]*shadow[\w-]*)$/.test(property) && !isShadowAllowed(value.replace(/\s*!important$/, '')),
})

test('the depth guard reads every style block and both inline quote forms', () => {
  const planted = `<style>.a { box-shadow: var(--shadow-raise) }</style><style media="all">.b { box-shadow: 0 4px 12px black }</style>
    <p style='box-shadow: 0 4px 12px black'></p><p style="box-shadow: none"></p>`
  assert.equal(shadowLiterals('planted.html', planted).length, 2)
})

test('pages take depth from tokens.css: no literal shadow outside a focus ring or divider', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.ok(pages.includes('components.html') && pages.includes('reference.html'))
  assert.deepEqual(pages.flatMap((page) => shadowLiterals(page, read(page))), [])
})

// Focus is one accent ring for every role, written from tokens. An outline that draws is
// var(--focus-width) solid var(--color-focus), offset var(--focus-offset) or inset by the width. An
// outline-color is var(--color-focus) or CanvasText (for forced colors). --color-focus is the accent, or the
// dark-theme accent on a dark plate. In forced colors a focused field, which has no ring elsewhere,
// draws a Highlight outline 1px inside its edge. A per-role ring colour, set directly or by redefining
// --color-focus, and a hand-written width or offset fail.
const focusRules = [
  { property: /^outline$/, allowed: (value, forced) => /^(?:none|0)$/.test(value) || value === 'var(--focus-width) solid var(--color-focus)' || (forced && value === 'var(--focus-width) solid Highlight') },
  { property: /^outline-color$/, allowed: (value) => value === 'var(--color-focus)' || value === 'CanvasText' },
  { property: /^outline-offset$/, allowed: (value, forced) => ['var(--focus-offset)', 'calc(var(--focus-width) * -1)'].includes(value) || (forced && value === '-1px') },
  { property: /^--color-focus$/, allowed: (value) => value === 'var(--color-accent)' || value === 'var(--color-project-dark)' },
]
const focusColourDrift = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (name, value, context) => focusRules.some(({ property, allowed }) => property.test(name) && !allowed(value, context.includes('forced-colors: active'))),
})

test('the focus guard catches a per-role ring colour or a hand-written ring, set directly or through --color-focus', () => {
  const planted = `<style>.btn:focus-visible { outline: var(--focus-width) solid var(--color-accent) } .tab { outline-color: var(--color-link) }
    .btn.danger { --color-focus: var(--color-error) } .old { outline: 2px solid var(--color-focus); outline-offset: 2px }
    .ok { outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset); outline-color: CanvasText } .off { outline: none }
    .inset { outline-offset: calc(var(--focus-width) * -1) } .plate { --color-focus: var(--color-project-dark) }
    .field:focus-visible { outline: var(--focus-width) solid Highlight; outline-offset: -1px }
    @media (forced-colors: active) { .field:focus-visible { outline: var(--focus-width) solid Highlight; outline-offset: -1px } }</style>
    <p style="--color-focus: var(--color-text)"></p>`
  assert.equal(focusColourDrift('planted.html', planted).length, 8)
})

test('every focus ring is the one accent ring: no per-role ring colour or hand-written ring on any page or in tokens.css', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  const sources = [...pages.map((page) => [page, read(page)]), ['tokens.css', `<style>${read('tokens.css')}</style>`]]
  assert.deepEqual(sources.flatMap(([file, html]) => focusColourDrift(file, html)), [])
})

test('keeps the page background and text colour outside the base layer, so a host reset cannot win', () => {
  // A host's unlayered body reset outranks any layered rule, so these two must stay unlayered.
  const unlayered = read('tokens.css').replace(/@layer base \{[\s\S]*$/, '')
  assert.match(unlayered, /^body \{ background: var\(--color-bg\); color: var\(--color-text\); \}$/m)
})

// Type, spacing, and control sizes are rem, so text and controls follow the reader's font-size
// setting: font sizes, padding, gaps, and line heights. Hairlines, focus rings, shadows, and
// breakpoints stay px and are not checked here.
// A border width taken off a token, as in calc(var(--space-2) - 2px), stays px: it matches a 1px or 2px edge.
const remProperty = /^(?:font-size|font|line-height|padding(?:-[\w-]+)?|gap|row-gap|column-gap|--text-[\w-]+|--space-[\w-]+|--control-[\w-]+|--row)$/
const borderOffset = /calc\(var\(--[\w-]+\) - \d+px\)/g
const pxSizes = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (property, value) => remProperty.test(property) && /\d(?:\.\d+)?px\b/.test(value.replace(borderOffset, '')),
})

test('the rem guard catches a px font size, font shorthand, size token, padding, gap, or line height', () => {
  const planted = `<style>.a { font-size: 18px } .b { font: 600 12px / 1.2 var(--font-ui) } :root { --space-9: 6px; --row: 36px }
    .c { padding: 2px } .d { gap: 2px var(--space-3) } .e { line-height: 18px } .f { padding-inline: 9px; row-gap: 3px }
    .ok { font-size: 1.125rem; font: inherit; border: 1px solid; box-shadow: 0 1px 2px black; --shadow-x: 0 1px 2px black; width: 16px }
    .border-offset { padding: calc(var(--space-2) - 2px) calc(var(--space-3) - 2px); gap: 0.125rem }</style>
    <p style="font-size: 14px"></p><p style="font-size: var(--text-sm)"></p>`
  assert.equal(pxSizes('planted.html', planted).length, 10)
})

test('type, spacing, and control sizes are rem on every page, in tokens.css, and in the report stylesheet', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  const sources = [
    ...pages.map((page) => [page, read(page)]),
    ...['tokens.css', 'visualizations/report.css'].map((file) => [file, `<style>${read(file)}</style>`]),
  ]
  assert.deepEqual(sources.flatMap(([file, html]) => pxSizes(file, html)), [])
})

// A selected list row takes the navigation row's current recipe. An inset accent bar curves away on a
// rounded row, so no page draws one.
const selectionBars = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (property, value) => property === 'box-shadow' && /\binset [1-9][\d.]*px 0 0\b/.test(value),
})

test('the selection-bar guard catches an inset leading-edge bar', () => {
  const planted = `<style>.row[aria-selected="true"] { box-shadow: inset 2px 0 0 var(--color-accent) }
    .ok { box-shadow: var(--shadow-nav-current) } .ring { box-shadow: 0 0 0 1px var(--color-border-subtle) }</style>`
  assert.equal(selectionBars('planted.html', planted).length, 1)
})

test('no page marks a selected row with an inset accent bar', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => selectionBars(page, read(page))), [])
})

// Colour comes from tokens.css. A page or the report stylesheet writes no hex, colour function, or named
// colour; transparent and currentColor are allowed, and system colours only inside a forced-colors block.
// A mask uses only the alpha of its image, so the black in a mask's gradient or SVG is never drawn and is
// skipped.
const namedColours = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
  burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue
  darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
  forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory
  khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
  lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
  limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
  mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
  olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
  powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke
  yellow yellowgreen`.split(/\s+/)
const systemColours = `Canvas CanvasText LinkText VisitedText ActiveText ButtonFace ButtonText ButtonBorder Field FieldText
  Highlight HighlightText SelectedItem SelectedItemText Mark MarkText GrayText AccentColor AccentColorText`.split(/\s+/)
const word = (names) => new RegExp(`(?<![\\w-])(?:${names.join('|')})(?![\\w-])`, 'i')
const rawColourPatterns = [/#[\da-f]{3,8}(?![\w-])/i, /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i, word(namedColours)]
// A rule is in forced colors when one of its @media queries needs forced-colors: active. mandatory()
// reads the media-condition grammar: every comma branch must need the feature; in an and chain one
// operand must; in an or chain every operand must; not never does; a parenthesised group is read inside;
// a single feature is matched by the feature's pattern. Empty or unbalanced input needs nothing.
const forcedColorsActive = /^\(\s*forced-colors\s*:\s*active\s*\)$/
// Splits a condition on whitespace outside parentheses; null when the parentheses do not balance.
const topLevelParts = (condition) => {
  const parts = []
  let depth = 0
  let part = ''
  for (const char of condition.trim()) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (depth < 0) return null
    if (depth === 0 && /\s/.test(char)) {
      if (part) parts.push(part)
      part = ''
    } else part += char
  }
  if (depth !== 0) return null
  return part ? [...parts, part] : parts
}
const mandatory = (condition, feature) => {
  const branches = selectors(condition)
  if (branches.length > 1) return branches.every((branch) => mandatory(branch, feature))
  let parts = topLevelParts(condition)
  if (!parts?.length) return false
  if (/^only$/i.test(parts[0])) parts = parts.slice(1)
  if (/^not$/i.test(parts[0])) return false
  if (parts.length === 1) {
    const [only] = parts
    if (feature.test(only)) return true
    const inner = /^\(.*\)$/.test(only) ? only.slice(1, -1).trim() : ''
    return /^(?:\(|not\s)/i.test(inner) && mandatory(inner, feature)
  }
  const operands = parts.filter((_, i) => i % 2 === 0)
  const operators = new Set(parts.filter((_, i) => i % 2 === 1).map((word) => word.toLowerCase()))
  // An operand is a parenthesised group or a media type; anything else makes the query unreadable.
  const valid = operands.every((operand) => /^\(.*\)$/.test(operand) || /^(?:all|screen|print)$/.test(operand))
  if (parts.length % 2 === 0 || operators.size !== 1 || !valid) return false
  if (operators.has('and')) return operands.some((operand) => mandatory(operand, feature))
  if (operators.has('or')) return operands.every((operand) => mandatory(operand, feature))
  return false
}
// Lowercase, and space every parenthesis, so (hover:hover)and (pointer:fine) splits like the spaced form.
const normalise = (condition) => condition.toLowerCase().replace(/[()]/g, ' $& ').replace(/\s+/g, ' ').trim()
const requiredIn = (feature, context) => context.split(/(?=@)/).some((rule) => rule.startsWith('@media') && mandatory(normalise(rule.slice('@media'.length)), feature))
const inForcedColors = (context) => requiredIn(forcedColorsActive, context)
const isRawColour = (value, forced = false) => rawColourPatterns.some((pattern) => pattern.test(value)) || (!forced && word(systemColours).test(value))
// SVG colour attributes in markup, outside scripts and style blocks; currentColor, none, and url() refs pass.
const svgColourAttributes = (file, html) => [...html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/g, '')
  .matchAll(/\s(fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*(?:(["'])(.*?)\2|([^\s"'>]+))/g)]
  .map(([, name, , quoted, bare]) => [name, quoted ?? bare]).filter(([, value]) => isRawColour(value)).map(([name, value]) => `${file}: ${name}="${value}"`)
const rawColours = (file, html) => [...flaggedDeclarations({
  file,
  html,
  isViolation: (property, value, context) => !/^(?:-webkit-)?mask(?:-image)?$/.test(property) && isRawColour(value, inForcedColors(context)),
}), ...svgColourAttributes(file, html)]

test('the raw-colour guard catches hex, colour functions, named colours, SVG colour attributes, and a system colour outside forced colors', () => {
  const planted = `<style>.a { color: #fff } .b { background: rgb(0 0 0 / 40%) } .c { border-color: oklch(70% 0.1 250) }
    .d { color: White } .e { outline-color: Highlight } .f { background-image: url("data:image/svg+xml,<svg fill='red'/>") }
    .g { color: var(--color-text); background: transparent; border-color: currentColor } .h { animation-name: glide-left }
    .i { mask: url("data:image/svg+xml,<svg stroke='black'/>") } .l { mask-image: linear-gradient(#000, transparent) } .j { color: color-mix(in srgb, var(--color-text) 8%, transparent) }
    @media (forced-colors: active) { .k { outline-color: Highlight } } @media (forced-colors: none) { .m { color: CanvasText } }
    @media not (forced-colors: active) { .n { color: CanvasText } } @media (forced-colors: active), (min-width: 801px) { .o { color: CanvasText } }
    @media (forced-colors: active) and (prefers-color-scheme: dark), (forced-colors: active) { .q { color: CanvasText } }
    @media ((forced-colors: active) or (min-width: 801px)) { .r { color: CanvasText } }
    @media (forced-colors: active) and (not (prefers-color-scheme: dark)) { .s { color: CanvasText } }
    @media (forced-colors: active) and ((min-width: 801px) or (prefers-color-scheme: dark)) { .t { color: CanvasText } }
    @media (forced-colors:active)and (prefers-color-scheme:dark) { .u { color: CanvasText } }</style><p style="color: navy"></p>
    <svg><path stroke="#ff0000" fill="none"/><path fill='currentColor' stroke="url(#g)"/><stop stop-color="white"/><path fill = "#ff0000"/><path fill=red /></svg>`
  assert.deepEqual(rawColours('planted.html', planted).map((line) => line.split(' { ')[0]), [
    'planted.html: .a', 'planted.html: .b', 'planted.html: .c', 'planted.html: .d', 'planted.html: .e', 'planted.html: .f',
    'planted.html: @media (forced-colors: none) .m', 'planted.html: @media not (forced-colors: active) .n',
    'planted.html: @media (forced-colors: active), (min-width: 801px) .o', 'planted.html: @media ((forced-colors: active) or (min-width: 801px)) .r',
    'planted.html: [style]',
    'planted.html: stroke="#ff0000"', 'planted.html: stop-color="white"', 'planted.html: fill="#ff0000"', 'planted.html: fill="red"',
  ])
})

test('no page or the report stylesheet writes a raw colour outside tokens.css', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  const sources = [...pages.map((page) => [page, read(page)]), ['visualizations/report.css', `<style>${read('visualizations/report.css')}</style>`]]
  assert.deepEqual(sources.flatMap(([file, html]) => rawColours(file, html)), [])
})

// Hover is feedback that a control will act, so no hover rule reaches a disabled control. A hover rule
// whose subject is a native control (button, input, select, option, textarea), or a class the page puts
// on one, excludes :disabled in that compound: :where(:not(:disabled)) adds no specificity, so the rule
// still loses to the selected state it lost to before. A label owns the control inside it, as a radio
// card does, so a hover rule on a label's class excludes a disabled descendant with :not(:has(…:disabled)),
// or requires an enabled one with :has(…:enabled).
// Composite owners in this language are labels; a new kind of owner needs a line here.
const disableable = /^(?:button|input|select|option|textarea)$/
// State classes such as .is-hover only show a state in a specimen, so they do not mark a control.
const classesOn = (html, tags) => new Set([...html.matchAll(new RegExp(`<(?:${tags})\\b[^>]*\\bclass="([^"]*)"`, 'g'))]
  .flatMap(([, list]) => list.split(/\s+/)).filter((name) => !name.startsWith('is-')))
const hoverOnDisabled = (file, html) => {
  const controls = classesOn(html, 'button|input|select|textarea')
  const owners = classesOn(html, 'label')
  return perSelector(cssRules(html)).filter(({ selector }) => {
    const compound = selector.split(/\s+(?![^(]*\))|\s*[>+~]\s*(?![^(]*\))/).find((part) => /:hover\b/.test(part))
    if (!compound) return false
    const names = [...compound.matchAll(/\.([\w-]+)/g)].map(([, name]) => name)
    if (disableable.test(compound.match(/^[a-z]+/)?.[0] ?? '') || names.some((name) => controls.has(name))) return !/:enabled\b|:not\(.*:disabled/.test(compound)
    return names.some((name) => owners.has(name)) && !/:not\(:has\([^)]*:disabled|:has\([^)]*:enabled/.test(compound)
  }).map(({ context, selector }) => `${file}: ${`${context} ${selector}`.trim()}`)
}

test('the hover guard catches a hover rule that reaches a disabled button, input, option, or labelled control', () => {
  const planted = `<style>.chip:hover { color: red } .copy:is(:hover, .is-hover) { color: red } .select option:hover { color: red }
    .tab:is(:hover, .is-hover):where(:not(:disabled)) { color: red } .btn:hover:not(:disabled, [aria-pressed="true"]) { color: red }
    .radio-card:hover:not(:has(input:disabled)) { color: red } .navlist a:hover { color: red }
    .check:hover:not(:has(input:checked)) { color: red } .radio-card:has(input:enabled):hover { color: red } .check:has(:enabled):hover { color: red }</style>
    <button class="copy quiet-action"></button><button class="tab"></button><button class="btn"></button>
    <label class="radio-card"><input type="radio"></label><label class="check"><input type="checkbox"></label>`
  assert.deepEqual(hoverOnDisabled('planted.html', planted), ['planted.html: .copy:is(:hover, .is-hover)', 'planted.html: .select option:hover', 'planted.html: .check:hover:not(:has(input:checked))'])
})

test('no hover rule on any page reaches a disabled control', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => hoverOnDisabled(page, read(page))), [])
})

// A touch screen keeps :hover on the last element tapped, so a hover fill would stay behind after a
// tap. Every :hover rule that paints (a background, shadow, border, outline, or text colour, or a custom
// property, which a painting declaration such as box-shadow: var(--depth) can read) sits in an
// @media query that needs (hover: hover) in every comma branch, the same way forced colors is read above.
// The scan covers the language pages and the generated site pages. An exception names its page and
// selector, with the reason it may stick.
const hoverExceptions = new Map([
  // ['page.html selector', 'reason'],
])
const paints = /(?:^|;\s*)(?:--[\w-]+|background(?:-color|-image)?|box-shadow|color|outline(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?)\s*:/
const hoverCapable = /^\(\s*hover\s*(?::\s*hover\s*)?\)$/
const stickyHover = (file, html) => perSelector(cssRules(html))
  .filter(({ context, selector, body }) => /:hover\b/.test(selector) && paints.test(body) && !requiredIn(hoverCapable, context))
  .map(({ selector }) => `${file} ${selector}`)
  .filter((rule) => !hoverExceptions.has(rule))

test('the sticky-hover guard catches a painting hover rule outside @media (hover: hover)', () => {
  const planted = `<style>.chip:hover { background: red } .link:hover { text-decoration: underline; border-radius: 0 }
    .row:is(:hover, .is-hover) { color: red } .btn.is-hover { background: red }
    .edge:hover { border: 1px solid red } .side:hover { border-top: 1px solid red } .ring:hover { outline: 2px solid red }
    @media (hover: hover) { .ok:hover { background: red } } @media (hover:hover) { .tight:hover { background: red } }
    @media (hover: hover) and ((max-width: 800px) or (pointer: fine)) { .nested:hover { background: red } }
    @media ((hover: hover) and (pointer: fine)) { .grouped:hover { background: red } }
    @media ((hover: hover) and (pointer: fine)) and (min-width: 801px) { .wide:hover { background: red } }
    @media (hover:hover)and (pointer:fine) { .glued:hover { background: red } } @media (hover) { .bare:hover { background: red } }
    @media (HOVER: HOVER) { .caps:hover { background: red } } @media (hover: hover) and garbage { .garbage:hover { background: red } }
    @media (hover: hover), { .trailing:hover { background: red } } @media (hover: hover) and ) { .unbalanced:hover { background: red } }
    .sink:hover:not(:disabled) { --depth: var(--shadow-sink) } @media (hover: hover) { .sunk:hover { --depth: none } }
    @media (hover: hover), (max-width: 640px) { .either:hover { background: red } }
    @media not (hover: hover) { .negated:hover { background: red } }
    @media (forced-colors: active) { .fc:hover { border-color: red } }</style>`
  assert.deepEqual(stickyHover('planted.html', planted), [
    'planted.html .chip:hover', 'planted.html .row:is(:hover, .is-hover)', 'planted.html .edge:hover', 'planted.html .side:hover',
    'planted.html .ring:hover', 'planted.html .garbage:hover', 'planted.html .trailing:hover', 'planted.html .unbalanced:hover',
    'planted.html .sink:hover:not(:disabled)', 'planted.html .either:hover', 'planted.html .negated:hover',
    'planted.html .fc:hover',
  ])
})

// The generated site pages: the language pages plus the CSS that scripts/site adds to them.
const sitePages = () => siteFiles({ version: '9.9.9' }).filter(([file, text]) => file.endsWith('.html') && typeof text === 'string')

test('the sticky-hover guard reads the CSS that the site scripts add to a generated page', () => {
  const [file, html] = sitePages().find(([name]) => name === 'foundations.html')
  const planted = html.replace('</style>', '.token .copy:hover { background: red }\n</style>')
  assert.deepEqual(stickyHover(file, planted), ['foundations.html .token .copy:hover'])
})

test('every painting hover rule on every page waits for a pointer that can hover', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => stickyHover(page, read(page))), [])
  assert.deepEqual(sitePages().flatMap(([file, html]) => stickyHover(`site/${file}`, html)), [])
})

// The selected fill must keep accent text readable. This reads the default hue pair, the surfaces, and
// the --color-nav-current mix from each tokens.css theme block, composites the fill over every surface it can
// sit on, and checks accent text at 4.5:1.
const themeBlock = (css, start) => css.slice(css.indexOf(start)).match(/\{([\s\S]*?)\n\s*\}/)[1]
const tokenValue = (block, name) => block.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))?.[1].trim()
// Reads #rgb or #rrggbb. Any other syntax throws, so the guard cannot pass on an unparsed colour.
const rgb = (value) => {
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!hex) throw new Error(`unsupported colour: ${value}`)
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}
const luminance = (colour) => {
  const [r, g, b] = colour.map((c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// color-mix in srgb over an opaque colour or over transparent (premultiplied), then composited on the surface.
const fillOn = ({ accent, share, base, surface }) => accent.map((c, i) => c * share + (base ?? surface)[i] * (1 - share))
const surfaces = ['--color-bg', '--color-surface', '--color-surface-raised']
// Each tokens.css theme block with its accent: --color-project in light, --color-project-dark in both dark blocks.
const accentThemes = (css) => {
  const light = themeBlock(css, ':root {')
  assert.equal(tokenValue(light, '--color-accent'), 'var(--color-project)')
  return [
    { name: 'light', block: light, light, accent: tokenValue(light, '--color-project') },
    { name: 'dark (prefers-color-scheme)', block: themeBlock(css, ':root:not([data-theme="light"])'), light, accent: tokenValue(light, '--color-project-dark') },
    { name: 'dark (data-theme)', block: themeBlock(css, ':root[data-theme="dark"] {'), light, accent: tokenValue(light, '--color-project-dark') },
  ]
}
const navCurrentText = (css) => {
  const themes = accentThemes(css)
  const light = themes[0].block
  assert.equal(tokenValue(light, '--color-nav-current-text'), 'var(--color-accent)')
  return themes.flatMap(({ name, block, accent }) => {
    const mix = tokenValue(block, '--color-nav-current').match(/^color-mix\(in srgb, var\(--color-accent\) ([\d.]+)%, (transparent|var\(--color-surface-raised\))\)$/)
    assert.ok(mix, `${name} --color-nav-current is an accent mix`)
    const value = (token) => rgb(tokenValue(block, token) ?? tokenValue(light, token))
    const base = mix[2] === 'transparent' ? undefined : value('--color-surface-raised')
    return surfaces.map((surface) => ({
      theme: name,
      surface,
      ratio: contrast(rgb(accent), fillOn({ accent: rgb(accent), share: Number(mix[1]) / 100, base, surface: value(surface) })),
    }))
  })
}

// tokens.css as a page sees it with one theme loaded after it on :root: the theme file's identity lines
// replace the default ones in the light block, and the dark blocks keep following --color-project-dark.
const distFile = (path) => readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8')
const themeIds = Object.keys(JSON.parse(distFile('tokens.json')).themes)
const withTheme = (id) => [...distFile(`themes/${id}.css`).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)]
  .reduce((css, [, name, value]) => css.replace(new RegExp(`^(\\s*${name}:)[^;]+;`, 'm'), `$1 ${value};`), read('tokens.css'))

test('every theme in tokens.json has a theme file, and loading the default one changes nothing', () => {
  assert.ok(themeIds.length >= 3)
  assert.equal(withTheme('graphite-indigo'), read('tokens.css'))
  assert.match(withTheme('pine'), /^\s*--color-project: #00543f;/m)
})

// A ratio that is not a finite number at or above the minimum (4.5:1 for text by default) fails.
const belowContrast = (results, min = 4.5) => results.filter(({ ratio }) => !(Number.isFinite(ratio) && ratio >= min))

test('the nav-current contrast guard fails a fill strong enough to hide accent text', () => {
  const planted = read('tokens.css').replace('var(--color-accent) 14%, var(--color-surface-raised)', 'var(--color-accent) 60%, var(--color-surface-raised)')
  assert.ok(belowContrast(navCurrentText(planted)).some(({ theme }) => theme === 'light'))
})

test('the nav-current contrast guard reads shorthand hex and fails a dark accent that hides on the fill', () => {
  // Black accent text on a black-tinted fill over the dark surfaces measures about 1:1.
  const css = read('tokens.css')
  const failing = belowContrast(navCurrentText(css.replace('--color-project-dark: #a5a1ff;', '--color-project-dark: #000;')))
  assert.deepEqual([...new Set(failing.map(({ theme }) => theme))], ['dark (prefers-color-scheme)', 'dark (data-theme)'])
  assert.throws(() => navCurrentText(css.replace('--color-project-dark: #a5a1ff;', '--color-project-dark: rgb(0 0 0);')), /unsupported colour/)
})

for (const id of themeIds) {
  test(`accent text on the selected fill reaches 4.5:1 on every surface in light and dark: ${id}`, () => {
    const results = navCurrentText(withTheme(id))
    assert.equal(results.length, 9)
    assert.deepEqual(belowContrast(results), [])
  })
}

// The focus ring is the accent, so the accent must reach 3:1 (WCAG 1.4.11) on every surface a ring
// sits on, in both themes.
const focusRingContrast = (css) => {
  const themes = accentThemes(css)
  assert.equal(tokenValue(themes[0].block, '--color-focus'), 'var(--color-accent)')
  return themes.flatMap(({ name, block, light, accent }) => surfaces.map((surface) => ({
    theme: name,
    surface,
    ratio: contrast(rgb(accent), rgb(tokenValue(block, surface) ?? tokenValue(light, surface))),
  })))
}

test('the focus-ring contrast guard fails a pale accent and a ring that is not the accent', () => {
  const css = read('tokens.css')
  const failing = belowContrast(focusRingContrast(css.replace('--color-project: #4b45d1;', '--color-project: #c9c7f5;')), 3)
  assert.deepEqual([...new Set(failing.map(({ theme }) => theme))], ['light'])
  assert.throws(() => focusRingContrast(css.replace('--color-focus: var(--color-accent);', '--color-focus: var(--color-text);')))
})

test('the focus ring tokens draw a 2px ring with a 3px gap', () => {
  const root = read('tokens.css').match(/^:root \{([\s\S]*?)^\}/m)[1]
  assert.match(root, /--focus-width:\s*2px;/)
  assert.match(root, /--focus-offset:\s*3px;/)
})

for (const id of themeIds) {
  test(`the accent focus ring reaches 3:1 on --color-bg, --color-surface, and --color-surface-raised in light and dark: ${id}`, () => {
    const results = focusRingContrast(withTheme(id))
    assert.equal(results.length, 9)
    assert.deepEqual(belowContrast(results, 3), [])
  })
}

// The native clear cross sits at the input's trailing edge. A fixed-width search input inside a wider
// field wrapper leaves the cross floating mid-field, so the wrapper carries the width instead.
const fixedSearchInputs = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (property, value) => property === 'width' && /\d(?:\.\d+)?(?:px|rem|em)\b/.test(value),
}).filter((line) => /(?:\.search input|input\[type="search"\])(?![\w-]|::)/.test(line.split(' { ')[0]))

test('the search-width guard catches a fixed-width search input', () => {
  const planted = `<style>.search input { width: 180px } .toolbar .search input { width: 100% }
    .search { width: 248px } .search input::-webkit-search-cancel-button { width: 0.75rem }</style>`
  assert.equal(fixedSearchInputs('planted.html', planted).length, 1)
})

test('no search input has a fixed width', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => fixedSearchInputs(page, read(page))), [])
})
