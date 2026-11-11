// The site shell. language/components.html is its only source: every site page is that file with
// its title, header, rail groups, <main>, and pager swapped, and an optional page-only <style> and
// <script> after the shared ones. The shared <style>, icon sprite, and <script> are copied byte for
// byte, so the catalogue's shell CSS and JS are never forked. shellDrift() checks that they match.

/** The site's pages, in header and pager order. */
export const SITE_PAGES = [
  { id: 'overview', label: 'Overview', file: 'index.html' },
  { id: 'foundations', label: 'Foundations', file: 'foundations.html' },
  { id: 'components', label: 'Components', file: 'components.html' },
  { id: 'themes', label: 'Themes', file: 'themes.html' },
]

/** Where Pages serves site/. Generated indexes use absolute URLs, because agents read them out of context. */
export const SITE_URL = 'https://filipgutica.github.io/design-system/'

export const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Page CSS for a table.stack: at `maxWidth` and below each row becomes a record. Each cell holds one
 * wrapper element, so its label and its content are the cell's only two grid items.
 */
export const stackedTablesCss = (maxWidth) => `
  @media (max-width: ${maxWidth}) {
    table.stack thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    table.stack, table.stack tbody, table.stack tr, table.stack th, table.stack td { display: block; white-space: normal; }
    table.stack tr { padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-subtle); }
    table.stack th, table.stack td { padding: 0.125rem 0; border: 0; }
    table.stack td { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); gap: var(--space-3); }
    table.stack td::before { content: attr(data-label); color: var(--color-muted); font-size: var(--text-xs); padding-top: 0.125rem; }
  }
`

/** Plain text with `backticks` for code, as the token source writes roles and notes, as HTML. */
export const inlineCode = (text) => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>')

/** Replaces `from` in `html`, which must occur exactly once, so a changed template fails the build. */
export const swap = (html, from, to) => {
  const count = html.split(from).length - 1
  if (count !== 1) throw new Error(`components.html: expected one ${JSON.stringify(from.slice(0, 60))}, found ${count}`)
  return html.replace(from, () => to)
}

/**
 * The offsets of the text from `start` to the end of `end`, where each occurs exactly once and `end`
 * comes after `start`, so a changed template fails the build instead of splicing in the wrong place.
 */
export const spanOnce = (html, start, end) => {
  for (const marker of [start, end]) {
    const count = html.split(marker).length - 1
    if (count !== 1) throw new Error(`components.html: expected one ${JSON.stringify(marker)}, found ${count}`)
  }
  const from = html.indexOf(start)
  const to = html.indexOf(end) + end.length
  if (to - end.length < from + start.length) throw new Error(`components.html: ${JSON.stringify(end)} comes before ${JSON.stringify(start)}`)
  return [from, to]
}

/** The text from the first `start` to the end of the first `end` after it. */
export const between = (html, start, end) => {
  const from = html.indexOf(start)
  const to = html.indexOf(end, from)
  if (from < 0 || to < 0) throw new Error(`components.html: no ${JSON.stringify(start)} … ${JSON.stringify(end)}`)
  return html.slice(from, to + end.length)
}

const fileOf = (id) => SITE_PAGES.find((page) => page.id === id).file

// The header's first element: the site name on the home page, otherwise a breadcrumb back to it.
const headStart = '<header class="page-head">\n  '
const siteName = '<p class="site-name">Design system</p>'
const crumbs = (label) => `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${fileOf('overview')}">Design system</a></li><li><span aria-current="page">${esc(label)}</span></li></ol></nav>`

const strip = (current) => `<nav class="navlist strip" aria-label="Pages"><span class="group-label" aria-hidden="true">Pages</span>${
  SITE_PAGES.map(({ id, label, file }) => `<a href="${file}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`

/** Previous and next site pages, in header order, in the catalogue's pager markup. */
export const pager = (current) => {
  const index = SITE_PAGES.findIndex(({ id }) => id === current)
  const prev = SITE_PAGES[index - 1]
  const next = SITE_PAGES[index + 1]
  const arrow = (dir) => `<svg class="icon" aria-hidden="true"><use href="#i-arrow-${dir}"/></svg>`
  return `<nav class="pager" aria-label="Design system pages">${
    prev ? `<a href="${prev.file}" rel="prev"><span class="pager-dir">${arrow('left')}Previous</span><span class="pager-title">${prev.label}</span></a>` : '<span></span>'}${
    next ? `<a href="${next.file}" rel="next"><span class="pager-dir">Next${arrow('right')}</span><span class="pager-title">${next.label}</span></a>` : ''}</nav>`
}

/** The template's own header strip and pager, which the package copy keeps. */
const templateStrip = (template) => between(template, '<nav class="navlist strip" aria-label="Pages">', '</nav>')
const templatePager = (template) => between(template, '<nav class="pager" aria-label="Design system pages">', '</nav>')

/**
 * Rail groups for a page that is not the catalogue: [{ id, label, links: [{ href, text, terms }] }].
 * Each link's Find terms are its text, its group, and any extra terms, lower case.
 */
export const railGroups = (groups) => groups.map(({ id, label, links }) => `    <div class="navlist" role="group" aria-labelledby="rail-${id}">
      <span class="group-label" id="rail-${id}">${esc(label)}</span>
      ${links.map(({ href, text, terms = '' }) => `<a href="${href}" data-terms="${esc(`${text} ${label} ${terms}`.toLowerCase().replace(/\s+/g, ' ').trim())}">${esc(text)}</a>`).join('')}
    </div>`).join('\n')

// The catalogue's rail groups: everything in the rail list before its empty state.
const templateGroups = (template) => {
  const list = between(template, '<nav class="rail-list" id="contents"', '<div class="find-empty"')
  return list.slice(list.indexOf('>') + 2, list.lastIndexOf('    <div class="find-empty"'))
}

/**
 * A site page built on components.html.
 * - `current`: the SITE_PAGES id, which sets the title, header, and pager.
 * - `rail`: { label, noun, groups } for the rail, where noun is what Find looks for ("a token");
 *   omitted, the catalogue's own rail stays.
 * - `main`: the page's <main> content, without the pager; omitted, the catalogue's own stays.
 * - `css` and `js`: page-only additions, after the shared <style> and <script>.
 */
export const sitePage = ({ template, current, title, rail, main, css = '', js = '' }) => {
  const { label } = SITE_PAGES.find(({ id }) => id === current)
  let html = template
  html = swap(html, '<title>Component catalogue</title>', `<title>${esc(title)}</title>`)
  // The site serves the package's fonts beside the pages; the package pages use the reader's fonts.
  html = swap(html, '<link rel="stylesheet" href="tokens.css">', '<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="tokens.css">')
  html = swap(html, `${headStart}${siteName}`, `${headStart}${current === 'overview' ? siteName : crumbs(label)}`)
  html = swap(html, templateStrip(template), strip(current))
  html = swap(html, templatePager(template), pager(current))
  if (rail) {
    html = swap(html, templateGroups(template), `${railGroups(rail.groups)}\n`)
    html = swap(html, '<nav class="rail-list" id="contents" aria-label="Components">', `<nav class="rail-list" id="contents" aria-label="${esc(rail.label)}">`)
    html = html.replaceAll('Find a component', `Find ${esc(rail.noun)}`)
    html = swap(html, '<p>No component matches <q></q>.</p>', `<p>No ${esc(rail.noun.replace(/^an? /, ''))} matches <q></q>.</p>`)
  }
  if (main) {
    // The whole of <main>, which ends with the pager. The shared script announces copies in #copy-status,
    // which the catalogue keeps in its code block section.
    const [from, to] = spanOnce(html, '<main id="main">', '</nav>\n</main>')
    html = `${html.slice(0, from)}<main id="main">\n${main}\n  <p class="sr-only" role="status" id="copy-status"></p>\n\n  ${pager(current)}\n</main>${html.slice(to)}`
    // The catalogue's live dialog and drawer specimens belong to its own <main>.
    html = swap(html, between(html, '<dialog class="dialog" id="live-dialog"', '</dialog>\n<dialog class="drawer" id="nav-drawer"'), '<dialog class="drawer" id="nav-drawer"')
  }
  if (css) html = swap(html, '</style>\n', `</style>\n<style>\n${css.trim()}\n</style>\n`)
  if (js) html = swap(html, '</script>\n', `</script>\n<script>\n(() => {\n${js.trim()}\n})();\n</script>\n`)
  return html
}

/**
 * The shared parts of a page that must match components.html byte for byte: the first <style>,
 * the icon sprite, the first <script>, and the shell markup around the rail, with the Find noun
 * normalized. Returns the names of the parts that differ.
 */
export const shellDrift = ({ template, page, noun = 'a component' }) => {
  const parts = {
    style: (html) => between(html, '<style>', '</style>'),
    sprite: (html) => between(html, '<svg width="0" height="0"', '</svg>'),
    script: (html) => between(html, '<script>', '</script>'),
    'skip links': (html) => between(html, '<a class="skip" href="#main">', '<div class="frame">'),
    'section bar': (html) => between(html, '<div class="section-bar" id="section-bar" hidden>', '</div>').replaceAll(`Find ${noun}`, 'Find a component'),
    'rail find': (html) => between(html, '<div class="rail-find" hidden>', '</p>\n  </div>').replaceAll(`Find ${noun}`, 'Find a component'),
    'rail foot': (html) => between(html, '<div class="rail-foot" hidden>', '</aside>'),
    'menu drawer': (html) => between(html, '<dialog class="drawer" id="nav-drawer"', '</dialog>'),
  }
  return Object.entries(parts).filter(([, part]) => part(template) !== part(page)).map(([name]) => name)
}
