// Builds the design-system site into site/ (gitignored), which GitHub Pages serves:
//
//   node scripts/build-site.mjs
//
// - index.html (Overview), foundations.html, and components.html share one shell, taken from
//   language/components.html (scripts/site/shell.mjs says how).
// - index.json and llms.txt index the components for agents and tools.
// - The language pages and files the site links to, and the fonts, are copied as they ship.
//
// The version is the latest ds-v* release tag, since package.json keeps 0.0.0-development and
// semantic-release tags each release.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readRenameTable } from './rename-tokens.mjs'
import { COMPONENTS_CSS, catalogueComponents, componentIndex, implementationProblems, llmsTxt, specGuidance, withImplementationLinks } from './site/components.mjs'
import { foundationsPage } from './site/foundations.mjs'
import { overviewPage } from './site/overview.mjs'
import { sitePage } from './site/shell.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path) => readFileSync(`${root}${path}`, 'utf8')
const readJson = (path) => JSON.parse(read(path))

/** The language files and folders the site serves as they ship, beside the generated pages. */
export const COPIED = ['tokens.css', 'reference.html', 'docs.html', 'product.html', 'DESIGN.md', 'components.md', 'decisions.md', 'visualizations.md', 'visualizations', 'implementations.json']

/**
 * The latest release, from the ds-v* tags; the v* tags are the earlier version series. A checkout
 * without tags cannot know it, so the build stops.
 */
export const releaseVersion = (cwd = root) => {
  const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'ds-v[0-9]*'], { cwd, encoding: 'utf8' }).trim()
  return tag.slice('ds-v'.length)
}

/** Every generated site file, as [path under site/, content]. */
export const siteFiles = ({ version }) => {
  const template = read('language/components.html')
  const pkg = readJson('package.json')
  const implementations = readJson('language/implementations.json')
  const components = catalogueComponents(template)
  const guidance = specGuidance({ markdown: read('language/components.md'), components })
  const problems = implementationProblems({ implementations, components })
  if (problems.length) throw new Error(`language/implementations.json:\n  ${problems.join('\n  ')}`)

  const overview = overviewPage({ pkg, version })
  const foundations = foundationsPage({
    source: readJson('tokens/graphite-indigo.json'),
    values: readJson('dist/tokens.json').themes['graphite-indigo'],
    renames: readRenameTable(read('language/decisions.md')),
    version,
    packageName: pkg.name,
  })
  const catalogue = sitePage({ template, current: 'components', title: 'Components · Design system', css: COMPONENTS_CSS })

  return [
    ['index.html', sitePage({ template, current: 'overview', ...overview })],
    ['foundations.html', sitePage({ template, current: 'foundations', ...foundations })],
    ['components.html', withImplementationLinks({ html: catalogue, implementations })],
    ['index.json', `${JSON.stringify(componentIndex({ components, guidance, implementations, pkg, version }), null, 2)}\n`],
    ['llms.txt', llmsTxt({ components, pkg, version })],
  ]
}

const run = () => {
  const out = `${root}site/`
  const files = siteFiles({ version: releaseVersion() })
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  for (const name of COPIED) cpSync(`${root}language/${name}`, `${out}${name}`, { recursive: true })
  cpSync(`${root}fonts`, `${out}fonts`, { recursive: true })
  for (const [path, content] of files) writeFileSync(`${out}${path}`, content)
  console.log(`site/: ${files.map(([path]) => path).join(', ')}, ${COPIED.join(', ')}, and fonts/`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
