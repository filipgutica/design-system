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

  // Each glide check activates the tab and samples the animation in one evaluate, so a 300ms glide
  // cannot finish between the two.
  test('the tab fill glides to the new tab', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    const glide = await list.evaluate((el) => {
      el.querySelectorAll<HTMLElement>('[role="tab"]')[2].click()
      return { slide: (el as HTMLElement).dataset.slide, names: el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName).sort() }
    })
    expect(glide).toEqual({ slide: 'right', names: ['glide-left', 'glide-right'] })
    await expect(list).not.toHaveAttribute('data-slide')
    await expect(list.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true')
  })

  test('a keyboard tab change glides too', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    const glide = await list.evaluate((el) => {
      const first = el.querySelector<HTMLElement>('[role="tab"]')!
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      const names = el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName).filter((name) => name?.startsWith('glide-')).sort()
      return { slide: (el as HTMLElement).dataset.slide, focused: document.activeElement?.textContent, names }
    })
    expect(glide).toEqual({ slide: 'right', focused: 'Settings', names: ['glide-left', 'glide-right'] })
  })

  test('an interrupted glide starts from where the fill is', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    // Overview to Settings, then History one frame later. The fill is still near Overview, left of
    // History, so the second glide goes right; starting from Settings' own box would send it left.
    const slide = await list.evaluate(async (el) => {
      const [, history, settings] = el.querySelectorAll<HTMLElement>('[role="tab"]')
      settings.click()
      await new Promise((done) => requestAnimationFrame(done))
      history.click()
      return (el as HTMLElement).dataset.slide
    })
    expect(slide).toBe('right')
  })

  test('the skip links move focus to main and to the rail list', async ({ page }) => {
    await page.goto(url)
    await page.keyboard.press('Tab')
    await expect(page.locator('body > a.skip[href="#main"]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
    await page.goto(`${url}?again`)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator('body > a.skip[href="#contents"]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contents')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(railLink(page, 'By purpose')).toBeFocused()
  })

  test('resizing moves the rail, the pages, and the appearance control between the page and the drawer', async ({ page }) => {
    await page.goto(url)
    const where = () => page.evaluate(() => ({
      rail: document.getElementById('rail')!.parentElement!.id || document.getElementById('rail')!.parentElement!.className,
      pages: document.querySelector('nav[aria-label="Pages"]')!.parentElement!.className,
      appearance: document.querySelector('[aria-label="Appearance"]')!.parentElement!.className,
      bar: document.getElementById('section-bar')!.hidden,
    }))
    const desktop = { rail: 'layout', pages: 'page-head', appearance: 'page-head', bar: true }
    expect(await where()).toEqual(desktop)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(where).toEqual({ rail: 'nav-drawer-body', pages: 'rail', appearance: 'drawer-appearance', bar: false })
    await page.locator('#section-menu').click()
    await expect(page.locator('#nav-drawer')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect.poll(where).toEqual(desktop)
    await expect(page.locator('#nav-drawer')).toBeHidden()
  })

  test('a resize keeps a jump whose landing the page bottom clamped', async ({ page }) => {
    // The page cannot scroll this target up to the inset, so the jump lands at the bottom and must still hold.
    await page.setViewportSize({ width: 1280, height: 2100 })
    await page.goto(`${url}#page-type-and-helpers`)
    await expect(current(page)).toHaveText('Page type and helpers')
    await page.setViewportSize({ width: 1250, height: 2100 })
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    await expect(current(page)).toHaveText('Page type and helpers')
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })

  test('the tab fill moves at once', async ({ page }) => {
    await page.goto(`${url}#tabs`)
    const list = page.getByRole('tablist', { name: 'Monitor', exact: true })
    const glide = await list.evaluate((el) => {
      el.querySelectorAll<HTMLElement>('[role="tab"]')[2].click()
      return { slide: (el as HTMLElement).dataset.slide, count: el.getAnimations({ subtree: true }).length }
    })
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
    await expect(page.locator('#dialog')).toBeInViewport()
    await expect(page).toHaveURL(/#dialog$/)
  })

  test('a deep link keeps tracking once the rail moves into the drawer', async ({ page }) => {
    // The rail sits above main until the script moves it, so the landing is measured after the move.
    await page.goto(`${url}#slider`)
    await expect(current(page)).toHaveText('Slider')
    await expect(page.locator('#slider')).toBeInViewport()
    await page.mouse.move(200, 500)
    await page.mouse.wheel(0, 2000)
    await expect(current(page)).not.toHaveText('Slider')
  })

  test('a jump that a resize interrupts keeps tracking', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${url}#slider`)
    await expect(current(page)).toHaveText('Slider')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('#section-bar')).toBeVisible()
    await page.mouse.move(200, 500)
    await page.mouse.wheel(0, 2000)
    await expect(current(page)).not.toHaveText('Slider')
  })

  test('the page behind an open drawer does not scroll, and keeps its place', async ({ page }) => {
    await page.goto(`${url}#badge`)
    await expect(current(page)).toHaveText('Badge')
    const before = await page.evaluate(() => scrollY)
    await page.locator('#section-menu').click()
    await expect(page.locator('#nav-drawer')).toBeVisible()
    // Wheel over the backdrop, to the right of the drawer, and give the scroll two frames to land.
    await page.mouse.move(370, 500)
    await page.mouse.wheel(0, 1000)
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await expect(current(page)).toHaveText('Badge')
    await page.keyboard.press('Escape')
    await expect(page.locator('#nav-drawer')).toBeHidden()
    expect(await page.evaluate(() => scrollY)).toBe(before)
  })

  test('the skip link to the rail is left out, because the rail is in the drawer', async ({ page }) => {
    await page.goto(url)
    await expect(page.locator('a.skip[href="#contents"]')).toBeHidden()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator('a.skip[href="#contents"]')).not.toBeFocused()
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
    // Overflow is content wider than the page's box. The page reserves a scrollbar gutter, which a browser
    // with hidden scrollbars (headless Linux) leaves empty, so the difference can be negative there.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
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
