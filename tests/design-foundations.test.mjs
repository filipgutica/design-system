import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

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
  { classes: ['btn'], states: ['.btn:is(:hover, .is-hover):not(:disabled)', `.btn:not(.text)${pressed}`] },
  { classes: ['btn'], without: ['secondary', 'ghost', 'danger', 'text'], states: [`.btn:not(.secondary, .ghost, .danger, .text)${pressed}`] },
  { classes: ['btn', 'secondary'], states: ['.btn.secondary:is(:hover, .is-hover):not(:disabled)', `.btn:is(.secondary, .ghost)${pressed}`] },
  { classes: ['btn', 'ghost'], states: ['.btn.ghost:is(:hover, .is-hover):not(:disabled)', `.btn:is(.secondary, .ghost)${pressed}`] },
  { classes: ['btn', 'danger'], states: ['.btn.danger:is(:hover, .is-hover):not(:disabled)', `.btn.danger${pressed}`] },
  { classes: ['quiet-action'], states: ['.quiet-action:is(:hover, .is-hover):where(:not(:disabled))', '.quiet-action:is(:active, .is-active):where(:not(:disabled))'] },
  {
    classes: ['segmented'],
    states: [
      '.segmented button:is(:hover, .is-hover):not(:disabled, [aria-pressed="true"])',
      '.segmented button[aria-pressed="true"]',
      '.segmented button[aria-pressed="true"]::before',
      '@media (forced-colors: active) .segmented button[aria-pressed="true"]',
      '@media (forced-colors: active) .segmented button[aria-pressed="true"]::before',
    ],
  },
  { classes: ['tab'], states: ['.tab:is(:hover, .is-hover)', '.tab[aria-selected="true"]', '@media (forced-colors: active) .tab[aria-selected="true"]'] },
  { classes: ['navlist'], states: ['.navlist a:is(:hover, .is-hover)', '.navlist a[aria-current="page"]', '@media (forced-colors: active) .navlist a[aria-current="page"]'] },
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
// var(--focus-width) solid var(--focus), offset var(--focus-offset) or inset by the width. An
// outline-color is var(--focus) or CanvasText (for forced colors). --focus is the accent, or the
// dark-theme accent on a dark plate. In forced colors a focused field, which has no ring elsewhere,
// draws a Highlight outline 1px inside its edge. A per-role ring colour, set directly or by redefining
// --focus, and a hand-written width or offset fail.
const focusRules = [
  { property: /^outline$/, allowed: (value, forced) => /^(?:none|0)$/.test(value) || value === 'var(--focus-width) solid var(--focus)' || (forced && value === 'var(--focus-width) solid Highlight') },
  { property: /^outline-color$/, allowed: (value) => value === 'var(--focus)' || value === 'CanvasText' },
  { property: /^outline-offset$/, allowed: (value, forced) => ['var(--focus-offset)', 'calc(var(--focus-width) * -1)'].includes(value) || (forced && value === '-1px') },
  { property: /^--focus$/, allowed: (value) => value === 'var(--accent)' || value === 'var(--project-dark)' },
]
const focusColourDrift = (file, html) => flaggedDeclarations({
  file,
  html,
  isViolation: (name, value, context) => focusRules.some(({ property, allowed }) => property.test(name) && !allowed(value, context.includes('forced-colors: active'))),
})

test('the focus guard catches a per-role ring colour or a hand-written ring, set directly or through --focus', () => {
  const planted = `<style>.btn:focus-visible { outline: var(--focus-width) solid var(--accent) } .tab { outline-color: var(--link) }
    .btn.danger { --focus: var(--danger) } .old { outline: 2px solid var(--focus); outline-offset: 2px }
    .ok { outline: var(--focus-width) solid var(--focus); outline-offset: var(--focus-offset); outline-color: CanvasText } .off { outline: none }
    .inset { outline-offset: calc(var(--focus-width) * -1) } .plate { --focus: var(--project-dark) }
    .field:focus-visible { outline: var(--focus-width) solid Highlight; outline-offset: -1px }
    @media (forced-colors: active) { .field:focus-visible { outline: var(--focus-width) solid Highlight; outline-offset: -1px } }</style>
    <p style="--focus: var(--text)"></p>`
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
  assert.match(unlayered, /^body \{ background: var\(--bg\); color: var\(--text\); \}$/m)
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
  const planted = `<style>.a { font-size: 18px } .b { font: 600 12px / 1.2 var(--font-sans) } :root { --space-9: 6px; --row: 36px }
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
  const planted = `<style>.row[aria-selected="true"] { box-shadow: inset 2px 0 0 var(--accent) }
    .ok { box-shadow: var(--shadow-nav-current) } .ring { box-shadow: 0 0 0 1px var(--border-subtle) }</style>`
  assert.equal(selectionBars('planted.html', planted).length, 1)
})

test('no page marks a selected row with an inset accent bar', () => {
  const pages = readdirSync(dir).filter((file) => file.endsWith('.html'))
  assert.deepEqual(pages.flatMap((page) => selectionBars(page, read(page))), [])
})

// The selected fill must keep accent text readable. This reads the default hue pair, the surfaces, and
// the --nav-current mix from each tokens.css theme block, composites the fill over every surface it can
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
const surfaces = ['--bg', '--surface', '--surface-raised']
// Each tokens.css theme block with its accent: --project in light, --project-dark in both dark blocks.
const accentThemes = (css) => {
  const light = themeBlock(css, ':root {')
  assert.equal(tokenValue(light, '--accent'), 'var(--project)')
  return [
    { name: 'light', block: light, light, accent: tokenValue(light, '--project') },
    { name: 'dark (prefers-color-scheme)', block: themeBlock(css, ':root:not([data-theme="light"])'), light, accent: tokenValue(light, '--project-dark') },
    { name: 'dark (data-theme)', block: themeBlock(css, ':root[data-theme="dark"] {'), light, accent: tokenValue(light, '--project-dark') },
  ]
}
const navCurrentText = (css) => {
  const themes = accentThemes(css)
  const light = themes[0].block
  assert.equal(tokenValue(light, '--nav-current-text'), 'var(--accent)')
  return themes.flatMap(({ name, block, accent }) => {
    const mix = tokenValue(block, '--nav-current').match(/^color-mix\(in srgb, var\(--accent\) ([\d.]+)%, (transparent|var\(--surface-raised\))\)$/)
    assert.ok(mix, `${name} --nav-current is an accent mix`)
    const value = (token) => rgb(tokenValue(block, token) ?? tokenValue(light, token))
    const base = mix[2] === 'transparent' ? undefined : value('--surface-raised')
    return surfaces.map((surface) => ({
      theme: name,
      surface,
      ratio: contrast(rgb(accent), fillOn({ accent: rgb(accent), share: Number(mix[1]) / 100, base, surface: value(surface) })),
    }))
  })
}

// A ratio that is not a finite number at or above the minimum (4.5:1 for text by default) fails.
const belowContrast = (results, min = 4.5) => results.filter(({ ratio }) => !(Number.isFinite(ratio) && ratio >= min))

test('the nav-current contrast guard fails a fill strong enough to hide accent text', () => {
  const planted = read('tokens.css').replace('var(--accent) 14%, var(--surface-raised)', 'var(--accent) 60%, var(--surface-raised)')
  assert.ok(belowContrast(navCurrentText(planted)).some(({ theme }) => theme === 'light'))
})

test('the nav-current contrast guard reads shorthand hex and fails a dark accent that hides on the fill', () => {
  // Black accent text on a black-tinted fill over the dark surfaces measures about 1:1.
  const css = read('tokens.css')
  const failing = belowContrast(navCurrentText(css.replace('--project-dark: #a5a1ff;', '--project-dark: #000;')))
  assert.deepEqual([...new Set(failing.map(({ theme }) => theme))], ['dark (prefers-color-scheme)', 'dark (data-theme)'])
  assert.throws(() => navCurrentText(css.replace('--project-dark: #a5a1ff;', '--project-dark: rgb(0 0 0);')), /unsupported colour/)
})

test('accent text on the selected fill reaches 4.5:1 on every surface in both themes', () => {
  const results = navCurrentText(read('tokens.css'))
  assert.equal(results.length, 9)
  assert.deepEqual(belowContrast(results), [])
})

// The focus ring is the accent, so the accent must reach 3:1 (WCAG 1.4.11) on every surface a ring
// sits on, in both themes.
const focusRingContrast = (css) => {
  const themes = accentThemes(css)
  assert.equal(tokenValue(themes[0].block, '--focus'), 'var(--accent)')
  return themes.flatMap(({ name, block, light, accent }) => surfaces.map((surface) => ({
    theme: name,
    surface,
    ratio: contrast(rgb(accent), rgb(tokenValue(block, surface) ?? tokenValue(light, surface))),
  })))
}

test('the focus-ring contrast guard fails a pale accent and a ring that is not the accent', () => {
  const css = read('tokens.css')
  const failing = belowContrast(focusRingContrast(css.replace('--project: #4b45d1;', '--project: #c9c7f5;')), 3)
  assert.deepEqual([...new Set(failing.map(({ theme }) => theme))], ['light'])
  assert.throws(() => focusRingContrast(css.replace('--focus: var(--accent);', '--focus: var(--text);')))
})

test('the focus ring tokens draw a 2px ring with a 3px gap', () => {
  const root = read('tokens.css').match(/^:root \{([\s\S]*?)^\}/m)[1]
  assert.match(root, /--focus-width:\s*2px;/)
  assert.match(root, /--focus-offset:\s*3px;/)
})

test('the accent focus ring reaches 3:1 on --bg, --surface, and --surface-raised in both themes', () => {
  const results = focusRingContrast(read('tokens.css'))
  assert.equal(results.length, 9)
  assert.deepEqual(belowContrast(results, 3), [])
})

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
