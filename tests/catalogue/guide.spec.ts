import { expect, test, type Page } from '@playwright/test'

// The contents list ("On this page") beside a column, on the guide example: components.md#navigation-list,
// "Beside a column" and "Phone triggers", and decisions.md "Sticky contents list".
const url = new URL('../../language/guide.html', import.meta.url).href

const contents = (page: Page) => page.getByRole('navigation', { name: 'On this page' })
const pages = (page: Page) => page.getByRole('navigation', { name: 'Documentation' })
const current = (page: Page) => contents(page).locator('a[aria-current="location"]')

// WebKit runs these too: it shows no closed disclosure's rows, so the script must open the lists there.
test.describe('beside the column', { tag: '@webkit' }, () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the list stays at the scroll offset as the column scrolls, and its pip follows the section', async ({ page }) => {
    await page.goto(url)
    await expect(current(page)).toHaveText('The question')
    const before = await contents(page).boundingBox()
    await page.locator('#structure').scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, document.getElementById('structure')!.getBoundingClientRect().top - 16))
    await expect(current(page)).toHaveText('Let the structure work')
    const after = await contents(page).boundingBox()
    // Before scrolling, the list sits below the header; once the header scrolls away it holds at its top.
    expect(before!.y).toBeGreaterThan(after!.y)
    const offset = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
    const top = await page.locator('.contents').evaluate((el) => el.getBoundingClientRect().top)
    expect(top).toBeCloseTo(offset, 0)
    await expect(page.locator('.contents summary')).toBeHidden()
    await expect(page.getByRole('heading', { name: 'On this page' })).toBeVisible()
    await expect(page.locator('.rail-details:not([open])')).toHaveCount(0)
    await expect(pages(page)).toBeVisible()
  })

  test('in a short window the list scrolls on its own under its heading, and keeps the current row in view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 320 })
    await page.goto(url)
    const list = contents(page)
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, document.getElementById('review')!.offsetTop))
    await expect(current(page)).toHaveText('Review it cold')
    // The list has scrolled, and its heading stays in view above it.
    expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    const heading = await page.getByRole('heading', { name: 'On this page' }).boundingBox()
    const box = await list.boundingBox()
    const row = await current(page).boundingBox()
    expect(heading!.y).toBeGreaterThanOrEqual(0)
    expect(heading!.y + heading!.height).toBeLessThanOrEqual(box!.y + 1)
    expect(row!.y).toBeGreaterThanOrEqual(box!.y - 1)
    expect(row!.y + row!.height).toBeLessThanOrEqual(box!.y + box!.height + 1)
  })

  test('the list leaves its rows alone while the pointer is over it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 320 })
    await page.goto(url)
    const list = contents(page)
    await list.hover()
    await page.evaluate(() => window.scrollTo(0, document.getElementById('ship')!.offsetTop))
    await expect(current(page)).toHaveText('Ship and maintain')
    expect(await list.evaluate((el) => el.scrollTop)).toBe(0)
    // Once the pointer leaves, the list catches up.
    await page.mouse.move(600, 10)
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  })
})

test('when the frame is too narrow for three columns, the list is a closed disclosure before main, named for the current section', { tag: '@webkit' }, async ({ page }) => {
  // The window keeps its width; only the frame narrows, so a viewport breakpoint could not pass this.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(url)
  const summary = page.locator('.contents summary')
  await expect(summary).toBeHidden()
  // Closing the list resizes the frame the script observes; that must not raise a resize-loop error.
  await page.evaluate(() => {
    (window as unknown as { errors: string[] }).errors = []
    addEventListener('error', (e) => (window as unknown as { errors: string[] }).errors.push(e.message))
  })
  await page.locator('.frame').evaluate((frame) => { frame.style.width = '1000px' })
  await expect(summary).toHaveText('On this page: The question')
  await expect(contents(page)).toBeHidden()
  await expect(page.locator('.contents details')).not.toHaveAttribute('open')
  expect(await page.evaluate(() => (window as unknown as { errors: string[] }).errors)).toEqual([])
  expect(await page.locator('.contents').evaluate((el) => getComputedStyle(el).position)).toBe('static')
  const [disclosure, main] = await Promise.all([summary.boundingBox(), page.locator('main').boundingBox()])
  expect(disclosure!.y + disclosure!.height).toBeLessThanOrEqual(main!.y)
  await summary.click()
  await expect(contents(page)).toBeVisible()
  await expect(pages(page)).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('one trigger, named for the page rail, opens one drawer with the contents list first', async ({ page }) => {
    await page.goto(url)
    const trigger = page.getByRole('button', { name: 'Documentation: Write a guide' })
    await expect(trigger).toBeVisible()
    await expect(page.locator('summary:visible')).toHaveCount(0)
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: 'Documentation' })
    await expect(drawer).toBeVisible()
    const order = await drawer.getByRole('navigation').evaluateAll((navs) => navs.map((nav) => nav.getAttribute('aria-labelledby')))
    expect(order).toEqual(['contents-title', 'pages-title'])
    await drawer.getByRole('link', { name: 'Keep it short' }).click()
    await expect(drawer).toBeHidden()
    await expect(page.locator('#length')).toBeFocused()
  })

  test('a keyboard open focuses the current section, in view in the drawer', async ({ page }) => {
    await page.setViewportSize({ width: 740, height: 390 })
    await page.goto(`${url}#ship`)
    // The list sits in the closed drawer, out of the accessibility tree, so read its marker directly.
    await expect(page.locator('#nav-drawer a[aria-current="location"]')).toHaveText('Ship and maintain')
    // A keyboard click (detail 0) where the page is, without scrolling back to the trigger first.
    await page.getByRole('button', { name: 'Documentation: Write a guide' })
      .evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })))
    const row = page.getByRole('dialog').getByRole('link', { name: 'Ship and maintain' })
    await expect(row).toBeFocused()
    await expect(row).toBeInViewport({ ratio: 1 })
  })

  test('without JavaScript each list is its own closed disclosure, the page rail first', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(url)
    await expect(page.getByRole('button', { name: /^Documentation:/ })).toBeHidden()
    const summaries = page.locator('summary:visible')
    await expect(summaries).toHaveText(['Documentation', 'On this page'])
    await expect(contents(page)).toBeHidden()
    await expect(pages(page)).toBeHidden()
    await context.close()
  })
})

test('in forced colors the contents list keeps its pip and the page rail its border, so the two levels differ', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(url)
  const pip = await current(page).evaluate((a) => {
    const style = getComputedStyle(a, '::before')
    return { adjust: style.forcedColorAdjust, width: style.width }
  })
  expect(pip).toEqual({ adjust: 'none', width: '3px' })
  const border = await pages(page).locator('a[aria-current="page"]').evaluate((a) => getComputedStyle(a).borderInlineStartWidth)
  expect(border).toBe('2px')
})

test('the first Tab shows the skip link, which moves focus to main past both lists', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(url)
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('without JavaScript the skip link still moves focus to main', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(url)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await context.close()
})
