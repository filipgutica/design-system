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

/**
 * The family's project list, which ui publishes and every family site's header reads. The build renders
 * it into the project menu, and each page loads it again after load, as ui's UiSiteHeader does.
 */
export const PROJECTS_URL = 'https://filipgutica.github.io/ui/projects.json'

/** This site's id in the project list. */
export const OWN_PROJECT = 'design-system'

/**
 * The valid entries of a published project list: non-empty id and label, https href and repository,
 * unique ids, at most 20. Undefined when none remain. The page's refresh embeds this function's source,
 * so it must use nothing from outside its own body.
 */
export const parseProjects = (value) => {
  const isText = (v) => typeof v === 'string' && v.trim() !== '';
  const isHttpsUrl = (v) => {
    if (typeof v !== 'string') return false;
    try { return new URL(v).protocol === 'https:'; } catch { return false; }
  };
  if (!Array.isArray(value)) return undefined;
  const ids = new Set();
  const projects = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, label, href, repository } = entry;
    if (!isText(id) || !isText(label) || !isHttpsUrl(href) || !isHttpsUrl(repository) || ids.has(id)) continue;
    ids.add(id);
    projects.push({ id, label, href, repository });
    if (projects.length === 20) break;
  }
  return projects.length > 0 ? projects : undefined;
}

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

// The header starts with the project switcher on every page, as on every family site. The package
// catalogue has no project list, so it shows the site name as text instead.
const headStart = '<header class="page-head">\n  '
const siteName = '<p class="site-name">Design system</p>'

/** The project switcher: the catalogue's details.projects recipe, listing `projects` with this site current. */
export const projectSwitcher = (projects) => {
  const own = projects.find(({ id }) => id === OWN_PROJECT)
  if (!own) throw new Error(`The project list has no "${OWN_PROJECT}" entry, so the project menu cannot mark this site.`)
  return `<details class="projects"><summary class="quiet-action" aria-label="Project: ${esc(own.label)}"><span>${esc(own.label)}</span><svg class="icon" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><nav class="navlist" aria-label="Projects">${
    projects.map(({ id, label, href }) => `<a href="${esc(href)}" data-project="${esc(id)}"${id === OWN_PROJECT ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav></details>`
}

// After load the page fetches the list once, with a 3s timeout, and takes it only from a 200 response
// with at least one valid entry. Any failure keeps the built list and logs nothing. A list without this
// site keeps its built entry at its built place, and the summary follows this site's label.
// The menu may be open with a link focused when the list arrives, so the update keeps each project's link
// node, by its data-project id, and never moves or removes the focused one: the others move around it.
// When the focused link's project is gone from the list, the update waits until the menu closes.
const PROJECTS_JS = `
  const parseProjects = ${parseProjects};
  const OWN = ${JSON.stringify(OWN_PROJECT)};
  const menu = document.querySelector('.page-head > .projects');
  const summary = menu.querySelector('summary');
  const nav = menu.querySelector('nav');
  const ownLink = nav.querySelector(\`[data-project="\${OWN}"]\`);
  const ownIndex = [...nav.children].indexOf(ownLink);
  const apply = (projects) => {
    const wanted = projects.some(({ id }) => id === OWN) ? projects
      : [...projects.slice(0, ownIndex), { id: OWN, label: ownLink.textContent, href: ownLink.href }, ...projects.slice(ownIndex)];
    const focused = nav.contains(document.activeElement) ? document.activeElement : null;
    if (focused && !wanted.some(({ id }) => id === focused.dataset.project)) {
      const later = () => { if (!menu.open) { menu.removeEventListener('toggle', later); apply(projects); } };
      menu.addEventListener('toggle', later);
      return;
    }
    const existing = new Map([...nav.children].map((a) => [a.dataset.project, a]));
    const links = wanted.map(({ id, label, href }) => {
      const a = existing.get(id) ?? Object.assign(document.createElement('a'), { href });
      existing.delete(id);
      a.dataset.project = id;
      if (a.getAttribute('href') !== href) a.href = href;
      if (a.textContent !== label) a.textContent = label;
      if (id === OWN) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      return a;
    });
    existing.forEach((a) => a.remove());
    // Links before the focused one go in front of it, and the rest after it, in order; with no focused
    // link they are appended in order. Only the other links move.
    const at = focused ? links.indexOf(focused) : links.length;
    links.slice(0, at).forEach((a) => nav.insertBefore(a, focused));
    let previous = focused;
    links.slice(at + 1).forEach((a) => {
      if (previous.nextElementSibling !== a) nav.insertBefore(a, previous.nextElementSibling);
      previous = a;
    });
    const own = wanted.find(({ id }) => id === OWN);
    summary.querySelector('span').textContent = own.label;
    summary.setAttribute('aria-label', \`Project: \${own.label}\`);
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  fetch(${JSON.stringify(PROJECTS_URL)}, { signal: controller.signal })
    .then((response) => (response.status === 200 ? response.json() : undefined))
    .then((value) => {
      const projects = parseProjects(value);
      if (projects) apply(projects);
    })
    .catch(() => { /* Offline, blocked, timed out, or not JSON: the built list stays. */ })
    .finally(() => clearTimeout(timer));
`

// Every page but Overview has a breadcrumb back to it, right above its h1.
const crumbs = (label) => `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${fileOf('overview')}">Design system</a></li><li><span aria-current="page">${esc(label)}</span></li></ol></nav>`
const h1Start = '<h1 id="title">'

const strip = (current) => `<nav class="navlist strip" aria-label="Pages">${
  SITE_PAGES.map(({ id, label, file }) => `<a href="${file}"${id === current ? ' aria-current="page"' : ''} data-label="${label}">${label}</a>`).join('')}</nav>`

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

// The phone trigger and the drawer carry the rail's name; the script adds the current section to the trigger.
const triggerLabel = 'aria-haspopup="dialog" hidden>Components</button>'
const drawerTitle = '<h4 id="nav-drawer-title">Components</h4>'

/**
 * A site page built on components.html.
 * - `projects`: the family's project list, as parseProjects returns it, for the header's project switcher.
 * - `current`: the SITE_PAGES id, which sets the title, the header's current link, the breadcrumb, and the pager.
 * - `rail`: { label, noun, groups } for the rail, where noun is what Find looks for ("a token");
 *   omitted, the catalogue's own rail stays.
 * - `main`: the page's <main> content, without the pager; omitted, the catalogue's own stays.
 * - `css` and `js`: page-only additions, after the shared <style> and <script>. Every page also gets the
 *   project menu's refresh, in a script of its own.
 */
export const sitePage = ({ template, projects, current, title, rail, main, css = '', js = '' }) => {
  const { label } = SITE_PAGES.find(({ id }) => id === current)
  let html = template
  html = swap(html, '<title>Component catalogue</title>', `<title>${esc(title)}</title>`)
  // The site serves the package's fonts beside the pages; the package pages use the reader's fonts.
  html = swap(html, '<link rel="stylesheet" href="tokens.css">', '<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="tokens.css">')
  html = swap(html, `${headStart}${siteName}`, `${headStart}${projectSwitcher(projects)}`)
  html = swap(html, templateStrip(template), strip(current))
  html = swap(html, templatePager(template), pager(current))
  if (rail) {
    html = swap(html, templateGroups(template), `${railGroups(rail.groups)}\n`)
    html = swap(html, '<nav class="rail-list" id="contents" aria-label="Components">', `<nav class="rail-list" id="contents" aria-label="${esc(rail.label)}">`)
    html = swap(html, triggerLabel, triggerLabel.replace('Components', esc(rail.label)))
    html = swap(html, drawerTitle, drawerTitle.replace('Components', esc(rail.label)))
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
  if (current !== 'overview') html = swap(html, h1Start, `${crumbs(label)}\n    ${h1Start}`)
  if (css) html = swap(html, '</style>\n', `</style>\n<style>\n${css.trim()}\n</style>\n`)
  // Each script keeps its own scope.
  const scripts = [PROJECTS_JS, js].filter((part) => part.trim()).map((part) => `(() => {\n${part.trim()}\n})();`)
  html = swap(html, '</script>\n', `</script>\n<script>\n${scripts.join('\n')}\n</script>\n`)
  return html
}

// The rail's name in a page, which the trigger and the drawer title repeat.
const railLabel = (html) => html.match(/<nav class="rail-list" id="contents" aria-label="([^"]*)">/)[1]

/**
 * The shared parts of a page that must match components.html byte for byte: the first <style>,
 * the icon sprite, the first <script>, and the shell markup around the rail, with the Find noun
 * and the rail's name normalized. Returns the names of the parts that differ.
 */
export const shellDrift = ({ template, page, noun = 'a component' }) => {
  const named = (html, part) => part.replaceAll(`>${railLabel(html)}<`, '>Components<')
  const parts = {
    style: (html) => between(html, '<style>', '</style>'),
    sprite: (html) => between(html, '<svg width="0" height="0"', '</svg>'),
    script: (html) => between(html, '<script>', '</script>'),
    'skip links': (html) => between(html, '<a class="skip" href="#main">', '<div class="frame">'),
    'section trigger': (html) => named(html, between(html, '<button class="btn secondary menu-glyph section-trigger"', '</button>')),
    'rail find': (html) => between(html, '<div class="rail-find" hidden>', '</p>\n  </div>').replaceAll(`Find ${noun}`, 'Find a component'),
    'rail foot': (html) => between(html, '<div class="rail-foot" hidden>', '</aside>'),
    'menu drawer': (html) => named(html, between(html, '<dialog class="drawer" id="nav-drawer"', '</dialog>')),
  }
  return Object.entries(parts).filter(([, part]) => part(template) !== part(page)).map(([name]) => name)
}
