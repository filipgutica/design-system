import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { posix } from 'node:path'
import { COPIED, fetchProjects, siteFiles } from '../scripts/build-site.mjs'
import { catalogueComponents, specGuidance } from '../scripts/site/components.mjs'
import { foundationsPage } from '../scripts/site/foundations.mjs'
import { overviewPage } from '../scripts/site/overview.mjs'
import { parseColour, themeChecks, themesPage } from '../scripts/site/themes.mjs'
import { parseProjects, projectSwitcher, shellDrift, sitePage, spanOnce } from '../scripts/site/shell.mjs'
import { readRenameTable } from '../scripts/rename-tokens.mjs'
import { readTokens } from '../scripts/build-tokens.mjs'
import { fileURLToPath } from 'node:url'
import { read } from './css.mjs'
// A small, made-up project list. The real list is ui's published projects.json, which this repository does not copy.
import PROJECTS from './fixtures/projects.json' with { type: 'json' }
import { createServer } from 'node:http'

// The site pages share components.html's shell byte for byte, and the package copy of the
// catalogue keeps its own header, whose links must resolve inside language/.
const template = read('language/components.html')
const pkg = JSON.parse(read('package.json'))
const files = new Map(siteFiles({ version: '9.9.9', projects: PROJECTS }))
const pages = [['index.html', 'a section'], ['foundations.html', 'a token'], ['components.html', 'a component'], ['themes.html', 'a theme']]

test('every site page shares the shell CSS, icons, script, and shell markup with components.html', () => {
  for (const [file, noun] of pages) assert.deepEqual(shellDrift({ template, page: files.get(file), noun }), [], file)
})

test('the drift guard names the shared part that changed', () => {
  const page = files.get('foundations.html')
  const edited = page
    .replace('.icon { width: 16px;', '.icon { width: 17px;')
    .replace('const reduced = matchMedia', 'const reduced  = matchMedia')
    .replace('id="section-menu" aria-haspopup="dialog"', 'id="section-menu" aria-haspopup="menu"')
    .replace('aria-label="Close drawer"', 'aria-label="Close"')
  assert.deepEqual(shellDrift({ template, page: edited, noun: 'a token' }), ['style', 'script', 'section trigger', 'menu drawer'])
})

test('each site page names its phone trigger and drawer after its rail', () => {
  for (const [file, label] of [['index.html', 'Overview'], ['foundations.html', 'Foundations'], ['components.html', 'Components'], ['themes.html', 'Themes']]) {
    const page = files.get(file)
    assert.ok(page.includes(`aria-haspopup="dialog" hidden>${label}</button>`), file)
    assert.ok(page.includes(`<h4 id="nav-drawer-title">${label}</h4>`), file)
  }
})

// The project menu: the build renders the list, and the page's refresh validates a fetched one with the
// same function, embedded by its source.
const project = (id, extra = {}) => ({ id, label: id, href: `https://example.com/${id}/`, repository: `https://example.com/repo/${id}`, ...extra })

test('the project list keeps entries with text ids and labels, https URLs, and unique ids, up to 20', () => {
  assert.deepEqual(parseProjects([
    project('a'),
    project('b', { href: 'http://example.com/b/' }),
    project('c', { repository: 'javascript:alert(1)' }),
    project('d', { label: ' ' }),
    project('', { label: 'Empty id' }),
    project('a', { label: 'Second a' }),
    null,
    'e',
    project('f', { extra: 'dropped' }),
  ]), [project('a'), project('f')])
  assert.equal(parseProjects(Array.from({ length: 25 }, (_, i) => project(`p${i}`))).length, 20)
  for (const value of [undefined, null, {}, 'list', [], [project('x', { href: 'not a url' })]]) assert.equal(parseProjects(value), undefined)
})

test('every site page starts its header with the project switcher, this site current', () => {
  for (const [file] of pages) {
    const page = files.get(file)
    assert.ok(page.includes(`<header class="page-head">\n  ${projectSwitcher(PROJECTS)}`), file)
  }
  assert.equal(projectSwitcher(PROJECTS), '<details class="projects"><summary class="quiet-action" aria-label="Project: Design system"><span>Design system</span><svg class="icon" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><nav class="navlist" aria-label="Projects"><a href="https://example.com/annoterm/" data-project="annoterm">annoterm</a><a href="https://example.com/design-system/" data-project="design-system" aria-current="page">Design system</a><a href="https://example.com/ui/" data-project="ui">UI</a></nav></details>')
  assert.throws(() => projectSwitcher([project('annoterm')]), /no "design-system" entry/)
  // The package catalogue has no project list, so it keeps the site name as text.
  assert.ok(template.includes('<header class="page-head">\n  <p class="site-name">Design system</p>'))
})

test('the build stops with the URL and the reason when the project list cannot load', async () => {
  const responses = [[500, '[]'], [200, 'not json'], [200, JSON.stringify([project('x', { href: 'http://x/' })])]]
  for (const [status, body] of responses) {
    const server = createServer((request, response) => response.writeHead(status, { 'content-type': 'application/json' }).end(body))
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    const url = `http://127.0.0.1:${server.address().port}/projects.json`
    try {
      await assert.rejects(fetchProjects({ url, attempts: 2, delay: 0 }), new RegExp(`Could not load the project list from ${url} after 2 attempts: .+`))
    } finally {
      server.close()
    }
  }
  const server = createServer((request, response) => response.writeHead(200).end(JSON.stringify([project('design-system'), project('b', { href: 'http://b/' })])))
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  try {
    assert.deepEqual(await fetchProjects({ url: `http://127.0.0.1:${server.address().port}/`, attempts: 1 }), [project('design-system')])
  } finally {
    server.close()
  }
})

test('a template change that removes a splice point stops the build', () => {
  assert.throws(() => sitePage({ template: template.replace('<title>Component catalogue</title>', '<title>Catalogue</title>'), projects: PROJECTS, current: 'components', title: 'Components' }), /expected one "<title>Component catalogue<\/title>", found 0/)
  // A <main> with another attribute, or a pager that no longer ends it, has no safe splice.
  const page = { projects: PROJECTS, current: 'overview', title: 'Overview', main: '<p>Hi</p>' }
  assert.throws(() => sitePage({ ...page, template: template.replace('<main id="main">', '<main id="main" aria-label="Components">') }), /expected one "<main id=\\"main\\">", found 0/)
  assert.throws(() => sitePage({ ...page, template: template.replace('</nav>\n</main>', '</nav>\n  <p>Last</p>\n</main>') }), /expected one "<\/nav>\\n<\/main>", found 0/)
})

// A strip link's hidden copy (data-label) sets its width at the current weight, so it must hold the link's
// own label. Without one, the row's -1lh copy is empty and pulls the label off centre.
const stripLabelProblems = (html) => [...html.matchAll(/<nav class="navlist strip[^"]*"[^>]*>(.*?)<\/nav>/g)]
  .flatMap(([, strip]) => [...strip.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)])
  .filter(([, attrs, text]) => attrs.match(/ data-label="([^"]*)"/)?.[1] !== text)
  .map(([link]) => link)

test('every strip link in the catalogue and the site carries its label in data-label', () => {
  assert.deepEqual(stripLabelProblems(template), [])
  for (const [file] of pages) assert.deepEqual(stripLabelProblems(files.get(file)), [], file)
  assert.deepEqual(stripLabelProblems('<nav class="navlist strip" aria-label="X"><a href="a.html" data-label="A">A</a><a href="b.html">B</a><a href="c.html" data-label="C">See</a></nav>'),
    ['<a href="b.html">B</a>', '<a href="c.html" data-label="C">See</a>'])
})

test('spanOnce refuses a repeated marker and markers out of order', () => {
  assert.deepEqual(spanOnce('a<b>c</b>d', '<b>', '</b>'), [1, 9])
  assert.throws(() => spanOnce('<b><b></b>', '<b>', '</b>'), /expected one "<b>", found 2/)
  assert.throws(() => spanOnce('</b><b>', '<b>', '</b>'), /comes before/)
})

// Local links in a page or a Markdown file: [target path from the site root, fragment]. HTML links are
// href and src values; Markdown links are ](target). A value with a ${…} is a template literal in a
// script, not a link. A path resolves against the linking file's folder.
const localLinks = (name, text) => [...text.matchAll(/\s(?:href|src)="([^"]+)"|\]\(([^)\s]+)\)/g)]
  .map(([, attr, markdown]) => (attr ?? markdown).replace(/&amp;/g, '&'))
  .filter((value) => !/^(?:[a-z]+:|\/\/|#$)/.test(value) && !value.includes('${'))
  .map((value) => {
    const [path, hash = ''] = value.split('#')
    return [path ? posix.normalize(posix.join(posix.dirname(name), path)) : name, hash, value]
  })

// Dead links in `files` (name → text), resolved against `exists(name)` and each HTML target's ids.
const deadLinks = ({ files: pageFiles, exists, read: readTarget }) => [...pageFiles].flatMap(([name, text]) => localLinks(name, text)
  .filter(([target, hash]) => !exists(target) || (Boolean(hash) && target.endsWith('.html') && !readTarget(target).includes(`id="${hash}"`)))
  .map(([, , value]) => `${name}: ${value}`))

// Every file under `names` in `dir`, folders walked, as path → text.
const textFiles = (dir, names) => new Map(names
  .flatMap((name) => (statSync(`${dir}/${name}`).isDirectory()
    ? readdirSync(`${dir}/${name}`, { recursive: true }).map((sub) => `${name}/${sub}`).filter((path) => statSync(`${dir}/${path}`).isFile())
    : [name]))
  .map((path) => [path, read(`${dir}/${path}`)]))
const linking = (all) => new Map([...all].filter(([name]) => /\.(?:html|md)$/.test(name)))

const languageFiles = textFiles('language', readdirSync('language'))
const inLanguage = { exists: (name) => existsSync(`language/${name}`), read: (name) => read(`language/${name}`) }

test('every link in the package copy of the language pages and Markdown resolves inside language/', () => {
  assert.deepEqual(deadLinks({ files: linking(languageFiles), ...inLanguage }), [])
  assert.match(template, /<nav class="navlist strip" aria-label="Pages">.*<a href="reference\.html#foundations"[^>]*>Foundations<\/a>/)
})

test('the link check catches a missing page, a missing fragment, and a dead Markdown link', () => {
  const planted = new Map([
    ['components.html', '<a href="index.html">Overview</a><a href="#nowhere">Gone</a><a href="docs.html#start">Start</a><a href="https://example.com">x</a>'],
    ['visualizations/delivery.md', 'See [the rules](../DESIGN.md#color) and [the report](report.md).'],
  ])
  assert.deepEqual(deadLinks({ files: planted, ...inLanguage }), ['components.html: index.html', 'components.html: #nowhere', 'visualizations/delivery.md: report.md'])
})

// site/ holds the generated files, the copied language files and folders, and fonts/, and nothing else from the repository.
const copied = textFiles('language', COPIED)
const inSite = {
  exists: (name) => files.has(name) || copied.has(name) || (name.startsWith('fonts/') && existsSync(name)),
  read: (name) => files.get(name) ?? copied.get(name),
}

test('every link in the built site, its pages and its Markdown, resolves inside site/', () => {
  const sitePages = linking(new Map([...files, ...copied]))
  assert.ok(sitePages.has('visualizations/delivery.md'))
  assert.deepEqual(deadLinks({ files: sitePages, ...inSite }), [])
})

test('the site link check catches a file the repository has but site/ does not', () => {
  const planted = new Map([
    ['docs.html', '<a href="README.md">Read me</a><a href="fonts/fonts.css">Fonts</a><a href="tokens.css">Tokens</a>'],
    ['DESIGN.md', 'Read [visualizations](visualizations.md) and [the source](../scripts/build-site.mjs).'],
  ])
  assert.deepEqual(deadLinks({ files: planted, ...inSite }), ['docs.html: README.md', 'DESIGN.md: ../scripts/build-site.mjs'])
})

// index.json carries each component's Do and Don't lines as components.md writes them. The test finds
// each section by its heading on its own, not through the build's parser.
test('every index.json entry has Do and Don’t lines that match its components.md section', () => {
  const index = JSON.parse(files.get('index.json'))
  const spec = read('language/components.md')
  const lineOf = (name, part) => spec.split(/^(?=#{2,3} )/m).find((block) => block.startsWith(`## ${name}\n`))
    ?.match(new RegExp(`^- \\*\\*${part}\\.\\*\\* (.+)$`, 'm'))?.[1]
  assert.equal(index.components.length, 32)
  for (const entry of index.components) {
    assert.ok(entry.do && entry.dont, entry.id)
    assert.equal(entry.do, lineOf(entry.name, 'Do'), entry.id)
    assert.equal(entry.dont, lineOf(entry.name, "Don't"), entry.id)
  }
  assert.match(files.get('llms.txt'), /index\.json\): every component with its layer, purpose, Do and Don't lines/)
  // A missing line, or a line with a link that would break in JSON, stops the build.
  const components = catalogueComponents(template)
  assert.throws(() => specGuidance({ markdown: spec.replace(/^- \*\*Do\.\*\* One primary button.*\n/m, ''), components }), /: button: do$/)
  assert.throws(() => specGuidance({ markdown: spec.replace('Use a figure.', 'Use a [figure](#figure).'), components }), /: terminal-capture: dont$/)
})

test('Overview takes its version and exports from the build and package.json', () => {
  const { main } = overviewPage({ pkg, version: '9.9.9' })
  assert.match(main, /<span class="badge">9\.9\.9<\/span>/)
  assert.equal(main.split('<tr><th scope="row"><code>@filipgutica/design-system').length - 1, Object.keys(pkg.exports).length)
  assert.doesNotMatch(main, /Planned/)
  assert.throws(() => overviewPage({ pkg: { ...pkg, exports: { ...pkg.exports, './new.css': './new.css' } }, version: '9.9.9' }), /\.\/new\.css/)
})

test('Foundations lists every token in tokens.json once, with its role and former name', () => {
  const values = JSON.parse(read('dist/tokens.json')).themes['graphite-indigo']
  const source = JSON.parse(read('tokens/core.json'))
  const renames = readRenameTable(read('language/decisions.md'))
  const { main, total } = foundationsPage({ source, values, renames, version: '9.9.9', packageName: pkg.name })
  const rows = [...main.matchAll(/<th scope="row"><div class="token"><code class="name">--([^<]+(?:<wbr>[^<]+)*)<\/code>/g)].map(([, name]) => name.replaceAll('<wbr>', ''))
  assert.equal(total, Object.keys(values.light).length)
  assert.deepEqual(rows.toSorted(), Object.keys(values.light).toSorted())
  assert.equal(main.split('<span class="was">Formerly').length - 1, [...renames.values()].filter((to) => to.slice(2) in values.light).length)
  assert.match(main, /<code class="name">--color-<wbr>bg<\/code>.*<span class="was">Formerly <code>--bg<\/code>/)
  // A source group the page does not place stops the build instead of dropping its tokens.
  const extra = { ...source, groups: [...source.groups, { id: 'new-group', title: 'New', note: 'New.', roles: {}, tokens: {} }] }
  assert.throws(() => foundationsPage({ source: extra, values, renames, version: '9.9.9', packageName: pkg.name }), /no rail group for new-group/)
})

test('Themes shows every theme in tokens.json, the default first, and stops on a theme without values', () => {
  const values = JSON.parse(read('dist/tokens.json')).themes
  const themes = readTokens(fileURLToPath(new URL('..', import.meta.url))).themes.map(({ data, ...theme }) => theme)
  const { main } = themesPage({ themes, values, packageName: pkg.name })
  assert.deepEqual([...main.matchAll(/<h2 id="([\w-]+)-title">/g)].map(([, id]) => id), [...Object.keys(values), 'use', 'make'])
  assert.equal(main.split('class="theme-frame"').length - 1, 2 * themes.length)
  assert.throws(() => themesPage({ themes: themes.slice(1), values, packageName: pkg.name }), /disagree/)
})

test('the theme contrast reader mixes as the browser does and refuses a colour it cannot read', () => {
  assert.deepEqual(parseColour('#00543f'), [0, 84, 63, 1])
  assert.deepEqual(parseColour('color-mix(in srgb, #ffffff 50%, black)'), [127.5, 127.5, 127.5, 1])
  // Mixing with transparent keeps the colour and lowers its alpha.
  assert.deepEqual(parseColour('color-mix(in srgb, #3fe0c0 20%, transparent)').map((c) => Math.round(c * 100) / 100), [63, 224, 192, 0.2])
  assert.throws(() => parseColour('rgb(0 0 0)'), /unsupported colour/)
  // A pale accent fails the focus and current-row checks in light mode.
  const values = JSON.parse(read('dist/tokens.json')).themes['graphite-indigo']
  const pale = Object.fromEntries(Object.entries(values.light).map(([name, value]) => [name, value.replaceAll('#4b45d1', '#c9c7f5')]))
  const failing = themeChecks({ light: pale, dark: values.dark }).filter(({ light, min }) => light < min).map(({ id }) => id)
  assert.deepEqual(failing, ['focus', 'nav', 'thumb', 'primary'])
})
