import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { COPIED, siteFiles } from '../scripts/build-site.mjs'
import { catalogueComponents, implementationProblems } from '../scripts/site/components.mjs'
import { foundationsPage } from '../scripts/site/foundations.mjs'
import { overviewPage } from '../scripts/site/overview.mjs'
import { shellDrift, sitePage } from '../scripts/site/shell.mjs'
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
})

// Local links in a page: [target file, fragment], for href and src values that stay on the site. A
// value with a ${…} is a template literal in a script, not a link.
const localLinks = (html) => [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(([, value]) => value.replace(/&amp;/g, '&'))
  .filter((value) => !/^(?:[a-z]+:|\/\/|#$)/.test(value) && !value.includes('${'))
  .map((value) => { const [path, hash = ''] = value.split('#'); return [path, hash] })

// Dead links in `files` (name → content), resolved against `exists(name)` and each HTML target's ids.
const deadLinks = ({ files: pageFiles, exists, read: readTarget }) => [...pageFiles].flatMap(([name, html]) => localLinks(html)
  .filter(([path, hash]) => {
    const target = path || name
    if (!exists(target)) return true
    return Boolean(hash) && target.endsWith('.html') && !readTarget(target).includes(`id="${hash}"`)
  })
  .map(([path, hash]) => `${name}: ${path}${hash ? `#${hash}` : ''}`))

const languageHtml = new Map(readdirSync('language').filter((name) => name.endsWith('.html')).map((name) => [name, read(`language/${name}`)]))
const inLanguage = { exists: (name) => existsSync(`language/${name}`), read: (name) => read(`language/${name}`) }

test('every link in the package copy of the language pages resolves inside language/', () => {
  assert.deepEqual(deadLinks({ files: languageHtml, ...inLanguage }), [])
  assert.match(template, /<nav class="navlist strip" aria-label="Pages">.*<a href="reference\.html#foundations">Foundations<\/a>/)
})

test('the link check catches a missing page and a missing fragment', () => {
  const planted = new Map([['components.html', '<a href="index.html">Overview</a><a href="#nowhere">Gone</a><a href="docs.html#start">Start</a><a href="https://example.com">x</a>']])
  assert.deepEqual(deadLinks({ files: planted, ...inLanguage }), ['components.html: index.html', 'components.html: #nowhere'])
})

// site/ holds the generated files, the copied language files, and fonts/, and nothing else from the repository.
const copied = new Map(COPIED.map((name) => [name, read(`language/${name}`)]))
const inSite = {
  exists: (name) => files.has(name) || copied.has(name) || (name.startsWith('fonts/') && existsSync(name)),
  read: (name) => files.get(name) ?? copied.get(name),
}

test('every link in the built site resolves inside site/', () => {
  const sitePages = new Map([...files, ...copied].filter(([name]) => name.endsWith('.html')))
  assert.deepEqual(deadLinks({ files: sitePages, ...inSite }), [])
})

test('the site link check catches a file the repository has but site/ does not', () => {
  const planted = new Map([['docs.html', '<a href="README.md">Read me</a><a href="fonts/fonts.css">Fonts</a><a href="tokens.css">Tokens</a>']])
  assert.deepEqual(deadLinks({ files: planted, ...inSite }), ['docs.html: README.md'])
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
  const rows = [...main.matchAll(/<th scope="row"><span class="token"><code>--([\w-]+)<\/code>/g)].map(([, name]) => name)
  assert.equal(total, Object.keys(values.light).length)
  assert.deepEqual(rows.toSorted(), Object.keys(values.light).toSorted())
  assert.equal(main.split('<span class="was">Formerly').length - 1, [...renames.values()].filter((to) => to.slice(2) in values.light).length)
  assert.match(main, /<code>--color-bg<\/code>.*<span class="was">Formerly <code>--bg<\/code>/)
  // A source group the page does not place stops the build instead of dropping its tokens.
  const extra = { ...source, groups: [...source.groups, { id: 'new-group', title: 'New', note: 'New.', roles: {}, tokens: {} }] }
  assert.throws(() => foundationsPage({ source: extra, values, renames, version: '9.9.9', packageName: pkg.name }), /no rail group for new-group/)
})
