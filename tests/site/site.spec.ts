import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The built site, served under /design-system/ as on GitHub Pages: each page's layout, accessibility,
// script, and links, the header and pager order, and Foundations' Find and Copy.
const PAGES = [
  { path: '', name: 'Overview', find: 'a section' },
  { path: 'foundations.html', name: 'Foundations', find: 'a token' },
  { path: 'components.html', name: 'Components', find: 'a component' },
]
const SITE_URL = 'https://filipgutica.github.io/design-system/'

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
        const page = await context.newPage()
        await page.goto(path)
        const { violations } = await new AxeBuilder({ page }).analyze()
        expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
        await context.close()
      })
    }

    test('the header strip and the pager run Overview, Foundations, Components', async ({ page }) => {
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
        await expect(page.locator('#section-bar')).toBeHidden()
        await expect(page.locator('.page-head [aria-label="Appearance"]')).toBeHidden()
      })
    }
  })
}

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
})

test('on phones, the sticky bar offers Clear on one line while a filter is on', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('foundations.html')
  await page.locator('#section-find').click()
  await page.locator('#find').fill('surface-raised shadow')
  await page.locator('#nav-drawer .close').click()
  const clear = page.locator('#section-bar .bar-clear')
  await expect(clear).toHaveText('Clear “surface-raised shadow”')
  const lineHeight = await page.locator('.page-head .crumbs a').first().evaluate((a) => a.getBoundingClientRect().height)
  expect((await clear.boundingBox())!.height).toBeLessThanOrEqual(48)
  expect(lineHeight).toBeLessThanOrEqual(48)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await clear.click()
  await expect(clear).toBeHidden()
  await expect(page.locator('.tokens tbody tr[hidden]')).toHaveCount(0)
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
  await expect(row.locator('.copy-result')).toHaveText('Copied')
  await expect(page.locator('#copy-status')).toHaveText('Copied var(--color-bg).')
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
