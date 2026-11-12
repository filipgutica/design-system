// Builds the design-system site into site/ (gitignored), which GitHub Pages serves:
//
//   node scripts/build-site.mjs
//
// - index.html (Overview), foundations.html, components.html, and themes.html share one shell, taken from
//   language/components.html (scripts/site/shell.mjs says how).
// - index.json and llms.txt index the components for agents and tools.
// - The language pages and files the site links to, and the fonts, are copied as they ship.
//
// The version is the latest ds-v* release tag, since package.json keeps 0.0.0-development and
// semantic-release tags each release. The header's project menu lists the family's projects from ui's
// published list (PROJECTS_URL), so the build needs the network.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readRenameTable } from './rename-tokens.mjs'
import { COMPONENTS_CSS, catalogueComponents, componentIndex, implementationProblems, llmsTxt, specGuidance, withImplementationLinks } from './site/components.mjs'
import { foundationsPage } from './site/foundations.mjs'
import { overviewPage } from './site/overview.mjs'
import { PROJECTS_URL, parseProjects, sitePage } from './site/shell.mjs'
import { themesPage } from './site/themes.mjs'
import { readTokens } from './build-tokens.mjs'

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

/**
 * The published project list, as parseProjects keeps it. A failed attempt is tried twice more, a second
 * apart; then the build stops, because a page must not ship an empty project menu.
 */
export const fetchProjects = async ({ url = PROJECTS_URL, attempts = 3, delay = 1000 } = {}) => {
  let reason = ''
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1) await new Promise((done) => setTimeout(done, delay))
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      const projects = response.status === 200 ? parseProjects(await response.json()) : undefined
      if (projects) return projects
      reason = response.status === 200 ? 'no valid entries' : `status ${response.status}`
    } catch (error) {
      reason = error.message
    }
  }
  throw new Error(`Could not load the project list from ${url} after ${attempts} attempts: ${reason}`)
}

/** Every generated site file, as [path under site/, content]. `projects` is the family's project list. */
export const siteFiles = ({ version, projects }) => {
  const template = read('language/components.html')
  const pkg = readJson('package.json')
  const implementations = readJson('language/implementations.json')
  const components = catalogueComponents(template)
  const guidance = specGuidance({ markdown: read('language/components.md'), components })
  const problems = implementationProblems({ implementations, components })
  if (problems.length) throw new Error(`language/implementations.json:\n  ${problems.join('\n  ')}`)

  const overview = overviewPage({ pkg, version })
  const foundations = foundationsPage({
    source: readJson('tokens/core.json'),
    values: readJson('dist/tokens.json').themes['graphite-indigo'],
    renames: readRenameTable(read('language/decisions.md')),
    version,
    packageName: pkg.name,
  })
  const catalogue = sitePage({ template, projects, current: 'components', title: 'Components · Design system', css: COMPONENTS_CSS })
  const themes = themesPage({
    themes: readTokens(root).themes.map(({ data, ...theme }) => theme),
    values: readJson('dist/tokens.json').themes,
    packageName: pkg.name,
  })

  return [
    ['index.html', sitePage({ template, projects, current: 'overview', ...overview })],
    ['foundations.html', sitePage({ template, projects, current: 'foundations', ...foundations })],
    ['components.html', withImplementationLinks({ html: catalogue, implementations })],
    ['themes.html', sitePage({ template, projects, current: 'themes', ...themes })],
    ['index.json', `${JSON.stringify(componentIndex({ components, guidance, implementations, pkg, version }), null, 2)}\n`],
    ['llms.txt', llmsTxt({ components, pkg, version })],
  ]
}

const run = async () => {
  const out = `${root}site/`
  const files = siteFiles({ version: releaseVersion(), projects: await fetchProjects() })
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  for (const name of COPIED) cpSync(`${root}language/${name}`, `${out}${name}`, { recursive: true })
  cpSync(`${root}fonts`, `${out}fonts`, { recursive: true })
  for (const [path, content] of files) writeFileSync(`${out}${path}`, content)
  console.log(`site/: ${files.map(([path]) => path).join(', ')}, ${COPIED.join(', ')}, and fonts/`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run()
