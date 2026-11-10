import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { posix } from 'node:path'
import { COPIED, siteFiles } from '../scripts/build-site.mjs'
import { catalogueComponents, implementationProblems } from '../scripts/site/components.mjs'
import { foundationsPage } from '../scripts/site/foundations.mjs'
import { overviewPage } from '../scripts/site/overview.mjs'
import { shellDrift, sitePage, spanOnce } from '../scripts/site/shell.mjs'
import { readRenameTable } from '../scripts/rename-tokens.mjs'
import { read } from './css.mjs'

// The site pages share components.html's shell byte for byte, and the package copy of the
// catalogue keeps its own header, whose links must resolve inside language/.
const template = read('language/components.html')
const pkg = JSON.parse(read('package.json'))
const files = new Map(siteFiles({ version: '9.9.9' }))
const pages = [['index.html', 'a section'], ['foundations.html', 'a token'], ['components.html', 'a component']]

test('every site page shares the shell CSS, icons, script, and shell markup with components.html', () => {
  for (const [file, noun] of pages) assert.deepEqual(shellDrift({ template, page: files.get(file), noun }), [], file)
})

test('the drift guard names the shared part that changed', () => {
  const page = files.get('foundations.html')
  const edited = page
    .replace('.icon { width: 16px;', '.icon { width: 17px;')
    .replace('const reduced = matchMedia', 'const reduced  = matchMedia')
    .replace('id="section-menu" aria-label="Menu"', 'id="section-menu" aria-label="Open menu"')
  assert.deepEqual(shellDrift({ template, page: edited, noun: 'a token' }), ['style', 'script', 'section bar'])
})

test('a template change that removes a splice point stops the build', () => {
  assert.throws(() => sitePage({ template: template.replace('<title>Component catalogue</title>', '<title>Catalogue</title>'), current: 'components', title: 'Components' }), /expected one "<title>Component catalogue<\/title>", found 0/)
  // A <main> with another attribute, or a pager that no longer ends it, has no safe splice.
  const page = { current: 'overview', title: 'Overview', main: '<p>Hi</p>' }
  assert.throws(() => sitePage({ ...page, template: template.replace('<main id="main">', '<main id="main" aria-label="Components">') }), /expected one "<main id=\\"main\\">", found 0/)
  assert.throws(() => sitePage({ ...page, template: template.replace('</nav>\n</main>', '</nav>\n  <p>Last</p>\n</main>') }), /expected one "<\/nav>\\n<\/main>", found 0/)
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
  assert.match(template, /<nav class="navlist strip" aria-label="Pages">.*<a href="reference\.html#foundations">Foundations<\/a>/)
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

test('implementations.json names real components with a component and an https URL', () => {
  const implementations = JSON.parse(read('language/implementations.json'))
  const components = catalogueComponents(template)
  assert.equal(components.length, template.split('<section class="component"').length - 1)
  assert.deepEqual(implementationProblems({ implementations, components }), [])
  assert.deepEqual(implementationProblems({ implementations: { vue: { buton: { component: 'UiButton', url: 'http://x' } } }, components }), [
    'no react map', 'vue: no component buton', 'vue.buton: needs a component and an https url',
  ])
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
  const source = JSON.parse(read('tokens/graphite-indigo.json'))
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
