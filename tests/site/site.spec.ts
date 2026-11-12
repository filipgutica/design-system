import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'
import FIXTURE_PROJECTS from '../fixtures/projects.json' with { type: 'json' }

// The built site, served under /design-system/ as on GitHub Pages: each page's layout, accessibility,
// script, and links, the header and pager order, and Foundations' Find and Copy.
const PAGES = [
  { path: '', name: 'Overview', find: 'a section' },
  { path: 'foundations.html', name: 'Foundations', find: 'a token' },
  { path: 'components.html', name: 'Components', find: 'a component' },
  { path: 'themes.html', name: 'Themes', find: 'a theme' },
]
const SITE_URL = 'https://filipgutica.github.io/design-system/'

// The test build renders every page's project menu from the fixture (see test:site in package.json), and
// each page's refresh is served the same fixture, so no test reaches ui's published list. Any other request
// that leaves the local server is aborted and fails the test.
const PROJECTS_URL = 'https://filipgutica.github.io/ui/projects.json'
type Project = { id: string, label: string, href: string, repository: string }
const PROJECTS: Project[] = FIXTURE_PROJECTS
let external: string[] = []
const serveProjects = (context: BrowserContext) => context.route((url) => url.hostname !== '127.0.0.1', (route) => {
  if (route.request().url() === PROJECTS_URL) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PROJECTS) })
  external.push(route.request().url())
  return route.abort()
})
test.beforeEach(({ context }) => {
  external = []
  return serveProjects(context)
})
test.afterEach(() => expect(external, 'requests that left the local server').toEqual([]))
// The project menu's links, as [label, href], and its summary's name.
const projectMenu = async (page: Page) => ({
  summary: await page.locator('.page-head > .projects > summary').getAttribute('aria-label'),
  links: await page.locator('.page-head > .projects nav a').evaluateAll((as) => as.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])),
})
const menuOf = (projects: Project[], current = 'design-system') => projects.map(({ id, label, href }) => [label, href, id === current ? 'page' : null])

const collectErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

for (const { path, name, find } of PAGES) {
  test.describe(name, () => {
    for (const width of [390, 720, 1280]) {
      test(`no horizontal overflow or page error at ${width}px`, async ({ page }) => {
        const errors = collectErrors(page)
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        // The page reserves a scrollbar gutter, which headless Linux leaves empty, so this can be negative.
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
        expect(errors).toEqual([])
      })
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`axe finds no violations in ${colorScheme}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 }, baseURL: test.info().project.use.baseURL })
        await serveProjects(context)
    const page = await context.newPage()
        await page.goto(path)
        const { violations } = await new AxeBuilder({ page }).analyze()
        expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
        await context.close()
      })
    }

    test('the header strip and the pager run Overview, Foundations, Components, Themes', async ({ page }) => {
      await page.goto(path)
      const strip = page.locator('.page-head .strip a')
      await expect(strip).toHaveText(PAGES.map((p) => p.name))
      await expect(page.locator('.page-head .strip a[aria-current="page"]')).toHaveText(name)
      const index = PAGES.findIndex((p) => p.name === name)
      const pager = page.locator('main > .pager')
      await expect(pager.locator('a[rel="prev"] .pager-title')).toHaveText(index > 0 ? [PAGES[index - 1].name] : [])
      await expect(pager.locator('a[rel="next"] .pager-title')).toHaveText(index < PAGES.length - 1 ? [PAGES[index + 1].name] : [])
      await expect(page.locator('#find')).toHaveAttribute('placeholder', `Find ${find}`)
    })

    test('every link inside the site resolves, and every fragment names an element', async ({ page, request }) => {
      await page.goto(path)
      const base = new URL(page.url())
      const hrefs = await page.locator('a[href], link[href]').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))
      const local = [...new Set(hrefs.map((href) => new URL(href, page.url())).filter((url) => url.origin === base.origin).map((url) => url.href))]
      expect(local.length).toBeGreaterThan(5)
      const documents = new Map<string, string>()
      for (const href of local) {
        const url = new URL(href)
        const target = `${url.origin}${url.pathname}`
        if (!documents.has(target)) {
          const response = await request.get(target)
          expect(response.status(), target).toBe(200)
          documents.set(target, url.pathname.endsWith('.html') || url.pathname.endsWith('/') ? await response.text() : '')
        }
        if (url.hash && documents.get(target)) expect(documents.get(target), href).toContain(`id="${decodeURIComponent(url.hash.slice(1))}"`)
      }
    })
  })

  test.describe(`${name} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false })
    for (const width of [390, 1280]) {
      test(`links are visible and Find is hidden at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        const links = page.locator('#rail .rail-list a')
        expect(await links.count()).toBeGreaterThan(4)
        for (const link of await links.all()) await expect(link).toBeVisible()
        for (const link of await page.locator('.page-head .strip a').all()) await expect(link).toBeVisible()
        await expect(page.locator('#find')).toBeHidden()
        await expect(page.locator('#section-menu')).toBeHidden()
        await expect(page.locator('.page-head [aria-label="Appearance"]')).toBeHidden()
      })
    }

    test('the project menu opens and lists the published projects', async ({ page }) => {
      await page.goto(path)
      const menu = page.locator('.page-head > .projects')
      await menu.locator('summary').click()
      for (const link of await menu.locator('nav a').all()) await expect(link).toBeVisible()
      expect(await projectMenu(page)).toEqual({ summary: 'Project: Design system', links: menuOf(PROJECTS) })
    })
  })

  test.describe(`${name} project menu`, () => {
    test('starts the header, with this site current, and lists the published projects', async ({ page }) => {
      await page.goto(path)
      expect(await page.locator('.page-head > *').first().evaluate((el) => el.matches('details.projects'))).toBe(true)
      await expect(page.locator('.page-head > .projects nav a[aria-current="page"]')).toHaveText('Design system')
      expect(await projectMenu(page)).toEqual({ summary: 'Project: Design system', links: menuOf(PROJECTS) })
    })

    test('keeps the built list when the fetch fails, and logs nothing of its own', async ({ page }) => {
      const errors = collectErrors(page)
      await page.route(PROJECTS_URL, (route) => route.abort())
      const fetched = page.waitForEvent('requestfailed', (request) => request.url() === PROJECTS_URL)
      await page.goto(path)
      await fetched
      await page.evaluate(() => new Promise((done) => setTimeout(done, 100)))
      expect(await projectMenu(page)).toEqual({ summary: 'Project: Design system', links: menuOf(PROJECTS) })
      // Chromium reports the failed request itself; the page's script adds nothing.
      expect(errors.filter((error) => !error.startsWith('Failed to load resource'))).toEqual([])
    })
  })
}

test('the project menu takes a published list that differs, keeping only valid entries', async ({ page }) => {
  const built = PROJECTS
  const project = (id: string, extra: Partial<Project> = {}) => ({ id, label: `${id} site`, href: `https://example.com/${id}/`, repository: `https://example.com/repo/${id}`, ...extra })
  // An http link, a javascript: repository, an empty label, and a repeated id are dropped; the list stops at 20.
  // This site is missing, so it keeps its built entry at its built place.
  const remote = [
    project('new'), project('plain', { href: 'http://example.com/plain/' }), project('script', { repository: 'javascript:alert(1)' }),
    project('blank', { label: ' ' }), project('new', { label: 'Second new' }),
    ...Array.from({ length: 25 }, (_, i) => project(`p${i}`)),
  ]
  await page.route(PROJECTS_URL, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remote) }))
  await page.goto('components.html')
  const kept = [project('new'), ...Array.from({ length: 19 }, (_, i) => project(`p${i}`))]
  const own = built.findIndex(({ id }) => id === 'design-system')
  const expected = menuOf(kept)
  expected.splice(own, 0, menuOf(built)[own])
  await expect.poll(async () => (await projectMenu(page)).links).toEqual(expected)
  expect((await projectMenu(page)).summary).toBe('Project: Design system')
})

test('the project menu follows a new label for this site, and ignores a list it cannot use', async ({ page }) => {
  const built = PROJECTS
  const renamed = built.map((p) => (p.id === 'design-system' ? { ...p, label: 'Design language' } : p))
  await page.route(PROJECTS_URL, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(renamed) }))
  await page.goto('')
  await expect(page.locator('.page-head > .projects > summary')).toHaveAttribute('aria-label', 'Project: Design language')
  await expect(page.locator('.page-head > .projects > summary > span')).toHaveText('Design language')
  // A non-200 response and a list with no valid entry both keep the built menu.
  for (const [status, body] of [[404, JSON.stringify(renamed)], [200, JSON.stringify([{ id: 'x', label: 'X', href: 'http://x/', repository: 'https://x/' }])]] as const) {
    await page.unroute(PROJECTS_URL)
    const served = page.waitForResponse(PROJECTS_URL)
    await page.route(PROJECTS_URL, (route) => route.fulfill({ status, contentType: 'application/json', body }))
    await page.goto('foundations.html')
    await served
    await page.evaluate(() => new Promise((done) => setTimeout(done, 100)))
    expect(await projectMenu(page), `${status} ${body.slice(0, 40)}`).toEqual({ summary: 'Project: Design system', links: menuOf(built) })
  }
})

// A list that arrives while the reader is in the open menu updates it around the focused link, so the
// menu stays open and focus stays put. A list without the focused link's project waits until the menu closes.
const menuLinks = (page: Page) => page.locator('.page-head > .projects nav a').allTextContents()
for (const { kind, remote, during, after } of [
  { kind: 'the same list', remote: PROJECTS, during: ['annoterm', 'Design system', 'UI'], after: ['annoterm', 'Design system', 'UI'] },
  {
    kind: 'a changed list',
    remote: [PROJECTS[1], { ...PROJECTS[0], id: 'zeta', label: 'zeta' }, { ...PROJECTS[2], label: 'UI kit' }, { ...PROJECTS[0], id: 'omega', label: 'omega' }],
    during: ['Design system', 'zeta', 'UI kit', 'omega'],
    after: ['Design system', 'zeta', 'UI kit', 'omega'],
  },
  { kind: 'a list without the focused project', remote: [PROJECTS[1], PROJECTS[0]], during: ['annoterm', 'Design system', 'UI'], after: ['Design system', 'annoterm'] },
]) {
  test(`a list that arrives while a project link has focus keeps the menu open and the focus: ${kind}`, async ({ page }) => {
    let release = () => {}
    const released = new Promise<void>((done) => { release = done })
    await page.route(PROJECTS_URL, async (route) => {
      await released
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remote) })
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('components.html')
    const menu = page.locator('.page-head > .projects')
    await menu.locator('summary').click()
    const link = menu.locator('nav a[data-project="ui"]')
    await link.focus()
    const node = await link.elementHandle()
    const served = page.waitForResponse(PROJECTS_URL)
    release()
    await served
    await page.evaluate(() => new Promise((done) => setTimeout(done, 100)))
    await expect(menu).toHaveAttribute('open', '')
    expect(await node!.evaluate((a) => a === document.activeElement && a.isConnected)).toBe(true)
    expect(await menuLinks(page)).toEqual(during)
    await page.keyboard.press('Escape')
    await expect(menu).not.toHaveAttribute('open')
    await expect.poll(() => menuLinks(page)).toEqual(after)
  })
}

// A script may close the menu while a link that the new list drops still has focus. The deferred update
// then applies on close, so the menu shows the new list when it opens again.
test('a deferred list applies when a script closes the menu', async ({ page }) => {
  let release = () => {}
  const released = new Promise<void>((done) => { release = done })
  await page.route(PROJECTS_URL, async (route) => {
    await released
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([PROJECTS[1], PROJECTS[0]]) })
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('components.html')
  const menu = page.locator('.page-head > .projects')
  await menu.locator('summary').click()
  await menu.locator('nav a[data-project="ui"]').focus()
  const served = page.waitForResponse(PROJECTS_URL)
  release()
  await served
  await page.evaluate(() => new Promise((done) => setTimeout(done, 100)))
  expect(await menuLinks(page)).toEqual(['annoterm', 'Design system', 'UI'])
  await menu.evaluate((details: HTMLDetailsElement) => { details.open = false })
  await expect(menu).not.toHaveAttribute('open')
  await menu.evaluate((details: HTMLDetailsElement) => { details.open = true })
  await expect.poll(() => menuLinks(page)).toEqual(['Design system', 'annoterm'])
})

test('Escape closes the project menu and returns focus to it; leaving it closes it too', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('themes.html')
  const menu = page.locator('.page-head > .projects')
  const summary = menu.locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('open', '')
  await page.keyboard.press('Tab')
  await expect(menu.locator('nav a').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).not.toHaveAttribute('open')
  await expect(summary).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('open', '')
  await page.locator('.page-head .strip a').first().focus()
  await expect(menu).not.toHaveAttribute('open')
})

test.describe('Foundations Find', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  const shownTokens = (page: Page) => page.locator('.tokens tbody tr:not([hidden]) th .token > code')

  for (const [kind, query, token] of [
    ['name', 'color-bg', '--color-bg'],
    ['former name', '--project-dark', '--color-project-dark'],
    ['role', 'focus ring', '--color-focus'],
    ['value', '#4b45d1', '--color-project'],
  ]) {
    test(`filters the rows by ${kind}`, async ({ page }) => {
      await page.goto('foundations.html')
      await page.locator('#find').fill(query)
      await expect(shownTokens(page)).toContainText([token])
      const total = await page.locator('.tokens tbody tr').count()
      expect(await shownTokens(page).count()).toBeLessThan(total)
      await expect(page.locator('#find-summary')).toContainText(`for “${query}”`)
      // A group without a matching row hides, and so does its rail link.
      await expect(page.locator('section[data-group]:not([hidden])')).toHaveCount(await page.locator('#rail .rail-list a:not([hidden])').count())
    })
  }

  test('shows its empty state, and Clear brings every row back', async ({ page }) => {
    await page.goto('foundations.html')
    const total = await page.locator('.tokens tbody tr').count()
    await page.locator('#find').fill('no-such-token')
    await expect(shownTokens(page)).toHaveCount(0)
    await expect(page.locator('#find-summary p')).toHaveText('No token matches “no-such-token”.')
    await expect(page.locator('#find-empty')).toBeVisible()
    await expect(page.locator('#find-empty')).toContainText('No token matches')
    await page.locator('#find-summary-clear').click()
    await expect(page.locator('#find')).toHaveValue('')
    await expect(shownTokens(page)).toHaveCount(total)
    await expect(page.locator('#find-summary')).toBeHidden()
    await expect(page.locator('#rail .rail-list a:not([hidden])')).toHaveCount(await page.locator('#rail .rail-list a').count())
  })

  test('Escape clears the rows filter along with the rail', async ({ page }) => {
    await page.goto('foundations.html')
    await page.locator('#find').fill('motion')
    await page.locator('#find').press('Escape')
    await expect(page.locator('#find')).toHaveValue('')
    await expect(page.locator('.tokens tbody tr[hidden]')).toHaveCount(0)
  })

  // Each word matches some token in the group, but no single token has them all.
  for (const query of ['body 600', 'surface-raised shadow']) {
    test(`keeps a rail link only while its group has a matching row: "${query}"`, async ({ page }) => {
      await page.goto('foundations.html')
      await page.locator('#find').fill(query)
      await expect(shownTokens(page)).toHaveCount(0)
      await expect(page.locator('section[data-group]:not([hidden])')).toHaveCount(0)
      await expect(page.locator('#rail .rail-list a:not([hidden])')).toHaveCount(0)
      await expect(page.locator('#find-empty')).toBeVisible()
    })
  }

  test('announces the number of tokens it shows', async ({ page }) => {
    await page.goto('foundations.html')
    await page.locator('#find').fill('focus ring')
    const shown = await shownTokens(page).count()
    expect(shown).toBeGreaterThan(1)
    await expect(page.locator('#find-count')).toHaveText(`${shown} tokens`)
    await page.locator('#find').fill('--color-bg')
    await expect(page.locator('#find-count')).toHaveText('1 token')
    await page.locator('#find').fill('no-such-token')
    await expect(page.locator('#find-count')).toHaveText('No tokens')
  })
})

test.describe('Foundations table', () => {
  // Below 1101px each row is a record; from 1101px it is four columns.
  for (const width of [390, 801, 900, 1000, 1100, 1101, 1200, 1280, 1440]) {
    test(`every name, value, and Copy stays inside its own cell at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('foundations.html')
      const escapes = await page.locator('.tokens tbody :is(th, td)').evaluateAll((cells) => cells.flatMap((cell) => {
        const box = cell.getBoundingClientRect()
        return [...cell.querySelectorAll('code, .family, .copy, i, .sample, .was')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5) })
          .map((el) => `${cell.closest('tr')!.querySelector('.name')!.textContent}: ${el.className || el.tagName}`)
      }))
      expect(escapes).toEqual([])
      // A font family never breaks inside itself: its text's line boxes all share one top. The element
      // is an inline-block, which has one box however its text wraps, so the check measures the text.
      const broken = await page.locator('.family').evaluateAll((families) => families.filter((family) => {
        const range = document.createRange()
        range.selectNodeContents(family)
        return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size > 1
      }).map((family) => family.textContent))
      expect(broken).toEqual([])
    })
  }

  test('a token name sits level with its values, with its former name right under it, and Copy shows beside it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('foundations.html')
    const row = page.locator('.tokens tbody tr', { has: page.locator('.name', { hasText: /^--color-bg$/ }) })
    const name = (await row.locator('.name').boundingBox())!
    const value = (await row.locator('td[data-label="Light"] code').boundingBox())!
    const was = (await row.locator('.was').boundingBox())!
    expect(Math.abs(name.y - value.y)).toBeLessThanOrEqual(2)
    expect(was.y - (name.y + name.height)).toBeLessThanOrEqual(4)
    // Copy shows without a hover, so every reader can find it, and it is in the tab order.
    const copy = row.getByRole('button', { name: 'Copy var(--color-bg)' })
    expect(await copy.evaluate((b) => getComputedStyle(b).opacity)).toBe('1')
    const copyBox = (await copy.boundingBox())!
    expect(copyBox.x - (name.x + name.width)).toBeLessThanOrEqual(12)
    await page.locator('.tokens tbody tr').first().locator('.copy').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('.tokens tbody tr').nth(1).locator('.copy')).toBeFocused()
  })
})

// The project switcher, then the pages, at the same x on every page. Each link is current on one page,
// so the same width on every page means becoming current changes no width.
// Forced colors draws the current link's border, which must not widen it either.
for (const forcedColors of ['none', 'active'] as const) test(`the header links sit at the same x on every page, and the current link keeps its width, with forced colors ${forcedColors}`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ forcedColors })
  const boxes: { x: number; width: number }[][] = []
  for (const { path } of PAGES) {
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    const head = page.locator('.page-head')
    await expect(head.locator('.crumbs')).toHaveCount(0)
    await expect(head.locator('> .projects > summary')).toHaveAttribute('aria-label', 'Project: Design system')
    expect(await head.evaluate((h) => { const style = getComputedStyle(h); return [style.borderBottomStyle, style.borderBottomWidth, style.borderBottomColor === style.color] })).toEqual(['solid', '1px', true])
    const links = head.locator('.strip a')
    for (const { name } of PAGES) {
      // The hidden copy that reserves the width holds the label, and stays out of the link's name.
      await expect(head.getByRole('link', { name, exact: true })).toHaveAttribute('data-label', name)
    }
    boxes.push(await links.evaluateAll((as) => as.map((a) => {
      const { x, width } = a.getBoundingClientRect()
      return { x, width }
    })))
  }
  const [first, ...rest] = boxes
  rest.forEach((pageBoxes, p) => pageBoxes.forEach(({ x, width }, i) => {
    expect(Math.abs(x - first[i].x), `${PAGES[p + 1].name}: link ${i} at x=${x}, ${first[i].x} on Overview`).toBeLessThanOrEqual(0.5)
    expect(Math.abs(width - first[i].width), `${PAGES[p + 1].name}: link ${i} ${width}px wide, ${first[i].width}px on Overview`).toBeLessThanOrEqual(0.5)
  }))
})

test('the breadcrumb sits above the h1 on every page but Overview, with no separator text', async ({ page }) => {
  for (const { path, name } of PAGES) {
    await page.goto(path)
    const trails = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
    if (name === 'Overview') {
      await expect(trails).toHaveCount(0)
      continue
    }
    await expect(trails).toHaveCount(1)
    const trail = page.locator('main').getByRole('navigation', { name: 'Breadcrumb', exact: true })
    expect(await trail.evaluate((nav) => nav.nextElementSibling?.tagName), name).toBe('H1')
    // The snapshot reads CSS generated content too, so a separator drawn as text would show in it.
    expect(await trail.ariaSnapshot(), name).toBe([
      '- navigation "Breadcrumb":',
      '  - list:',
      '    - listitem:',
      '      - link "Design system":',
      '        - /url: index.html',
      `    - listitem: ${name}`,
    ].join('\n'))
    const current = trail.locator('[aria-current="page"]')
    await expect(current).toHaveText(name)
    expect(await current.evaluate((el) => el.closest('a')), name).toBeNull()
  }
})

// The trail's line, not its links' touch boxes, sets where it sits: at 1280px its text centres on the Find
// field beside it, as in the approved mock. On phones a two-crumb trail shows in full.
test('the breadcrumb lines up with Find, and shows both crumbs on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('foundations.html')
  const middle = (box: { y: number; height: number }) => box.y + box.height / 2
  const text = await page.locator('main .crumbs a').evaluate((a) => {
    const range = document.createRange()
    range.selectNodeContents(a)
    const { y, height } = range.getBoundingClientRect()
    return { y, height }
  })
  const find = (await page.locator('#find').boundingBox())!
  expect(Math.abs(middle(text) - middle(find)), `text centre ${middle(text)}, Find centre ${middle(find)}`).toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const item of await page.locator('main .crumbs li').all()) await expect(item).toBeVisible()
  await expect(page.locator('main .crumbs a')).toHaveText('Design system')
})

// 320px is the narrowest phone; headless Linux also takes a scrollbar gutter out of 390px.
for (const width of [390, 320]) {
  test.describe(`phone at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } })

    for (const { path, name } of PAGES) {
      const wraps = width === 320
      test(`${name}: the switcher and appearance ${wraps ? 'take a row each' : 'share the first row'}, then the pages, then the trigger`, async ({ page }) => {
        await page.goto(path)
        await page.evaluate(() => document.fonts.ready)
        const box = async (selector: string) => (await page.locator(selector).boundingBox())!
        const [frame, head, switcher, appearance, strip, trigger] = await Promise.all(['.frame', '.page-head', '.page-head > .projects > summary', '.page-head > [aria-label="Appearance"]', '.page-head > .strip', '#section-menu'].map(box))
        const middle = (b: { y: number, height: number }) => b.y + b.height / 2
        // The switcher starts row 1 and shows the project's whole name.
        expect(switcher.x).toBeCloseTo(frame.x, 0)
        expect(switcher.height).toBeGreaterThanOrEqual(44)
        await expect(page.locator('.page-head > .projects > summary > span')).toHaveText('Design system')
        expect(await page.locator('.page-head > .projects > summary > span').evaluate((span) => span.scrollWidth <= span.clientWidth)).toBe(true)
        if (wraps) {
          // 320px: the appearance control takes its own row, at the start.
          expect(appearance.x).toBeCloseTo(frame.x, 0)
          expect(appearance.y).toBeGreaterThanOrEqual(switcher.y + switcher.height)
        } else {
          // Wider phones: the appearance control ends row 1.
          expect(appearance.x + appearance.width).toBeCloseTo(frame.x + frame.width, 0)
          expect(Math.abs(middle(switcher) - middle(appearance))).toBeLessThanOrEqual(1)
        }
        // Then the pages, below both.
        expect(strip.y).toBeGreaterThanOrEqual(Math.max(switcher.y + switcher.height, appearance.y + appearance.height))
        // Below the header's rule, 8px down, before the breadcrumb or title: the trigger, at the start.
        expect(trigger.y - (head.y + head.height)).toBeCloseTo(8, 0)
        expect(trigger.x).toBeCloseTo(frame.x, 0)
        expect(trigger.y + trigger.height).toBeLessThan((await box('main h1')).y)
        await expect(page.locator('#section-menu')).toHaveText(new RegExp(`^${name}: .+`))
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
        // No icon-only Find or Menu button.
        await expect(page.getByRole('button', { name: /^(Menu|Find .*)$/ })).toHaveCount(0)
      })
    }

    if (width === 320) {
      // A clipped strip link shows at least 16px under the 24px fade, so the clip reads as more links.
      // Phones have overlay scrollbars, so the page is sized to 320px of content even where the browser
      // takes a scrollbar gutter.
      for (const { path, name } of PAGES) test(`${name}: every clipped strip link shows at least 16px`, async ({ page }) => {
        await page.goto(path)
        const gutter = await page.evaluate(() => innerWidth - document.documentElement.clientWidth)
        await page.setViewportSize({ width: 320 + gutter, height: 844 })
        await page.evaluate(() => document.fonts.ready)
        const shown = await page.locator('.page-head > .strip').evaluate((strip) => {
          const box = strip.getBoundingClientRect()
          return [...strip.querySelectorAll('a')].map((a) => {
            const r = a.getBoundingClientRect()
            return { label: a.textContent, width: r.width, inside: Math.min(r.right, box.right) - Math.max(r.left, box.left) }
          })
        })
        expect(shown.some(({ inside, width }) => inside < width - 0.5), 'a link is clipped at 320px').toBe(true)
        for (const { label, inside, width } of shown) if (inside < width - 0.5) expect(inside, `${label} shows ${inside}px`).toBeGreaterThanOrEqual(16)
      })
    }

    test('a trigger label that wraps grows the button and keeps 8px above and below it', async ({ page }) => {
      await page.goto('components.html')
      const trigger = page.locator('#section-menu')
      expect((await trigger.boundingBox())!.height).toBeCloseTo(44, 0)
      // Measured in the same task as the change, before the location tracker writes the label again.
      const wrapped = await trigger.evaluate((button) => {
        button.textContent = 'Components: a section name long enough to wrap onto a second line'
        const range = document.createRange()
        range.selectNodeContents(button)
        const box = button.getBoundingClientRect()
        const text = range.getBoundingClientRect()
        return { height: box.height, lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size, above: text.top - box.top, below: box.bottom - text.bottom }
      })
      expect(wrapped.lines).toBeGreaterThan(1)
      expect(wrapped.height).toBeGreaterThan(44)
      expect(wrapped.above).toBeGreaterThanOrEqual(8)
      expect(wrapped.below).toBeGreaterThanOrEqual(8)
    })

    test('the trigger opens the drawer from the left edge, titled with the rail and holding Find and the rail only', async ({ page }) => {
      await page.goto('components.html')
      await page.locator('#section-menu').click()
      const drawer = page.locator('#nav-drawer')
      await expect(drawer).toBeVisible()
      await expect.poll(async () => (await drawer.boundingBox())!.x).toBe(0)
      await expect(drawer.getByRole('heading', { name: 'Components', exact: true })).toBeVisible()
      await expect(drawer.locator('#find')).toBeVisible()
      await expect(drawer.locator('nav[aria-label="Pages"], [aria-label="Appearance"]')).toHaveCount(0)
    })

    test('the trigger label follows the current section as the page scrolls', async ({ page }) => {
      await page.goto('foundations.html')
      const trigger = page.locator('#section-menu')
      await expect(trigger).toHaveText('Foundations: Identity inputs')
      await page.goto('foundations.html#motion')
      await expect(trigger).toHaveText(`Foundations: ${await page.locator('#rail a[href="#motion"]').textContent()}`)
      await page.mouse.move(200, 500)
      await page.mouse.wheel(0, -100000)
      await expect(trigger).toHaveText('Foundations: Identity inputs')
    })

    test('a filter set in the drawer can be cleared from the page', async ({ page }) => {
      await page.goto('foundations.html')
      await page.locator('#section-menu').click()
      await page.locator('#find').fill('surface-raised shadow')
      await page.locator('#nav-drawer .close').click()
      await expect(page.locator('#find-summary')).toBeVisible()
      await page.locator('#find-summary-clear').click()
      await expect(page.locator('.tokens tbody tr[hidden]')).toHaveCount(0)
    })
  })
}

// The backdrop belongs to the dialog element, so a press on it is a press on the dialog outside the drawer's box.
test.describe('phone drawer, outside it', { tag: '@webkit' }, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('a tap or click outside closes the drawer and focuses the trigger, and a press that starts inside keeps it open', async ({ page }) => {
    await page.goto('components.html')
    const trigger = page.locator('#section-menu')
    const drawer = page.locator('#nav-drawer')
    const title = drawer.locator('.drawer-head h4')
    // Read at once: a drawer that starts to close stays visible while it slides out.
    const open = () => drawer.evaluate((dialog: HTMLDialogElement) => dialog.open && !('closing' in dialog.dataset))
    await trigger.click()
    await expect(drawer).toBeVisible()
    await title.tap()
    expect(await open()).toBe(true)
    // A drag from inside the drawer that ends outside it.
    const { x, y, width, height } = (await title.boundingBox())!
    await page.mouse.move(x + width / 2, y + height / 2)
    await page.mouse.down()
    await page.mouse.move(370, 500)
    await page.mouse.up()
    expect(await open()).toBe(true)
    await page.touchscreen.tap(370, 500)
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(drawer).toBeVisible()
    await page.mouse.click(370, 500)
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`after a / open, a tap outside returns focus to the trigger without scrolling the page, with reduced motion ${reducedMotion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion })
      await page.goto('components.html#badge')
      // The deep link settles once the fonts load and the rail moves into the drawer; measure after that.
      await expect(page.locator('#section-menu')).toHaveText(/: Badge$/)
      await page.evaluate(() => document.fonts.ready)
      const before = await page.evaluate(() => scrollY)
      expect(before).toBeGreaterThan(0)
      await page.keyboard.press('/')
      await expect(page.locator('#find')).toBeFocused()
      expect(await page.evaluate(() => scrollY), 'the open scrolled the page').toBe(before)
      await page.touchscreen.tap(370, 500)
      await expect(page.locator('#nav-drawer')).toBeHidden()
      await expect(page.locator('#section-menu')).toBeFocused()
      expect(await page.evaluate(() => scrollY), 'the close scrolled the page').toBe(before)
    })
  }
})

test('Copy writes var(--name) and says so', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text } } })
  })
  await page.goto('foundations.html')
  const row = page.locator('.tokens tbody tr', { has: page.locator('code', { hasText: /^--color-bg$/ }) })
  await row.hover()
  await row.getByRole('button', { name: 'Copy var(--color-bg)' }).click()
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe('var(--color-bg)')
  // The icon turns into a tick, with no visible text, and the live region says what was copied.
  await expect(row.locator('.copy use')).toHaveAttribute('href', '#i-tick')
  await expect(row.locator('.copy-result')).toBeHidden()
  await expect(page.locator('#copy-status')).toHaveText('Copied var(--color-bg).')
  await expect(row.locator('.copy use')).toHaveAttribute('href', '#i-copy', { timeout: 3000 })
})

test('a failed Copy keeps the copy icon and shows the failure', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied') } } })
  })
  await page.goto('foundations.html')
  const row = page.locator('.tokens tbody tr', { has: page.locator('code', { hasText: /^--color-bg$/ }) })
  await row.hover()
  await row.getByRole('button', { name: 'Copy var(--color-bg)' }).click()
  await expect(row.locator('.copy-result')).toHaveText('Copy failed')
  await expect(row.locator('.copy use')).toHaveAttribute('href', '#i-copy')
  await expect(page.locator('#copy-status')).toHaveText('Copy failed. Select the name instead.')
})

test.describe('Copy on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('leaves no hover tint after a tap and keeps its tint on the name line', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } })
    })
    await page.goto('foundations.html')
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
    const row = page.locator('.tokens tbody tr', { has: page.locator('.name', { hasText: /^--color-muted$/ }) })
    const copy = row.getByRole('button', { name: 'Copy var(--color-muted)' })
    await copy.tap()
    await expect(copy.locator('use')).toHaveAttribute('href', '#i-tick')
    // A touch screen keeps :hover on the tapped button, so a hover fill would stay.
    await expect(copy).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    // The box that draws the pressed tint and the focus ring ends above the former name.
    const box = (await copy.boundingBox())!
    const was = (await row.locator('.was').boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(was.y + 0.5)
    // The touch target stays 44px tall.
    expect(await copy.evaluate((b) => getComputedStyle(b, '::after').height)).toBe('44px')
  })
})

test('Copy still takes the hover tint where the pointer can hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('foundations.html')
  const copy = page.getByRole('button', { name: 'Copy var(--color-muted)' })
  await copy.hover()
  await expect(copy).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})

test('each component header links its implementations', async ({ page }) => {
  await page.goto('components.html')
  const button = page.locator('#button > header .impl')
  await expect(button.getByRole('link', { name: 'Vue: UiButton' })).toHaveAttribute('href', 'https://filipgutica.github.io/ui/#/components/button')
  await expect(button).toContainText('React: none yet')
  await expect(page.locator('#quiet-action > header .impl')).toHaveText('Vue: none yetReact: none yet')
  await expect(page.locator('section.component > header .impl')).toHaveCount(await page.locator('section.component').count())
})

test('index.json and llms.txt list every component, and their site links resolve', async ({ page, request }) => {
  await page.goto('components.html')
  const ids = await page.locator('section.component').evaluateAll((els) => els.map((el) => el.id))
  const index = await (await request.get('index.json')).json() as { version: string, components: { id: string, url: string, spec: string }[] }
  expect(index.components.map((c) => c.id)).toEqual(ids)
  await page.goto('')
  await expect(page.locator('.title-row .badge')).toHaveText(index.version)

  const llms = await (await request.get('llms.txt')).text()
  const links = [...llms.matchAll(/\]\((https:[^)]+)\)/g)].map(([, href]) => href)
  for (const id of ids) expect(llms).toContain(`components.html#${id})`)
  for (const href of new Set(links.map((link) => link.split('#')[0]))) {
    expect(href.startsWith(SITE_URL), href).toBe(true)
    expect((await request.get(href.slice(SITE_URL.length) || './')).status(), href).toBe(200)
  }
})

// Where a control's label ink starts and ends, and where the control's box does, in viewport CSS pixels.
// The page renders at deviceScaleFactor 4, so one device pixel is 1/4 CSS px. The screenshot covers the
// label's text line from 4px before the text; it is decoded in a canvas, and a pixel in the text's
// columns counts as ink when it is nearer the text colour than the fill 4px before the text.
const labelInk = async (page: Page, selector: string) => {
  const control = page.locator(selector).first()
  await control.scrollIntoViewIfNeeded()
  const { box, line, color } = await control.evaluate((el) => {
    const text = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!
    const range = document.createRange()
    range.selectNodeContents(text)
    const r = el.getBoundingClientRect()
    const t = range.getBoundingClientRect()
    return { box: { top: r.top, bottom: r.bottom }, line: { left: t.left, right: t.right, top: t.top, bottom: t.bottom }, color: getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0, 3).map(Number) }
  })
  // A whole-pixel clip keeps each device row at an exact CSS position.
  const clip = { x: Math.floor(line.left) - 4, y: Math.floor(line.top) - 4, width: Math.ceil(line.right - line.left) + 8, height: Math.ceil(line.bottom - line.top) + 8 }
  const png = await page.screenshot({ clip, scale: 'device' })
  const rows = await page.evaluate(async ({ data, from, to, color }) => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const at = (x: number, y: number) => [0, 1, 2].map((i) => pixels[(y * canvas.width + x) * 4 + i])
    const distance = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0)
    const fill = at(0, Math.round(canvas.height / 2))
    let top = -1
    let bottom = -1
    for (let y = 0; y < canvas.height; y++) {
      for (let x = from; x < to; x++) {
        const pixel = at(x, y)
        if (distance(pixel, fill) > 60 && distance(pixel, color) < distance(pixel, fill)) { if (top < 0) top = y; bottom = y + 1 }
      }
    }
    return { top, bottom }
  }, { data: png.toString('base64'), from: Math.round((line.left - clip.x) * 4), to: Math.round((line.right - clip.x) * 4), color })
  expect(rows.top, `${selector}: no ink found`).toBeGreaterThanOrEqual(0)
  return { box, top: clip.y + rows.top / 4, bottom: clip.y + rows.bottom / 4 }
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the header pill centres its label's ink in ${colorScheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4, baseURL: test.info().project.use.baseURL })
    await serveProjects(context)
    const page = await context.newPage()
    await page.goto('')
    // "Overview" has no descenders, so a line box that keeps descender room shows as a larger gap below.
    const selector = '.page-head .strip a[aria-current="page"]'
    await expect(page.locator(selector)).toHaveText('Overview')
    const { box, top, bottom } = await labelInk(page, selector)
    const above = top - box.top
    const below = box.bottom - bottom
    expect(Math.abs(above - below), `${above}px above the ink, ${below}px below`).toBeLessThanOrEqual(0.5)
    await context.close()
  })

  test(`a wrapped navigation row or crumb keeps its label inside the fill and focus ring in ${colorScheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4, baseURL: test.info().project.use.baseURL })
    await serveProjects(context)
    const page = await context.newPage()
    await page.goto('components.html')
    // Rows wrap rather than truncate. Trimming the line to the cap height must keep the room a wrapped
    // label had above its first line and below its last.
    await page.locator('main').evaluate((main) => main.insertAdjacentHTML('afterbegin', [
      '<nav class="navlist" style="width: 240px"><a class="is-hover" href="#wrapped-row">A very long navigation label that wraps onto more than one line ending in typography</a></nav>',
      '<nav class="crumbs" style="width: 120px"><ol><li><a href="#wrapped-crumb">A long parent page title that wraps</a></li></ol></nav>',
    ].join('')))
    const ring = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--focus-width')))
    for (const selector of ['a[href="#wrapped-row"]', 'a[href="#wrapped-crumb"]']) {
      const { lines, lineHeight } = await page.locator(selector).evaluate((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return { lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size, lineHeight: parseFloat(getComputedStyle(el).lineHeight) }
      })
      expect(lines, `${selector} wraps`).toBeGreaterThan(1)
      const { box, top, bottom } = await labelInk(page, selector)
      // Without text-box the row is its line boxes tall, so it must be at least that tall with it.
      expect(box.bottom - box.top, `${selector}: height`).toBeGreaterThanOrEqual(Math.floor(lines * lineHeight))
      expect(top - box.top, `${selector}: ink starts ${top - box.top}px below the top edge`).toBeGreaterThanOrEqual(ring)
      expect(box.bottom - bottom, `${selector}: ink ends ${box.bottom - bottom}px above the bottom edge`).toBeGreaterThanOrEqual(ring)
    }
    await context.close()
  })

  test(`the breadcrumb centres its link's ink in ${colorScheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4, baseURL: test.info().project.use.baseURL })
    await serveProjects(context)
    const page = await context.newPage()
    await page.goto('foundations.html')
    // The trim centres the cap height, so the label is set to one without descenders, whose ink is the cap
    // height; a line box that kept descender room would leave the ink over 1px high. Glyphs snap to the
    // pixel grid, so the trail moves down until its label's line starts on a whole pixel, as the header
    // pill's does, and snapping adds no error of its own.
    const selector = 'main .crumbs a'
    await page.locator(selector).evaluate((a) => {
      a.textContent = 'Overview'
      const range = document.createRange()
      range.selectNodeContents(a)
      const { top } = range.getBoundingClientRect()
      a.closest('nav')!.style.marginTop = `${Math.ceil(top) - top}px`
    })
    const { box, top, bottom } = await labelInk(page, selector)
    const above = top - box.top
    const below = box.bottom - bottom
    expect(Math.abs(above - below), `${above}px above the ink, ${below}px below`).toBeLessThanOrEqual(0.5)
    await context.close()
  })
}

// One labelled theme per preview: every preview names its theme and mode, and renders in exactly those,
// as tokens.json resolves them.
test('Themes: every preview names its theme and mode, and renders in them', async ({ page }) => {
  await page.goto('themes.html')
  const frames = await page.locator('.theme-frame').evaluateAll((nodes) => nodes.map((node) => {
    const frame = node as HTMLElement
    const colour = (host: Element, value: string) => {
      const probe = document.createElement('i')
      probe.style.color = value
      host.append(probe)
      const out = getComputedStyle(probe).color
      probe.remove()
      return out
    }
    return {
      id: frame.dataset.themeId as keyof typeof tokens.themes,
      mode: frame.dataset.mode as 'light' | 'dark',
      label: frame.querySelector('figcaption')?.textContent,
      heading: frame.closest('section')?.querySelector('h2')?.textContent,
      scheme: getComputedStyle(frame).colorScheme,
      accent: colour(frame, 'var(--color-accent)'),
    }
  }))
  expect(frames.map(({ id, mode }) => `${id} ${mode}`)).toEqual(Object.keys(tokens.themes).flatMap((id) => [`${id} light`, `${id} dark`]))
  for (const frame of frames) {
    expect(frame.label).toBe(`${frame.heading}${frame.mode === 'light' ? 'Light' : 'Dark'}`)
    expect(frame.scheme).toBe(frame.mode)
    const expected = await page.evaluate((value) => {
      const probe = document.createElement('i')
      probe.style.color = value
      document.body.append(probe)
      const out = getComputedStyle(probe).color
      probe.remove()
      return out
    }, tokens.themes[frame.id][frame.mode]['color-accent'])
    expect(frame.accent, `${frame.id} ${frame.mode}`).toBe(expected)
  }
})

test('Themes: every preview is a figure that assistive technology can reach', async ({ page }) => {
  await page.goto('themes.html')
  // Chromium's own accessibility tree: Playwright's role queries still match inert content, this tree does not.
  // The labels are checked against each frame's theme and mode above.
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree') as { nodes: { ignored: boolean, role?: { value: string } }[] }
  expect(nodes.filter((node) => !node.ignored && node.role?.value === 'figure')).toHaveLength(2 * Object.keys(tokens.themes).length)
})

test('Themes: every contrast check passes, and the table needs no script', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL })
  const page = await context.newPage()
  await page.goto('themes.html')
  const results = page.locator('table.checks .result')
  expect(await results.count()).toBe(Object.keys(tokens.themes).length * 5 * 2)
  await expect(page.locator('table.checks .result.fail')).toHaveCount(0)
  await context.close()
})
