import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Behaviour of the catalogue shell in language/components.html: Find, the / shortcut, location
// tracking, the tablet drawer, the tab glide, the page without JavaScript, overflow, and axe.
const url = new URL('../../language/components.html', import.meta.url).href
const railLink = (page: Page, name: string) => page.locator('#rail .rail-list a', { hasText: new RegExp(`^${name}$`) })
const current = (page: Page) => page.locator('#rail [aria-current="location"]')

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('Find filters the rail and shows the empty state', async ({ page }) => {
    await page.goto(url)
    const find = page.locator('#find')
    await find.fill('tog')
    await expect(page.locator('#rail .rail-list a:visible')).toHaveText(['Switch', 'Toggle button', 'Segmented control'])
    await expect(page.locator('#find-count')).toHaveText('3 matches')
    await find.fill('tooltip')
    await expect(page.locator('#rail .rail-list a:visible')).toHaveCount(0)
    await expect(page.locator('#find-empty')).toBeVisible()
    await expect(page.locator('#find-empty q')).toHaveText('tooltip')
    await expect(page.locator('#find-count')).toHaveText('No matches')
    await page.locator('#find-clear').click()
    await expect(find).toBeFocused()
    await expect(page.locator('#find-empty')).toBeHidden()
    await expect(railLink(page, 'Button')).toBeVisible()
  })

  test('Enter goes to the first match, and Escape clears the query before it leaves the field', async ({ page }) => {
    await page.goto(url)
    const find = page.locator('#find')
    await find.fill('modal')
    await find.press('Escape')
    await expect(find).toHaveValue('')
    await expect(find).toBeFocused()
    await find.fill('modal')
    await find.press('Enter')
    await expect(page).toHaveURL(/#dialog$/)
    await expect(page.locator('#dialog')).toBeFocused()
  })

  test('/ focuses Find, types normally in a field, and does nothing once shortcuts are off', async ({ page }) => {
    await page.goto(url)
    await page.keyboard.press('/')
    await expect(page.locator('#find')).toBeFocused()
    const specimen = page.locator('#in-rest')
    await specimen.fill('')
    await specimen.press('/')
    await expect(specimen).toHaveValue('/')
    await page.locator('#shortcut-switch').click()
    await expect(page.locator('#shortcut-switch')).toHaveAttribute('aria-checked', 'false')
    await expect(page.locator('#find')).not.toHaveAttribute('aria-keyshortcuts')
    await expect(page.locator('#rail .find > .key')).toBeHidden()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('/')
    await expect(page.locator('#find')).not.toBeFocused()
    // The choice is saved.
    await page.reload()
    await expect(page.locator('#shortcut-switch')).toHaveAttribute('aria-checked', 'false')
  })

  test('the location follows a hash and scrolling', async ({ page }) => {
    await page.goto(`${url}#slider`)
    await expect(current(page)).toHaveText('Slider')
    await page.evaluate(() => { location.hash = 'badge' })
    await expect(current(page)).toHaveText('Badge')
    await page.mouse.move(900, 450)
    await page.mouse.wheel(0, 1600)
    await expect(current(page)).not.toHaveText('Badge')
    await page.locator('#dialog').evaluate((el) => el.scrollIntoView())
    await expect(current(page)).toHaveText('Dialog')
    // The current row stays in view inside the rail's own list.
    await page.locator('#page-type-and-helpers').evaluate((el) => el.scrollIntoView())
    await expect(current(page)).toHaveText('Page type and helpers')
    await expect(current(page)).toBeInViewport()
  })

  test('the tab fill glides to the new tab', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    await list.getByRole('tab', { name: 'Settings' }).click()
    const glide = await list.evaluate((el) => ({
      slide: (el as HTMLElement).dataset.slide,
      names: el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
    }))
    expect(glide.slide).toBe('right')
    expect(glide.names).toEqual(expect.arrayContaining(['glide-left', 'glide-right']))
    await expect(list).not.toHaveAttribute('data-slide')
    await expect(list.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })

  test('the tab fill moves at once', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    await list.getByRole('tab', { name: 'Settings' }).click()
    const glide = await list.evaluate((el) => ({ slide: (el as HTMLElement).dataset.slide, count: el.getAnimations({ subtree: true }).length }))
    expect(glide).toEqual({ slide: undefined, count: 0 })
  })
})

test.describe('tablet and phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Menu opens the drawer on the current row, and a link closes it and focuses the target', async ({ page }) => {
    await page.goto(`${url}#slider`)
    await expect(current(page)).toHaveText('Slider')
    const scrolled = await page.evaluate(() => scrollY)
    await page.locator('#section-menu').focus()
    await page.keyboard.press('Enter')
    const drawer = page.locator('#nav-drawer')
    await expect(drawer).toBeVisible()
    await expect(current(page)).toBeFocused()
    await expect(current(page)).toBeInViewport()
    expect(await page.evaluate(() => scrollY)).toBe(scrolled)
    // The drawer holds Find, the pages, the appearance control, then the rail's groups.
    await expect(drawer.locator('.rail > *:visible')).toHaveCount(5)
    await drawer.locator('a', { hasText: /^Dialog$/ }).click()
    await expect(drawer).toBeHidden()
    await expect(page.locator('#dialog')).toBeFocused()
    await expect(page).toHaveURL(/#dialog$/)
  })

  test('opening the drawer or focusing a header button does not scroll the page', async ({ page }) => {
    await page.goto(`${url}#badge`)
    const before = await page.evaluate(() => scrollY)
    expect(before).toBeGreaterThan(0)
    await page.locator('#section-find').focus()
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await page.locator('#section-find').click()
    await expect(page.locator('#find')).toBeFocused()
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await page.keyboard.press('Escape')
    await expect(page.locator('#nav-drawer')).toBeHidden()
    await page.locator('#section-menu').click()
    await expect(page.locator('#nav-drawer')).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(before)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  for (const width of [390, 1280]) {
    test(`every link is visible and Find is hidden at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      const links = page.locator('#rail .rail-list a')
      expect(await links.count()).toBeGreaterThan(30)
      for (const link of await links.all()) await expect(link).toBeVisible()
      await expect(page.locator('#find')).toBeHidden()
      await expect(page.locator('#section-bar')).toBeHidden()
      for (const link of await page.locator('.page-head .strip a').all()) await expect(link).toBeVisible()
    })
  }
})

for (const width of [390, 720, 1280]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(url)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
}

test('every specimen has a caption', async ({ page }) => {
  await page.goto(url)
  await expect(page.locator('.state:not(:has(> .caption))')).toHaveCount(0)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`axe finds no violations in ${colorScheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await page.goto(url)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
    await context.close()
  })
}
