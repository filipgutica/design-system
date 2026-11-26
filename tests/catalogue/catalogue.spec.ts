import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

// Behaviour of the catalogue shell in language/components.html: Find, the / shortcut, location
// tracking, the tablet drawer, the tab glide, the live slider's value, the page without JavaScript,
// overflow, forced colors, and axe.
const url = new URL('../../language/components.html', import.meta.url).href
const railLink = (page: Page, name: string) => page.locator('#rail .rail-list a', { hasText: new RegExp(`^${name}$`) })
const current = (page: Page) => page.locator('#rail [aria-current="location"]')

const controlHeights: Record<string, number> = { sm: 28, md: 32, lg: 36 }
const touchHeight = 44

// Measure compound controls at their visible boundary (the search and number field wrappers and choice label).
// Compact tool-call disclosures have their own recipe. The hover toolbar is hidden at touch widths.
const controlTargets = [
  '.btn', '.input', '.select', '.range', '.check', '.switch', '.toggle', '.search', '.number-field',
  '.segmented', '.segmented > button', '.tab', '.radio-card', 'textarea',
  '[role="option"]', '.navlist a', '.crumbs a', '.group-toggle', '.chip[href]',
  '.overflow > button:not(.msg-tools *)', '.menu-list [role="menuitem"]', '.copy-link', '.page-head > .site-name',
  '.header a', '.actions > a:not(.btn)', 'button.copy', '.close', '.full', '.projects > summary', '.wrap-toggle',
  '.number-field > .quiet-action', '.combobox-toggle',
].join(', ')

const renderedControls = (page: Page) => page.locator(`:is(${controlTargets}):visible`).evaluateAll((elements) => elements.map((element) => {
  // The caption names the size independently of the attribute that keeps the specimen small.
  const caption = element.closest('.state')?.querySelector(':scope > .caption')?.textContent?.trim()
  const specimenSize = caption && /^(sm|md|lg)$/.test(caption) ? caption : undefined
  const label = element.id || element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 48)
  const { height, width } = element.getBoundingClientRect()
  return {
    label: `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''} ${label ?? ''}`.trim(),
    size: element.closest('[data-size]')?.getAttribute('data-size') ?? 'md',
    specimenSize,
    height,
    width,
    // Search and a few standalone compact actions use the small height on desktop.
    compact: element.matches('.search, .crumbs a, .group-toggle, .overflow > button, .copy-link, .page-head > .site-name, .composer-box textarea'),
    // Header links are navigation rows at the control height, not the row height.
    row: element.matches('[role="option"], .navlist a, .menu-list [role="menuitem"]') && !element.matches('.page-head .strip a, .site-links a'),
    // The phone header samples show the touch size at every width.
    alwaysTouch: element.matches('.navlist.text-links a, .phone-head .projects > summary, .phone-head > .strip a'),
    // Toggle cards and padded menu triggers can grow to fit their contents.
    contentHeight: element.matches('.toggle, .btn.menu-glyph, .radio-card, textarea, .navlist a, .crumbs a'),
    textButton: element.matches('.btn.text'),
    chip: element.matches('.chip[href]'),
    option: element.matches('.segmented > button'),
    iconOption: element.matches('.segmented[data-icon-only] > button'),
    iconButton: element.matches('.btn[data-icon-only]'),
    consoleSizedButton: element.matches('.btn[data-size]'),
    // The number field steppers and the combobox chevron are separate targets inside a field.
    touchSquare: element.matches('.number-field > .quiet-action, .combobox-toggle'),
  }
}))

const specimenBoxes = (controls: Awaited<ReturnType<typeof renderedControls>>) => controls
  .filter(({ specimenSize }) => specimenSize)
  .map(({ label, height }) => ({ label, height }))

for (const file of ['components.html', 'reference.html', 'product.html', 'docs.html', 'guide.html']) {
  for (const width of [1280, 800, 375]) {
    test(`${file} renders control sizes at ${width}px`, async ({ page }) => {
      const touch = width <= 800
      const measureAt = async (viewportWidth: number) => {
        await page.setViewportSize({ width: viewportWidth, height: 900 })
        await page.goto(new URL(file, url).href)
        return renderedControls(page)
      }
      const desktopSpecimens = touch && file === 'components.html' ? specimenBoxes(await measureAt(1280)) : null
      const controls = await measureAt(width)
      expect(controls.length).toBeGreaterThan(0)
      for (const control of controls) {
        const { label, specimenSize, height, option } = control
        // Desktop text buttons are inline actions with 4px padding and no fixed control height.
        if (!touch && control.textButton) continue
        const desktopHeight = control.compact ? 28 : control.row ? 36 : control.chip ? 24 : controlHeights[control.size]
        const target = specimenSize ? controlHeights[specimenSize] : touch || control.alwaysTouch ? touchHeight : desktopHeight
        // The track owns the control height. Each option is inset 2px from its top and bottom.
        const expected = target - (option ? 4 : 0)
        if (control.contentHeight) {
          expect.soft(height, label).toBeGreaterThanOrEqual(expected)
        } else {
          expect.soft(height, label).toBe(expected)
        }
        // A round control is a circle only on a square box, at every size and on touch.
        if (control.iconOption || control.iconButton) expect.soft(control.width, label).toBeCloseTo(height, 1)
        if (touch && control.touchSquare && !specimenSize) expect.soft(control.width, label).toBe(touchHeight)
        if (file === 'reference.html' && touch && (option || control.consoleSizedButton)) {
          expect.soft(control.width, label).toBeGreaterThanOrEqual(expected)
        }
      }
      if (desktopSpecimens) {
        expect(desktopSpecimens.length).toBeGreaterThan(0)
        expect(specimenBoxes(controls)).toEqual(desktopSpecimens)
      }
    })
  }
}

// A lone icon is a circle only on a button with its own fill. A see-through lone icon is a quiet action, a tile:
// an icon-only ghost or text button would look like one at rest and hover in a different shape.
for (const file of ['components.html', 'reference.html', 'product.html', 'docs.html', 'guide.html']) {
  test(`${file} marks every icon-only button, and none is ghost or text`, async ({ page }) => {
    await page.goto(new URL(file, url).href)
    const problems = await page.locator('.btn').evaluateAll((buttons) => buttons.flatMap((button) => {
      const text = button.textContent?.trim() ?? ''
      const iconOnly = button.hasAttribute('data-icon-only')
      const name = button.getAttribute('aria-label') ?? text
      if (!text && !iconOnly) return [`${name}: no text and no data-icon-only`]
      if (iconOnly && text) return [`${name}: data-icon-only with text`]
      if (iconOnly && !button.getAttribute('aria-label')) return ['an icon-only button with no aria-label']
      if (iconOnly && button.matches('.ghost, .text')) return [`${name}: an icon-only ghost or text button`]
      return []
    }))
    expect(problems).toEqual([])
  })
}

// A flex row stretches its items to the tallest one; an icon-only button keeps its square box.
test('an icon-only button stays a circle in a row with a taller sibling', async ({ page }) => {
  await page.goto(url)
  const box = await page.locator('#button .btn[data-icon-only][aria-label="Send"]').first().evaluate((button) => {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.innerHTML = '<div style="height: 72px"></div>'
    document.querySelector('main')!.append(row)
    row.append(button)
    const { width, height } = button.getBoundingClientRect()
    return { width, height }
  })
  expect(box).toEqual({ width: 32, height: 32 })
})

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

  test('the live slider’s visible value follows the keyboard and the pointer', async ({ page }) => {
    await page.goto(`${url}#slider`)
    const slider = page.locator('#sl-rest')
    const value = page.locator('output[for="sl-rest"]')
    await expect(value).toHaveText('40%')
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(value).toHaveText('41%')
    const box = (await slider.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2)
    const pointed = Number(await slider.inputValue())
    expect(pointed).toBeGreaterThan(80)
    await expect(value).toHaveText(`${pointed}%`)
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

  test('resizing moves the rail between the page and the drawer, and the pages and appearance stay in the header', async ({ page }) => {
    await page.goto(url)
    const where = () => page.evaluate(() => ({
      rail: document.getElementById('rail')!.parentElement!.id || document.getElementById('rail')!.parentElement!.className,
      pages: document.querySelector('nav[aria-label="Pages"]')!.parentElement!.className,
      appearance: document.querySelector('[aria-label="Appearance"]')!.parentElement!.className,
      trigger: document.getElementById('section-menu')!.hidden,
    }))
    const desktop = { rail: 'layout', pages: 'page-head', appearance: 'page-head', trigger: true }
    expect(await where()).toEqual(desktop)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(where).toEqual({ rail: 'nav-drawer-body', pages: 'page-head', appearance: 'page-head', trigger: false })
    await page.locator('#section-menu').click()
    await expect(page.locator('#nav-drawer')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect.poll(where).toEqual(desktop)
    await expect(page.locator('#nav-drawer')).toBeHidden()
  })

  test('a resize keeps a jump whose landing the page bottom clamped', async ({ page }) => {
    // The page cannot scroll this target up to the inset, so the jump lands at the bottom and must still hold.
    // Widening the page shortens it, so the clamped landing moves and the page sits at the new one.
    await page.setViewportSize({ width: 1000, height: 2100 })
    await page.goto(`${url}#page-type-and-helpers`)
    await expect(current(page)).toHaveText('Page type and helpers')
    const before = await page.evaluate(() => scrollY)
    await page.setViewportSize({ width: 1280, height: 2100 })
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    expect(before - await page.evaluate(() => scrollY)).toBeGreaterThan(100)
    await expect(current(page)).toHaveText('Page type and helpers')
  })

  test('a resize keeps a jump whose smooth scroll is still on its way', async ({ page }) => {
    // The page scrolls smoothly under normal motion only where a site opts in, so the test opts in. The resize
    // fires after the hash change, which measures the jump again, and before the scroll arrives.
    // The viewport is tall enough that the page bottom clamps the jump, below the target's own landing.
    await page.setViewportSize({ width: 1280, height: 2400 })
    await page.goto(url)
    const startY = await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'smooth'
      const hashed = new Promise((done) => addEventListener('hashchange', done, { once: true }))
      document.querySelector<HTMLAnchorElement>('#rail a[href="#page-type-and-helpers"]')!.click()
      await hashed
      dispatchEvent(new Event('resize'))
      return scrollY
    })
    const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    expect(startY).toBeLessThan(bottom - 1000)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(bottom - 2)
    await expect(current(page)).toHaveText('Page type and helpers')
  })

  test('many small resizes during a jump do not move its landing', async ({ page }) => {
    // Each 1px resize is within the tolerance alone. Measuring the landing again on each one would let it drift
    // 40px, and the jump would then hold the row after the reader scrolls away.
    await page.setViewportSize({ width: 1280, height: 2400 })
    await page.goto(url)
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'smooth'
      const hashed = new Promise((done) => addEventListener('hashchange', done, { once: true }))
      document.querySelector<HTMLAnchorElement>('#rail a[href="#page-type-and-helpers"]')!.click()
      await hashed
    })
    // A frame between resizes delivers each one as its own resize event; without it they coalesce into one.
    for (let shrink = 1; shrink <= 40; shrink++) {
      await page.setViewportSize({ width: 1280, height: 2400 - shrink })
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)))
    }
    const settled = () => page.evaluate(async () => {
      const y = scrollY
      await new Promise((done) => setTimeout(done, 150))
      return scrollY === y
    })
    await expect.poll(settled).toBe(true)
    await page.evaluate(() => scrollBy({ top: 10, behavior: 'instant' }))
    await expect(current(page)).not.toHaveText('Page type and helpers')
  })
})

// At 801px the catalogue's five header links overflow the strip, which fades the edges it clips. A link
// reached with Tab scrolls fully into view, and clear of any fade still showing.
test('a header link reached with Tab scrolls clear of the strip’s faded edges', async ({ page }) => {
  await page.setViewportSize({ width: 801, height: 900 })
  await page.goto(url)
  const strip = page.locator('.page-head .strip')
  const links = strip.locator('a')
  await links.first().focus()
  for (let i = 1; i < await links.count(); i++) {
    await page.keyboard.press('Tab')
    await expect(links.nth(i)).toBeFocused()
    const label = await links.nth(i).textContent()
    await expect.poll(() => links.nth(i).evaluate((link) => {
      const list = link.parentElement!
      const clip = list.dataset.clip ?? ''
      const box = list.getBoundingClientRect()
      const row = link.getBoundingClientRect()
      return row.left >= box.left + (clip.includes('start') ? 24 : 0) - 0.5 && row.right <= box.right - (clip.includes('end') ? 24 : 0) + 0.5
    }), `${label} sits clear of the fades`).toBe(true)
  }
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

  // Inert examples of a state grow like live controls; only a size specimen keeps its size.
  test('the trigger opens the drawer on the current row, and a link closes it and focuses the target', async ({ page }) => {
    await page.goto(`${url}#slider`)
    await expect(current(page)).toHaveText('Slider')
    await expect(page.locator('#section-menu')).toHaveText('Components: Slider')
    const scrolled = await page.evaluate(() => scrollY)
    // The trigger sits above the content, so it takes focus without scrolling, and Slider stays current.
    await page.locator('#section-menu').evaluate((button) => button.focus({ preventScroll: true }))
    await page.keyboard.press('Enter')
    const drawer = page.locator('#nav-drawer')
    await expect(drawer).toBeVisible()
    await expect(current(page)).toBeFocused()
    await expect(current(page)).toBeInViewport()
    expect(await page.evaluate(() => scrollY)).toBe(scrolled)
    // The drawer is named after the rail and holds Find, the rail's groups, and the shortcut switch.
    await expect(drawer.getByRole('heading', { name: 'Components', exact: true })).toBeVisible()
    await expect(drawer.locator('.rail > *:visible')).toHaveCount(3)
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
    await expect(page.locator('#section-menu')).toBeVisible()
    await page.mouse.move(200, 500)
    await page.mouse.wheel(0, 2000)
    await expect(current(page)).not.toHaveText('Slider')
  })

  for (const width of [1280, 390, 320]) test(`the overflow menu follows the menu button pattern at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${url}#overflow-menu`)
    const trigger = page.getByRole('button', { name: 'More actions for API latency' })
    const menu = page.locator('#overflow-live')
    const item = (name: string) => menu.getByRole('menuitem', { name })
    // The trigger takes the quiet action's hover text colour over its muted rest.
    const textColor = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style.color = 'var(--color-text)'
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    })
    await expect(page.locator('#overflow-menu .quiet-action.is-hover')).toHaveCSS('color', textColor)
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(menu).toBeVisible()
    // The open menu stays inside the viewport.
    const box = (await menu.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(item('Rename')).toBeFocused()
    // Arrows wrap and skip the disabled Export; Home, End, and a first letter move focus.
    await page.keyboard.press('ArrowDown')
    await expect(item('Duplicate')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(item('Delete…')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(item('Rename')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(item('Delete…')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(item('Rename')).toBeFocused()
    await page.keyboard.press('d')
    await expect(item('Duplicate')).toBeFocused()
    await page.keyboard.press('End')
    await expect(item('Delete…')).toBeFocused()
    // Escape closes it and returns focus to the trigger.
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
    // Up Arrow opens it on the last item; Tab closes it and moves on.
    await page.keyboard.press('ArrowUp')
    await expect(item('Delete…')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(menu).toBeHidden()
    // Running an item closes the menu and returns focus to the trigger.
    await trigger.click()
    await item('Duplicate').click()
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
    // A destructive item confirms in a dialog, which returns focus to the trigger when it closes.
    await trigger.click()
    await item('Delete…').click()
    await expect(page.locator('#live-dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#live-dialog')).toBeHidden()
    await expect(trigger).toBeFocused()
    // A press outside closes it.
    await trigger.click()
    await page.mouse.click(5, 5)
    await expect(menu).toBeHidden()
  })

  test('the page behind an open drawer does not scroll, and keeps its place', async ({ page }) => {
    await page.goto(`${url}#badge`)
    await expect(current(page)).toHaveText('Badge')
    const before = await page.evaluate(() => scrollY)
    // The / shortcut opens the drawer where the reader is; the trigger itself sits at the top of the page.
    await page.keyboard.press('/')
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

  test('/ opens the drawer with Find focused, and neither it nor a tap on the trigger scrolls the page', async ({ page }) => {
    await page.goto(`${url}#badge`)
    const before = await page.evaluate(() => scrollY)
    expect(before).toBeGreaterThan(0)
    await page.keyboard.press('/')
    await expect(page.locator('#find')).toBeFocused()
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await page.keyboard.press('Escape')
    await expect(page.locator('#nav-drawer')).toBeHidden()
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await page.evaluate(() => scrollTo(0, 0))
    await page.locator('#section-menu').click()
    await expect(page.locator('#nav-drawer')).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  // The backdrop belongs to the dialog element, so a press on it is a press on the dialog outside the drawer's box.
  test.describe('outside the drawer', { tag: '@webkit' }, () => {
    test.use({ hasTouch: true })
    const outside = { x: 370, y: 500 }

    test('a tap or click outside closes the drawer and focuses the trigger, and a press that starts inside keeps it open', async ({ page }) => {
      await page.goto(url)
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
      await page.mouse.move(outside.x, outside.y)
      await page.mouse.up()
      expect(await open()).toBe(true)
      await page.touchscreen.tap(outside.x, outside.y)
      await expect(drawer).toBeHidden()
      await expect(trigger).toBeFocused()
      await trigger.click()
      await expect(drawer).toBeVisible()
      await page.mouse.click(outside.x, outside.y)
      await expect(drawer).toBeHidden()
      await expect(trigger).toBeFocused()
    })

    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      test(`after a / open, a tap outside returns focus to the trigger without scrolling the page, with reduced motion ${reducedMotion}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion })
        await page.goto(url)
        // Scrolled by the reader, not by a deep link: WebKit on Linux scrolls back to a link's target when the
        // drawer opens, whatever takes focus.
        await page.evaluate(() => new Promise((done) => { scrollTo(0, 5000); requestAnimationFrame(() => requestAnimationFrame(done)) }))
        const before = await page.evaluate(() => scrollY)
        expect(before).toBe(5000)
        await page.keyboard.press('/')
        await expect(page.locator('#find')).toBeFocused()
        expect(await page.evaluate(() => scrollY), 'the open scrolled the page').toBe(before)
        await page.touchscreen.tap(370, 500)
        await expect(page.locator('#nav-drawer')).toBeHidden()
        await expect(page.locator('#section-menu')).toBeFocused()
        expect(await page.evaluate(() => scrollY), 'the close scrolled the page').toBe(before)
      })
    }

    test('the live drawer specimen closes on a click outside and focuses its button', async ({ page }) => {
      await page.goto(url)
      const button = page.locator('[data-open="live-drawer"]')
      await button.click()
      await expect(page.locator('#live-drawer')).toBeVisible()
      await page.mouse.click(outside.x, outside.y)
      await expect(page.locator('#live-drawer')).toBeHidden()
      await expect(button).toBeFocused()
    })

    test('with reduced motion, a tap outside closes the drawer at once and does not reach the page behind it', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(url)
      await page.locator('#section-menu').click()
      await expect(page.locator('#nav-drawer')).toBeVisible()
      await page.evaluate(() => {
        const reached: string[] = (window as unknown as { reached: string[] }).reached = []
        document.addEventListener('click', (e) => { if (!(e.target as Element).closest('dialog')) reached.push((e.target as Element).tagName) }, true)
      })
      await page.touchscreen.tap(outside.x, outside.y)
      await expect(page.locator('#nav-drawer')).toBeHidden()
      expect(await page.evaluate(() => (window as unknown as { reached: string[] }).reached)).toEqual([])
    })
  })
})

// The slideout: the drawer's layer from the trailing edge, for filters and detail, with a footer that stacks on phones.
test.describe('slideout', () => {
  const openSlideout = async (page: Page) => {
    await page.goto(url)
    const button = page.locator('[data-open="live-slideout"]')
    const slideout = page.locator('#live-slideout')
    await button.click()
    await expect(slideout).toBeVisible()
    // The slide in has finished, so the box is where it rests.
    await slideout.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)))
    return { button, slideout }
  }

  for (const width of [1280, 390]) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height: 800 } })

      test('it sits on the trailing edge, full height, 75% wide up to 384px, and the page behind does not scroll', async ({ page }) => {
        const { slideout } = await openSlideout(page)
        const box = (await slideout.boundingBox())!
        // The fixed layer's box: the viewport, less any scrollbar gutter the page reserves.
        const viewport = await page.evaluate(() => {
          const probe = document.body.appendChild(Object.assign(document.createElement('i'), { style: 'position: fixed; inset: 0' }))
          const { right } = probe.getBoundingClientRect()
          probe.remove()
          return right
        })
        expect(box.x + box.width).toBe(viewport)
        expect(box.width).toBeCloseTo(Math.min(0.75 * viewport, 384), 1)
        expect(box.y).toBe(0)
        expect(box.height).toBe(800)
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden')
      })
    })
  }

  test('Escape and each footer action slide it out and return focus to the trigger', async ({ page }) => {
    const { button, slideout } = await openSlideout(page)
    await page.keyboard.press('Escape')
    await expect(slideout).toBeHidden()
    await expect(button).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden')
    for (const name of ['Apply', 'Close filters']) {
      await button.click()
      await slideout.getByRole('button', { name }).click()
      await expect(slideout).toBeHidden()
      await expect(button).toBeFocused()
    }
  })

  test('Reset clears the filters and keeps it open', async ({ page }) => {
    const { slideout } = await openSlideout(page)
    const healthy = slideout.getByRole('checkbox', { name: 'Healthy' })
    await healthy.check()
    await slideout.getByRole('button', { name: 'Reset' }).click()
    await expect(healthy).not.toBeChecked()
    await expect(slideout).toBeVisible()
  })

  test('in a right-to-left page it rests on the trailing edge, the left', async ({ page }) => {
    await page.goto(url)
    await page.evaluate(() => { document.documentElement.dir = 'rtl' })
    await page.locator('[data-open="live-slideout"]').click()
    const slideout = page.locator('#live-slideout')
    await slideout.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)))
    expect((await slideout.boundingBox())!.x).toBe(0)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('the footer actions stack at full width, with the primary action last', async ({ page }) => {
      const { slideout } = await openSlideout(page)
      const foot = (await slideout.locator('.slideout-foot').boundingBox())!
      const [reset, apply] = await Promise.all(['Reset', 'Apply'].map(async (name) => (await slideout.getByRole('button', { name }).boundingBox())!))
      expect(apply.y).toBeGreaterThan(reset.y + reset.height - 1)
      for (const action of [reset, apply]) expect(action.width).toBeGreaterThan(foot.width - 2 * 16 - 3)
    })
  })

  test.describe('outside it', { tag: '@webkit' }, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
    const outside = { x: 20, y: 400 }

    test('a tap or click outside closes it and focuses the trigger, and a press that starts inside keeps it open', async ({ page }) => {
      const { button, slideout } = await openSlideout(page)
      const title = slideout.locator('#live-slideout-title')
      const open = () => slideout.evaluate((dialog: HTMLDialogElement) => dialog.open && !('closing' in dialog.dataset))
      await title.tap()
      expect(await open()).toBe(true)
      // A drag from inside the slideout that ends outside it.
      const { x, y, width, height } = (await title.boundingBox())!
      await page.mouse.move(x + width / 2, y + height / 2)
      await page.mouse.down()
      await page.mouse.move(outside.x, outside.y)
      await page.mouse.up()
      expect(await open()).toBe(true)
      await page.touchscreen.tap(outside.x, outside.y)
      await expect(slideout).toBeHidden()
      await expect(button).toBeFocused()
      await button.click()
      await expect(slideout).toBeVisible()
      await page.mouse.click(outside.x, outside.y)
      await expect(slideout).toBeHidden()
      await expect(button).toBeFocused()
    })
  })
})

// The backdrop belongs to the dialog element, so a press on it is a press on the dialog outside the dialog's box.
// The dialogs are centred with a margin at both widths, so the top left corner is outside them.
test.describe('outside a dialog', { tag: '@webkit' }, () => {
  const outside = { x: 8, y: 8 }
  const open = async (page: Page, { opener = '[data-open="live-dialog"]', id = 'live-dialog' } = {}) => {
    await page.goto(url)
    const button = page.locator(opener)
    const dialog = page.locator(`#${id}`)
    await button.click()
    await expect(dialog).toBeVisible()
    const box = (await dialog.boundingBox())!
    expect(outside.x < box.x || outside.y < box.y, 'the outside point is inside the dialog').toBe(true)
    return { button, dialog }
  }

  for (const { input, viewport } of [
    { input: 'tap', viewport: { width: 390, height: 844 } },
    { input: 'click', viewport: { width: 1280, height: 900 } },
  ] as const) {
    test.describe(`${input} at ${viewport.width}px`, () => {
      test.use({ viewport, hasTouch: input === 'tap' })

      test(`a ${input} outside closes the dialog and focuses its button, and a press that starts inside keeps it open`, async ({ page }) => {
        const { button, dialog } = await open(page)
        const title = dialog.locator('#live-dialog-title')
        await (input === 'tap' ? title.tap() : title.click())
        await expect(dialog).toBeVisible()
        // A drag from inside the dialog that ends outside it.
        const { x, y, width, height } = (await title.boundingBox())!
        await page.mouse.move(x + width / 2, y + height / 2)
        await page.mouse.down()
        await page.mouse.move(outside.x, outside.y)
        await page.mouse.up()
        await expect(dialog).toBeVisible()
        await (input === 'tap' ? page.touchscreen.tap(outside.x, outside.y) : page.mouse.click(outside.x, outside.y))
        await expect(dialog).toBeHidden()
        await expect(button).toBeFocused()
      })

      test(`the viewer names the capture, fits the viewport, and a ${input} outside closes it and focuses its button`, async ({ page }) => {
        const { button, dialog } = await open(page, { opener: '[data-full-size]', id: 'capture-viewer' })
        await expect(dialog).toHaveAccessibleName('status capture')
        // The body is the one scroll region, named by the title; a viewer has no footer.
        await expect(dialog.getByRole('region', { name: 'status capture' })).toHaveAttribute('tabindex', '0')
        await expect(dialog.locator('.dialog-foot')).toHaveCount(0)
        const box = (await dialog.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
        await (input === 'tap' ? page.touchscreen.tap(outside.x, outside.y) : page.mouse.click(outside.x, outside.y))
        await expect(dialog).toBeHidden()
        await expect(button).toBeFocused()
      })
    })
  }

  test.describe('tap at 390px with reduced motion', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })

    test('a tap outside closes the dialog and does not reach the page behind it', async ({ page }) => {
      const { dialog } = await open(page)
      await page.evaluate(() => {
        const reached: string[] = (window as unknown as { reached: string[] }).reached = []
        document.addEventListener('click', (e) => { if (!(e.target as Element).closest('dialog')) reached.push((e.target as Element).tagName) }, true)
      })
      await page.touchscreen.tap(outside.x, outside.y)
      await expect(dialog).toBeHidden()
      expect(await page.evaluate(() => (window as unknown as { reached: string[] }).reached)).toEqual([])
    })
  })

  test.describe('viewer at 320px', () => {
    test.use({ viewport: { width: 320, height: 640 }, colorScheme: 'light' })

    test('a capture wider than the viewer keeps its text on the terminal background while the body scrolls', async ({ page }) => {
      const { dialog } = await open(page, { opener: '[data-full-size]', id: 'capture-viewer' })
      const body = dialog.getByRole('region', { name: 'status capture' })
      expect(await body.evaluate((element) => element.scrollWidth > element.clientWidth), 'the capture overflows the viewer').toBe(true)
      const { plate, text } = await dialog.locator('.screen').evaluate((element) => ({ plate: element.getBoundingClientRect().width, text: element.scrollWidth }))
      // scrollWidth rounds to whole pixels.
      expect(plate).toBeGreaterThan(text - 1)
    })
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
      await expect(page.locator('#section-menu')).toBeHidden()
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

// Rendered recipes. Contrast and corners are read from computed styles, so overrides, whitespace, and
// corner longhands settle as Chromium renders them. Every specimen is measured in each state class it
// shows (.is-hover, .is-active, .is-focus, aria-pressed).
const docText = async (page: Page, file: string) => {
  await page.goto(new URL(`../../language/${file}`, import.meta.url).href)
  return page.locator('body').innerText()
}

type Pair = { selector: string; min: number; textPseudo?: string; fillPseudo?: string; edge?: boolean }
const contrastPairs: Record<string, Pair> = {
  'every enabled primary button label': { selector: '.btn:not(.secondary, .ghost, .danger, .text):not(:disabled)', min: 4.5 },
  'every enabled danger button label': { selector: '.btn.danger:not(:disabled)', min: 4.5 },
  'every danger menu item': { selector: '.menu-list [role="menuitem"].danger', min: 4.5 },
  'every status badge label': { selector: '.badge:is(.success, .warning, .danger, .info)', min: 4.5 },
  'every enabled toggle card label and description': { selector: '.toggle:not(:disabled) :is(.toggle-text, .toggle-text small)', min: 4.5 },
  'every selected segmented label on its thumb': { selector: '.segmented button[aria-pressed="true"]:not(:disabled)', fillPseudo: '::before', min: 4.5 },
  'shell command text on the code well': { selector: '.code.command .line', min: 4.5 },
  'the accent shell prompt on the code well': { selector: '.code.command .line', textPseudo: '::before', min: 3 },
  'every code block header label and Copy on the frame': { selector: '.code-head :is(b, .lang, .copy)', min: 4.5 },
  'every code block Copy at rest, in muted text': { selector: '.code .copy:not(.is-hover, [data-copied])', min: 4.5 },
  'every source line, line number, and syntax colour on its panel': { selector: '.code :is(.line, .ln, .k, .s, .n, .c)', min: 4.5 },
  'every focused field edge, on its fill and on the surface around it': { selector: ':is(.input, .select, .textarea, .search, .number-field).is-focus', edge: true, min: 3 },
}
// Each specimen's text (or edge) colour over the background colours stacked under it. Chromium computes
// colours as rgb() or color(srgb …); anything else throws, so a pair cannot pass unread. The helper does not
// model paint order: a background image in the stack, or a host background over a pseudo-element fill,
// makes the specimen fail as unmeasured.
const ratios = (page: Page, pair: Pair) => page.locator(pair.selector).evaluateAll((nodes, { textPseudo, fillPseudo, edge }) => {
  const parse = (value: string) => {
    const rgb = value.match(/^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)$/)
    if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])]
    const srgb = value.match(/^color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([\d.]+))?\)$/)
    if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), srgb[4] === undefined ? 1 : Number(srgb[4])]
    throw new Error(`unsupported colour: ${value}`)
  }
  const over = (top: number[], bottom: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1)
  // The layers down to the first opaque one, innermost first; anything under that is hidden.
  const ground = (node: Element, pseudo?: string) => {
    const styles = pseudo ? [getComputedStyle(node, pseudo)] : []
    for (let el: Element | null = node; el; el = el.parentElement) styles.push(getComputedStyle(el))
    if (pseudo && (parse(styles[1].backgroundColor)[3] > 0 || styles[1].backgroundImage !== 'none')) {
      throw new Error(`a host background over the ${pseudo} fill: ${styles[1].backgroundColor} ${styles[1].backgroundImage}`)
    }
    const layers: number[][] = []
    for (const style of styles) {
      if (style.backgroundImage !== 'none') throw new Error(`a background image: ${style.backgroundImage}`)
      const colour = parse(style.backgroundColor)
      layers.push(colour)
      if (colour[3] === 1) break
    }
    return layers.reverse().reduce((below, layer) => over(layer, below), [1, 1, 1, 1])
  }
  const luminance = (c: number[]) => c.slice(0, 3).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const ratio = (ink: number[], below: number[]) => {
    const [hi, lo] = [luminance(over(ink, below)), luminance(below)].sort((a, b) => b - a)
    return (hi + 0.05) / (lo + 0.05)
  }
  return nodes.flatMap((node, index) => {
    const name = `${node.className} #${index} "${node.textContent?.trim().slice(0, 24)}"`
    try {
      if (edge) {
        const ink = parse(getComputedStyle(node).borderTopColor)
        return [{ name: `${name} on its fill`, ratio: ratio(ink, ground(node)) }, { name: `${name} on its surface`, ratio: ratio(ink, ground(node.parentElement!)) }]
      }
      return [{ name, ratio: ratio(parse(getComputedStyle(node, textPseudo).color), ground(node, fillPseudo)) }]
    } catch (error) {
      return [{ name, ratio: Number.NaN, unmeasured: (error as Error).message }]
    }
  })
}, pair)
const below = (measured: { name: string; ratio: number; unmeasured?: string }[], min: number) => measured.filter(({ ratio }) => !(ratio >= min))
  .map(({ name, ratio, unmeasured }) => `${name}: ${unmeasured ? `unmeasured, ${unmeasured}` : `${ratio.toFixed(2)}:1`}`)

// Shape follows role (DESIGN.md, Surfaces): the rendered corners of each role's parts equal its token.
// The slider track and the select picker are engine pseudo-elements that computed styles cannot reach;
// the node literal-radius guard covers them.
const shapeRoles: Record<string, string[]> = {
  '--radius-control': ['.btn:not(.rail-summary, .menu-glyph, [data-icon-only])', '.quiet-action:not(.projects > summary, .msg-tools .quiet-action, .number-field > .quiet-action)', '.segmented:not([data-icon-only])', '.chip'],
  // A lone icon that acts on its own fill: an icon-only button, on a square box.
  '--radius-circle': ['.btn[data-icon-only]'],
  '--radius-pill': ['.switch-track', '.toggle-track', '.switch-track::after', '.toggle-track::after', '.progress', '.score .pips i', '.badge', '.navlist a[aria-current="location"]::before', '.segmented[data-icon-only]'],
  '--radius-inline': ['.tab', '.navlist a:not(.projects .navlist a)', '.group-toggle', '.crumbs a', '.site-name', '.rows [role="option"]', '.msg', '.avatar', '.msg-tools .quiet-action', '.tool > summary'],
  // Small marks inside text or a row: the checkbox, the keyboard key, and a mention.
  '--radius-mark': ['.check input:not([type="radio"])', '.key', '.mention'],
  // One-line controls that are not actions take the field corner: the select, the project-menu trigger,
  // the labelled contents trigger at rest and pressed, its no-JavaScript summary, and the skip link.
  '--radius-field': ['.input', '.select', '.textarea', '.search', '.number-field', '.number-field > .quiet-action', '.toggle', '.pager a', '.projects > summary', '.menu-glyph', '.rail-summary', '.skip'],
  '--radius-panel': ['.picker', '.radio-card', '.alert', '.surface', '.card', '.stat', '.figure-plate', '.dialog', '.code:not(.example > .code)', '.example', '.capture', '.projects .navlist', '.menu-list', '.msg-tools', '.composer-box', '.tool-body', '.thread-demo'],
}
// Shapes that sit inside a rounded container are concentric with it: its radius minus the gap. Rows that sit
// --space-1 inside a panel, and a code block's source panel; and a segmented option and its thumb, --inset inside its track.
// Each radius resolves inside its container, where a local gap such as --inset is set.
const concentricShapes = [
  { radius: 'calc(var(--radius-panel) - var(--space-1))', container: 'body', selectors: ['.select option', '.picker li', '.projects .navlist a', '.menu-list [role="menuitem"]', '.code:not(.example > .code) > pre'] },
  { radius: 'calc(var(--radius-control) - var(--inset))', container: '.segmented:not([data-icon-only])', selectors: ['.segmented:not([data-icon-only]) button', '.segmented:not([data-icon-only]) button::before'] },
  // Icon-only: round options in a pill track. A px radius keeps the thumb a pill, not an ellipse, while it glides.
  { radius: 'calc(var(--radius-pill) - var(--inset))', container: '.segmented[data-icon-only]', selectors: ['.segmented[data-icon-only] button', '.segmented[data-icon-only] button::before'] },
]
const shapeProblems = (page: Page) => page.evaluate(({ roles, concentric }) => {
  const corners = (style: CSSStyleDeclaration) => [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].join(' ')
  const problems = new Set<string>()
  const resolve = (radius: string, container: string) => {
    const probe = document.querySelector(container)?.appendChild(document.createElement('i'))
    if (!probe) {
      problems.add(`${radius}: no ${container} to resolve it in`)
      return ''
    }
    probe.style.borderRadius = radius
    const value = getComputedStyle(probe).borderTopLeftRadius
    probe.remove()
    // An unset gap makes the calc() invalid, which computes to 0px and would match a thumb with no corner.
    if (value === '0px') problems.add(`${radius}: resolves to 0px in ${container}`)
    return value
  }
  const expected = [
    // A role token can be a calc() of --radius-base, so it resolves through a probe as a length, as the corners do.
    ...Object.entries(roles).flatMap(([token, list]) => {
      const value = resolve(`var(${token})`, 'body')
      return list.map((selector) => [selector, value])
    }),
    ...concentric.flatMap(({ radius, container, selectors }) => {
      const value = resolve(radius, container)
      return selectors.map((selector) => [selector, value])
    }),
  ].map(([selector, value]) => ({ base: selector.replace(/::[\w-]+$/, ''), pseudo: selector.match(/::[\w-]+$/)?.[0] ?? null, selector, value }))
  for (const { base, pseudo, selector, value } of expected) {
    const nodes = [...document.querySelectorAll(base)]
    if (nodes.length === 0) problems.add(`${selector}: no specimen`)
    for (const node of nodes) {
      const got = corners(getComputedStyle(node, pseudo))
      if (got !== `${value} ${value} ${value} ${value}`) problems.add(`${selector}: ${got}, not ${value}`)
    }
  }
  // Any other corner is none, round, or the corners of the shape it fills.
  for (const node of document.querySelectorAll('body *')) {
    for (const pseudo of [null, '::before', '::after']) {
      const got = corners(getComputedStyle(node, pseudo))
      const host = pseudo ? node : node.parentElement
      if (got === '0px 0px 0px 0px' || got === '50% 50% 50% 50%' || (host && got === corners(getComputedStyle(host)))) continue
      if (expected.some((rule) => rule.pseudo === pseudo && node.matches(rule.base))) continue
      problems.add(`${node.tagName.toLowerCase()}${[...node.classList].map((name) => `.${name}`).join('')}${pseudo ?? ''}: ${got}, with no role`)
    }
  }
  return [...problems]
}, { roles: shapeRoles, concentric: concentricShapes })

// Every theme in tokens.json, the default first. Each one renders the recipes with its theme file loaded
// after tokens.css on :root, as a consumer loads it.
const { themes } = tokens
const openInTheme = async (page: Page, theme: string) => {
  await page.goto(url)
  await page.addStyleTag({ url: new URL(`../../dist/themes/${theme}.css`, import.meta.url).href })
  // The new hue starts each control's colour transition from the default one; measure where they end.
  // Only transitions: the busy spinner's animation never ends.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished)))
}

test.describe('rendered recipes', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(colorScheme, () => {
      test.use({ colorScheme })

      for (const theme of Object.keys(themes) as (keyof typeof themes)[]) {
        test.describe(theme, () => {
          test('the theme file sets the accent and the tokens that follow it to its tokens.json values', async ({ page }) => {
            await openInTheme(page, theme)
            const names = ['color-project', 'color-accent', 'color-focus', 'color-nav-current-text']
            const rendered = await page.evaluate((list) => list.map((name) => {
              const probe = document.createElement('i')
              probe.style.color = `var(--${name})`
              document.body.append(probe)
              const value = getComputedStyle(probe).color
              probe.remove()
              return value
            }), names)
            const expected = await page.evaluate((list) => list.map((value) => {
              const probe = document.createElement('i')
              probe.style.color = value
              document.body.append(probe)
              const out = getComputedStyle(probe).color
              probe.remove()
              return out
            }), names.map((name) => themes[theme][colorScheme][name as keyof (typeof themes)[typeof theme]['light']]))
            expect(rendered).toEqual(expected)
          })

          for (const [name, pair] of Object.entries(contrastPairs)) {
            test(`contrast: ${name} reaches ${pair.min}:1`, async ({ page }) => {
              await openInTheme(page, theme)
              const measured = await ratios(page, pair)
              expect(measured.length).toBeGreaterThan(0)
              expect(below(measured, pair.min)).toEqual([])
            })
          }

          test('each component renders the corner radius of its role, and no other part has one', async ({ page }) => {
            await openInTheme(page, theme)
            expect(await shapeProblems(page)).toEqual([])
          })
        })
      }

      test('contrast: the toggle card ratios in decisions.md match the render', async ({ page }) => {
        const row = (await docText(page, 'decisions.md')).split('\n').find((line) => line.startsWith('| Toggle card |'))
        await page.goto(url)
        // The one card with a description is the live one: press it, with no transition to sample midway.
        await page.addStyleTag({ content: '.toggle { transition: none; }' })
        await page.locator('.toggle:has(small)').evaluate((node) => node.setAttribute('aria-pressed', 'true'))
        const measured = await ratios(page, { selector: '.toggle:has(small) :is(.toggle-text, .toggle-text small)', min: 0 })
        expect(measured).toHaveLength(2)
        expect(below(measured, 0)).toEqual([])
        for (const { ratio } of measured) expect(row).toContain(`${ratio.toFixed(2)}:1`)
      })
    })
  }

  test('the contrast check fails a hover rule that hides the primary label', async ({ page }) => {
    await page.goto(url)
    await page.addStyleTag({ content: '.btn:is(:hover, .is-hover):not(:disabled) { color: var(--color-button-hover); }' })
    expect(below(await ratios(page, contrastPairs['every enabled primary button label']), 4.5)).toEqual([expect.stringMatching(/^btn is-hover #\d+ ".*": 1\.00:1$/)])
  })

  test('the contrast check fails a fill it cannot measure: a background image, or a host background over a pseudo-element fill', async ({ page }) => {
    await page.goto(url)
    await page.addStyleTag({ content: `.btn:is(:hover, .is-hover):not(:disabled) { background-image: linear-gradient(var(--color-accent-text), var(--color-accent-text)); }
      .segmented button[aria-pressed="true"] { background: var(--color-segmented-current-text); }` })
    expect(below(await ratios(page, contrastPairs['every enabled primary button label']), 4.5)).toEqual([expect.stringMatching(/^btn is-hover #\d+ ".*": unmeasured, a background image: linear-gradient/)])
    const segmented = below(await ratios(page, contrastPairs['every selected segmented label on its thumb']), 4.5)
    expect(segmented.length).toBeGreaterThan(0)
    for (const line of segmented) expect(line).toMatch(/unmeasured, a host background over the ::before fill/)
    await page.addStyleTag({ content: `.segmented button[aria-pressed="true"] { background: linear-gradient(var(--color-segmented-current-text), var(--color-segmented-current-text)); }` })
    const imaged = below(await ratios(page, contrastPairs['every selected segmented label on its thumb']), 4.5)
    expect(imaged).toHaveLength(segmented.length)
    for (const line of imaged) expect(line).toMatch(/unmeasured, a host background over the ::before fill: rgba\(0, 0, 0, 0\) linear-gradient/)
  })

  test('the DESIGN.md shape table names each role token with its value', async ({ page }) => {
    const table = [...(await docText(page, 'DESIGN.md')).matchAll(/^\s*\| [^|]+ \| (Pill|Circle|\d+px) \| `(--radius-[\w-]+)` \|/gm)].map(([, shape, token]) => [token, shape])
    expect(table.map(([token]) => token).sort()).toEqual(Object.keys(shapeRoles).sort())
    await page.goto(url)
    // Resolved as a length on a probe: a role token can be a calc() of --radius-base.
    const values = await page.evaluate((tokens) => tokens.map((token) => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style.borderRadius = `var(${token})`
      const value = getComputedStyle(probe).borderTopLeftRadius
      probe.remove()
      return value
    }), table.map(([token]) => token))
    expect(values).toEqual(table.map(([, shape]) => (shape === 'Pill' || shape === 'Circle' ? '999px' : shape)))
  })


  test('the shape check catches a role override, a corner longhand, and a radius with no role', async ({ page }) => {
    await page.goto(url)
    // Control, inline, and field are all 8px, so the planted override takes a token of another value.
    await page.addStyleTag({ content: '.tab{border-radius:var(--radius-panel)} .key { border-top-left-radius: var(--radius-pill) } .purpose { border-radius: var(--radius-control) }' })
    const problems = await shapeProblems(page)
    expect(problems).toContain('.tab: 12px 12px 12px 12px, not 8px')
    expect(problems).toContain('.key: 999px 4px 4px 4px, not 4px')
    expect(problems).toContain('p.purpose: 8px 8px 8px 8px, with no role')
  })
})

// In forced colors a fill takes the system background, and an SVG keeps the colour it sets. The badge's tone
// dot and the alert's status icon must still draw, in the system text colour of their label.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`forced colors, ${colorScheme}`, () => {
    test.use({ forcedColors: 'active', colorScheme, viewport: { width: 1280, height: 900 } })

    test('each status badge keeps its tone dot in the label colour', async ({ page }) => {
      await page.goto(url)
      const badges = await page.locator('#badge .badge:is(.success, .warning, .danger, .info)').evaluateAll((items) => items.map((item) => ({
        text: getComputedStyle(item).color,
        dot: getComputedStyle(item, '::before').backgroundColor,
        canvas: getComputedStyle(document.body).backgroundColor,
      })))
      expect(badges).toHaveLength(4)
      for (const { text, dot, canvas } of badges) {
        expect(dot).toBe(text)
        expect(dot).not.toBe(canvas)
      }
    })

    test('each alert icon takes the alert text colour', async ({ page }) => {
      await page.goto(url)
      const alerts = await page.locator('#alert .alert').evaluateAll((items) => items.map((item) => ({
        text: getComputedStyle(item).color,
        icon: getComputedStyle(item.querySelector('.icon')!).color,
      })))
      expect(alerts).toHaveLength(5)
      for (const { text, icon } of alerts) expect(icon).toBe(text)
    })

    // Each expected system colour is read from a probe, as the Wrap lines check does.
    test('the number field signs take the button text colour, and a disabled sign the disabled colour', async ({ page }) => {
      await page.goto(url)
      const signs = await page.locator('#nf-min').evaluate((input) => {
        const system = (name: string) => {
          const probe = document.body.appendChild(document.createElement('i'))
          probe.style.color = name
          const colour = getComputedStyle(probe).color
          probe.remove()
          return colour
        }
        const [down, up] = [...input.parentElement!.querySelectorAll('button')].map((button) => getComputedStyle(button.querySelector('.icon')!).color)
        return { down, up, buttonText: system('ButtonText'), grayText: system('GrayText') }
      })
      expect(signs.up).toBe(signs.buttonText)
      expect(signs.down).toBe(signs.grayText)
    })

    test('the combobox active option keeps a Highlight ring inside its edge', async ({ page }) => {
      await page.goto(url)
      const ring = await page.locator('#cb-open-list [data-active]').evaluate((option) => {
        const probe = document.body.appendChild(document.createElement('i'))
        probe.style.color = 'Highlight'
        const highlight = getComputedStyle(probe).color
        probe.remove()
        const style = getComputedStyle(option)
        return { highlight, colour: style.outlineColor, style: style.outlineStyle, offset: parseFloat(style.outlineOffset) }
      })
      expect(ring.colour).toBe(ring.highlight)
      expect(ring.style).toBe('solid')
      expect(ring.offset).toBeLessThan(0)
    })
  })
}

// The live number fields and combobox in components.html. Each locale block checks that the page reads back
// what its own formatter writes.
for (const { locale, quantity, weight, quantityUp } of [
  { locale: 'de-DE', quantity: '1.200', weight: '12,5', quantityUp: '1.201' },
  { locale: 'ar-EG', quantity: '١٬٢٠٠', weight: '١٢٫٥', quantityUp: '١٬٢٠١' },
]) {
  test.describe(`number field in ${locale}`, () => {
    test.use({ locale })

    test('the seed values keep their numbers, and a step reads the shown digits', async ({ page }) => {
      await page.goto(`${url}#number-field`)
      await expect(page.locator('#nf-live')).toHaveValue(quantity)
      await expect(page.locator('#nf-live')).toHaveAttribute('aria-valuenow', '1200')
      await expect(page.locator('#nf-weight')).toHaveValue(weight)
      await expect(page.locator('#nf-weight')).toHaveAttribute('aria-valuenow', '12.5')
      await page.locator('#nf-live').press('ArrowUp')
      await expect(page.locator('#nf-live')).toHaveValue(quantityUp)
      await expect(page.locator('#nf-live')).toHaveAttribute('aria-valuenow', '1201')
      // A negative number as the locale writes it, direction marks included, reads as a number and clamps to the minimum.
      const minusOne = await page.evaluate(() => new Intl.NumberFormat().format(-1))
      await page.locator('#nf-weight').fill(minusOne)
      await page.locator('#nf-weight').press('Tab')
      await expect(page.locator('#nf-weight')).toHaveAttribute('aria-valuenow', '0')
    })
  })
}

test.describe('live record fields', () => {
  test.use({ locale: 'en-US' })

  test('a typed fraction keeps its digits in the field, the value, and the value text', async ({ page }) => {
    await page.goto(`${url}#number-field`)
    const weight = page.locator('#nf-weight')
    await weight.fill('3.1234')
    await weight.press('Tab')
    await expect(weight).toHaveValue('3.1234')
    await expect(weight).toHaveAttribute('aria-valuenow', '3.1234')
    await expect(weight).toHaveAttribute('aria-valuetext', '3.1234 kg')
    // Committing a typed value keeps every digit; only a step rounds.
    await weight.fill('0.0000001')
    await weight.press('Tab')
    await expect(weight).toHaveValue('0.0000001')
    await expect(weight).toHaveAttribute('aria-valuenow', '1e-7')
    await expect(weight).toHaveAttribute('aria-valuetext', '0.0000001 kg')
    // Past the digits the field can show, all three agree on what it shows.
    await weight.fill('0.000000000000000000001')
    await weight.press('Tab')
    await expect(weight).toHaveValue('0')
    await expect(weight).toHaveAttribute('aria-valuenow', '0')
    await expect(weight).toHaveAttribute('aria-valuetext', '0 kg')
  })

  test('typing a number in range updates the value, its text, and both buttons; other text changes none', async ({ page }) => {
    await page.goto(`${url}#number-field`)
    const weight = page.locator('#nf-weight')
    const [down, up] = [page.getByRole('button', { name: 'Decrease weight' }), page.getByRole('button', { name: 'Increase weight' })]
    await weight.fill('0')
    await expect(weight).toHaveAttribute('aria-valuenow', '0')
    await expect(weight).toHaveAttribute('aria-valuetext', '0 kg')
    await expect(down).toBeDisabled()
    await expect(up).toBeEnabled()
    await weight.fill('1')
    await expect(down).toBeEnabled()
    for (const text of ['600', 'abc', '']) {
      await weight.fill(text)
      await expect(weight).toHaveAttribute('aria-valuenow', '1')
      await expect(weight).toHaveAttribute('aria-valuetext', '1 kg')
      await expect(down).toBeEnabled()
      await expect(up).toBeEnabled()
    }
    // A step starts from the number the field last showed, not from the last committed one.
    await weight.fill('0')
    await weight.fill('abc')
    await weight.press('ArrowUp')
    await expect(weight).toHaveAttribute('aria-valuenow', '0.5')
  })

  test('each stepper takes clicks over the field edge it spans', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await page.goto(`${url}#number-field`)
    for (const [name, outer] of [['Decrease quantity', 'left'], ['Increase quantity', 'right']] as const) {
      const button = page.locator('[data-live-number]').first().getByRole('button', { name })
      await button.scrollIntoViewIfNeeded()
      const missed = await button.evaluate((element, outer) => {
        const box = element.getBoundingClientRect()
        const [middleX, middleY] = [box.left + box.width / 2, box.top + box.height / 2]
        // The outer side, top, and bottom lie on the field's 1px edge.
        const points = [[outer === 'left' ? box.left + 0.5 : box.right - 0.5, middleY], [middleX, box.top + 0.5], [middleX, box.bottom - 0.5]]
        return points.filter(([x, y]) => !element.contains(document.elementFromPoint(x, y)))
      }, outer)
      expect(missed, name).toEqual([])
    }
  })

  test('leaving the combobox keeps the choice, even when the text names another option', async ({ page }) => {
    await page.goto(`${url}#combobox`)
    const input = page.locator('#cb-live')
    await input.fill('Hex nut M6')
    await input.press('Tab')
    await expect(input).toHaveValue('Hex bolt M8')
    await expect(page.locator('#cb-live-list [aria-selected="true"]')).toHaveText(['Hex bolt M8'])
  })

  test('the first Escape closes the list and puts the chosen label back; the second clears the text and the choice', async ({ page }) => {
    await page.goto(`${url}#combobox`)
    const input = page.locator('#cb-live')
    await input.fill('nut')
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    await input.press('Escape')
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(input).toHaveValue('Hex bolt M8')
    await input.press('Escape')
    await expect(input).toHaveValue('')
    await expect(page.locator('#cb-live-list [aria-selected="true"]')).toHaveCount(0)
    // A list the chevron closed still leaves typed text, so the first Escape puts the label back.
    await page.reload()
    await input.fill('nut')
    await page.locator('[data-live-combobox] .combobox-toggle').click()
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await input.press('Escape')
    await expect(input).toHaveValue('Hex bolt M8')
    await expect(page.locator('#cb-live-list [aria-selected="true"]')).toHaveText(['Hex bolt M8'])
  })

  test('the chosen option is named without its check, and the field autocompletes from a list', async ({ page }) => {
    await page.goto(`${url}#combobox`)
    const input = page.locator('#cb-live')
    await expect(input).toHaveAttribute('aria-autocomplete', 'list')
    await input.press('ArrowDown')
    await expect(page.locator('#cb-live-list').getByRole('option', { name: 'Hex bolt M8', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  // fit-content(12rem) caps the column only at a term's min-content width, so a term must be able to wrap anywhere.
  test('an unbroken description list term keeps the term column at 12rem', async ({ page }) => {
    await page.goto(`${url}#description-list`)
    const width = await page.locator('#description-list .state.wide .description-list').evaluate((list) => {
      list.querySelector('dt')!.textContent = 'Supplierreferencewithoutanyspaceinit'
      return list.querySelector('dt')!.getBoundingClientRect().width
    })
    expect(width).toBeLessThanOrEqual(192)
  })
})

// The code block is a frame that holds the header, with the source in a panel --space-1 inside it on the
// other sides. A live example's source is flush with its frame and is left out.
test('the code block source is an 8px panel 4px inside a 12px frame', async ({ page }) => {
  await page.goto(url)
  const blocks = await page.locator('.code:not(.example > .code)').evaluateAll((frames) => frames.map((frame) => {
    const pre = frame.querySelector(':scope > pre')!
    const head = frame.querySelector(':scope > .code-head')
    const [outer, panel] = [frame.getBoundingClientRect(), pre.getBoundingClientRect()]
    const border = parseFloat(getComputedStyle(frame).borderTopWidth)
    return {
      head: !!head,
      frame: getComputedStyle(frame).borderRadius,
      panel: getComputedStyle(pre).borderRadius,
      top: head ? panel.top - head.getBoundingClientRect().bottom : panel.top - outer.top - border,
      left: panel.left - outer.left - border,
      bottom: outer.bottom - panel.bottom - border,
      // In a compact block Copy sits beside the panel, --space-1 away, as the frame is on the other sides.
      right: head ? outer.right - panel.right - border : frame.querySelector(':scope > .copy')!.getBoundingClientRect().left - panel.right,
    }
  }))
  // Source and shell specimens, with and without a header, on the same code well.
  expect(blocks.filter(({ head }) => head).length).toBeGreaterThanOrEqual(2)
  expect(blocks.filter(({ head }) => !head).length).toBeGreaterThanOrEqual(3)
  // Under a header the panel meets the header; without one it sits 4px below the frame's edge.
  for (const block of blocks) expect(block).toEqual({ head: block.head, frame: '12px', panel: '8px', top: block.head ? 0 : 4, left: 4, bottom: 4, right: 4 })
})

// A segmented control lines up with the buttons beside it: at each size its track is a same-size button's height,
// and the pressed option, which is its own thumb, sits as far from the track's top edge as from its bottom edge.
// Its label sits centred in the option too, measured in Inter, which the catalogue does not load itself.
test.describe('segmented control alignment', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  const sizes = [
    { size: 'sm', track: '#segmented-control .segmented[data-size="sm"]', button: '#button .btn[data-size="sm"]' },
    { size: 'md', track: '#segmented-control .segmented[aria-label="View"]', button: '#button .btn[data-size="md"]' },
    { size: 'lg', track: '#segmented-control .segmented[data-size="lg"]', button: '#button .btn[data-size="lg"]' },
  ]
  for (const { size, track, button } of sizes) {
    test(`${size}: the track is a button's height, and the pressed option and its label sit centred`, async ({ page }) => {
      await page.goto(url)
      await page.addStyleTag({ url: new URL('../../fonts/fonts.css', import.meta.url).href })
      await page.evaluate(async () => {
        await Promise.all(['400 1rem "Inter"', '500 1rem "Inter"'].map((font) => document.fonts.load(font)))
        await document.fonts.ready
      })
      expect(await page.evaluate(() => [...document.fonts].some((face) => face.family.includes('Inter') && face.status === 'loaded'))).toBe(true)
      const [trackHeight, buttonHeight] = await Promise.all([page.locator(track).first(), page.locator(button).first()]
        .map((node) => node.evaluate((element) => element.getBoundingClientRect().height)))
      expect(Math.abs(trackHeight - buttonHeight), `track ${trackHeight}px, button ${buttonHeight}px`).toBeLessThan(0.5)
      const gaps = await page.locator(`${track} button[aria-pressed="true"]`).first().evaluate((option) => {
        const [outer, box] = [option.parentElement!.getBoundingClientRect(), option.getBoundingClientRect()]
        const label = [...option.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!
        const range = document.createRange()
        range.selectNodeContents(label)
        const text = range.getBoundingClientRect()
        const next = option.nextElementSibling!.getBoundingClientRect()
        return { thumb: [box.top - outer.top, outer.bottom - box.bottom], start: box.left - outer.left, between: next.left - box.right, label: [text.top - box.top, box.bottom - text.bottom] }
      })
      // The track insets its options 2px from its outer edge, with 2px between them.
      for (const inset of [...gaps.thumb, gaps.start, gaps.between]) expect(inset, `insets ${JSON.stringify(gaps)}`).toBeCloseTo(2, 1)
      expect(Math.abs(gaps.label[0] - gaps.label[1]), `label gaps ${gaps.label}`).toBeLessThan(0.5)
    })
  }
})

// The hover toolbar is one Tab stop with arrow keys between its buttons; the thread panel's handle is a separator
// that the arrow keys resize from 20rem to 40rem. Neither shows on a touch-width screen.
test.describe('conversation keyboard', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('the hover toolbar shows on focus within, and Left and Right Arrow move a single Tab stop', async ({ page }) => {
    await page.goto(url)
    const bar = page.locator('#hover-toolbar .msg-tools').first()
    const buttons = bar.locator('button[aria-label]:not([role="menuitem"])')
    await expect(bar).toHaveCSS('opacity', '0')
    await buttons.first().focus()
    await expect(bar).toHaveCSS('opacity', '1')
    expect(await buttons.evaluateAll((list) => list.map((b) => (b as HTMLElement).tabIndex))).toEqual([0, -1, -1])
    await page.keyboard.press('ArrowRight')
    await expect(buttons.nth(1)).toBeFocused()
    await page.keyboard.press('End')
    await expect(buttons.nth(2)).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(buttons.first()).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(buttons.nth(2)).toBeFocused()
    expect(await buttons.evaluateAll((list) => list.map((b) => (b as HTMLElement).tabIndex))).toEqual([-1, -1, 0])
  })

  test('the thread handle widens the pane with Left Arrow and stops where the channel keeps 16rem, or at 40rem', async ({ page }) => {
    await page.goto(url)
    const handle = page.locator('#thread-panel .thread-demo .pane-resize')
    const pane = page.locator('#thread-panel .thread-demo .thread-pane')
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    const width = () => pane.evaluate((node) => node.getBoundingClientRect().width)
    expect(Math.round(await width())).toBe(26 * rem)
    await handle.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(handle).toHaveAttribute('aria-valuenow', '27')
    expect(Math.round(await width())).toBe(27 * rem)
    for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowLeft')
    const frameRem = await page.locator('#thread-panel .thread-demo').evaluate((node) => node.getBoundingClientRect().width) / rem
    const max = Math.max(20, Math.min(40, Math.floor(frameRem - 16)))
    await expect(handle).toHaveAttribute('aria-valuemax', String(max))
    await expect(handle).toHaveAttribute('aria-valuenow', String(max))
    // The separator reports the width the pane really takes, and the channel keeps at least 16rem.
    expect(Math.round(await width())).toBe(max * rem)
    expect(frameRem * rem - (await width())).toBeGreaterThanOrEqual(16 * rem - 1)
    await page.keyboard.press('ArrowRight')
    await expect(handle).toHaveAttribute('aria-valuenow', String(max - 1))
  })

  test('a desktop frame too narrow for both panes stacks them; a wide one keeps the channel at least 16rem', async ({ page }) => {
    const layout = () => page.locator('#thread-panel .thread-demo').evaluate((frame) => {
      const [stream, pane] = [frame.querySelector('.stream')!, frame.querySelector('.thread-pane')!].map((node) => node.getBoundingClientRect())
      return { stacked: pane.top > stream.top, channel: stream.width, handle: getComputedStyle(frame.querySelector('.pane-resize')!).display }
    })
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto(url)
    expect(await layout()).toMatchObject({ stacked: true, handle: 'none' })
    await page.setViewportSize({ width: 1280, height: 900 })
    const wide = await layout()
    expect(wide.stacked).toBe(false)
    expect(wide.channel).toBeGreaterThanOrEqual(16 * rem - 1)
  })

  test('touch screens never show the hover toolbar, at any width', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, hasTouch: true })
    const page = await context.newPage()
    await page.goto(url)
    await page.locator('#message-row .msg button').first().focus()
    await expect(page.locator('#message-row .msg-tools').first()).toBeHidden()
    await context.close()
  })

  test('at tablet width the toolbar and the handle hide, and the pane takes the full width', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 900 })
    await page.goto(url)
    await expect(page.locator('#hover-toolbar .msg-tools').first()).toBeHidden()
    await expect(page.locator('#thread-panel .thread-demo .pane-resize')).toBeHidden()
    const [frame, pane] = await Promise.all(['.thread-demo', '.thread-demo .thread-pane'].map((selector) => page.locator(`#thread-panel ${selector}`).evaluate((node) => node.getBoundingClientRect().width)))
    expect(Math.abs(frame - 2 - pane)).toBeLessThan(0.5)
  })
})

// Quiet actions take a faint overlay of their own colour: 6% under a hovering pointer and 12% pressed.
const alphaOf = (value: string) => {
  if (value === 'transparent') return 0
  const alpha = value.match(/^(?:rgba\(.*, |color\(srgb .* \/ )([\d.]+)\)$/)
  return alpha ? Number(alpha[1]) : 1
}
const stubClipboard = (page: Page) => page.addInitScript(() => {
  // A test sets window.failCopy to make the next copies fail.
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { if ((window as unknown as { failCopy?: boolean }).failCopy) throw new Error('denied') } } })
})

test.describe('code wrap', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('Wrap lines wraps a code block, and Copy still copies its lines', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as unknown as { copied: string[] }).copied.push(text) } } })
      ;(window as unknown as { copied: string[] }).copied = []
    })
    await page.goto(url)
    const source = [
      "export const runbook = 'https://docs.example.com/runbooks/api-latency/p95-breach-escalation-and-rollback-steps'",
      "export const message = 'API p95 latency stayed above the threshold for five minutes, so the on-call engineer is paged'",
    ].join('\n')
    const block = page.locator('#code-block .code:has(#code-wrap-src)')
    const other = page.locator('#code-block .code:has(#code-src)')
    const toggle = block.locator('.wrap-toggle')
    const scrolls = () => block.locator('pre').evaluate((pre) => pre.scrollWidth > pre.clientWidth)
    // Off by default: the long lines scroll sideways. The name stays; the state is aria-pressed.
    await expect(toggle).toHaveAccessibleName('Wrap lines')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(await scrolls()).toBe(true)
    await block.locator('.copy').click()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle).toHaveAccessibleName('Wrap lines')
    expect(await scrolls()).toBe(false)
    // The state is per block.
    await expect(other).not.toHaveAttribute('data-wrap')
    await expect(other.locator('.wrap-toggle')).toHaveAttribute('aria-pressed', 'false')
    // Each line number stays on its line's first visual row.
    const [number, text] = await block.locator('.line').first().evaluate((line) => [line.children[0], line.children[1]].map((part) => part.getBoundingClientRect().top))
    expect(Math.abs(number - text)).toBeLessThan(2)
    await block.locator('.copy').click()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(await scrolls()).toBe(true)
    expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual([source, source])
  })

  test('in forced colors Wrap lines on has a Highlight border and icon, at rest and on hover', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto(url)
    const toggle = page.locator('#code-block .code:has(#code-wrap-src) .wrap-toggle')
    const colours = () => toggle.evaluate((button) => {
      const highlight = document.createElement('i')
      highlight.style.color = 'Highlight'
      document.body.append(highlight)
      const expected = getComputedStyle(highlight).color
      highlight.remove()
      return { expected, border: getComputedStyle(button).borderTopColor, icon: getComputedStyle(button.querySelector('.icon')!).color }
    })
    await toggle.click()
    await page.mouse.move(0, 0)
    const rest = await colours()
    expect(rest.border).toBe(rest.expected)
    expect(rest.icon).toBe(rest.expected)
    await toggle.hover()
    const hover = await colours()
    expect(hover.border).toBe(hover.expected)
    expect(hover.icon).toBe(hover.expected)
  })

  test('every code block with a header or an example has Wrap lines before Copy, and a compact block has none', async ({ page }) => {
    await page.goto(url)
    const blocks = await page.locator('.code').evaluateAll((codes) => codes.map((code) => ({
      multi: Boolean(code.querySelector(':scope > .code-head') || code.parentElement?.matches('.example')),
      order: [...code.querySelectorAll('.wrap-toggle, .copy')].map((button) => button.classList.contains('copy') ? 'copy' : 'wrap').join(' '),
    })))
    expect(blocks.length).toBeGreaterThan(3)
    for (const { multi, order } of blocks) expect(order).toBe(multi ? 'wrap copy' : 'copy')
  })
})

test.describe('quiet action fill', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('a hovering pointer adds a 6% fill, and a press 12%', async ({ page }) => {
    await page.goto(url)
    const copy = page.locator('#code-block .code-head .copy[data-copy="code-src"]')
    const alpha = () => copy.evaluate((button) => getComputedStyle(button).backgroundColor).then(alphaOf)
    await copy.hover()
    await expect.poll(alpha).toBeCloseTo(0.06, 3)
    await page.mouse.down()
    await expect.poll(alpha).toBeCloseTo(0.12, 3)
    await page.mouse.up()
  })
})

test.describe('quiet action fill on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('a tap leaves no fill behind', async ({ page }) => {
    await stubClipboard(page)
    await page.goto(url)
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
    const copy = page.locator('#code-block .code-head .copy[data-copy="code-src"]')
    await copy.tap()
    await expect(copy.locator('use')).toHaveAttribute('href', '#i-tick')
    // A touch screen keeps :hover on the tapped button, so a hover fill would stay.
    await expect(copy).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })
})

// A successful copy swaps the icon for a tick for 1.5s and announces it. The label and name stay.
test.describe('copy feedback', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.clock.install()
    await stubClipboard(page)
    await page.goto(url)
  })

  test('Copy shows a tick for 1.5s, and a second click restarts the wait', async ({ page }) => {
    const copy = page.locator('#code-block .code-head .copy[data-copy="code-src"]')
    const icon = copy.locator('use')
    // Muted at rest; the block's text colour while the tick shows.
    const colour = (selector: string) => page.locator(selector).first().evaluate((node) => getComputedStyle(node).color)
    const [muted, codeText] = [await colour('#code-block .code-head .lang'), await colour('#code-block .code .line')]
    expect(muted).not.toBe(codeText)
    await expect(copy).toHaveCSS('color', muted)
    await copy.click()
    await expect(icon).toHaveAttribute('href', '#i-tick')
    // With the pointer off, only the copied state can hold the text colour.
    await page.mouse.move(0, 0)
    await expect(copy).toHaveCSS('color', codeText)
    await expect(page.locator('#copy-status')).toHaveText('Copied.')
    await expect(copy).toHaveText('Copy')
    await expect(copy).toHaveAccessibleName('Copy')
    await page.clock.runFor(1000)
    await copy.click()
    await page.clock.runFor(1000)
    // 2s after the first click: the first wait did not end the second.
    await expect(icon).toHaveAttribute('href', '#i-tick')
    await page.clock.runFor(600)
    await expect(icon).toHaveAttribute('href', '#i-copy')
    await page.mouse.move(0, 0)
    await expect(copy).toHaveCSS('color', muted)
  })

  test('copy link shows a tick, then its link icon again', async ({ page }) => {
    const link = page.locator('[data-copy-link="code-block"]')
    await link.click()
    await expect(link.locator('use')).toHaveAttribute('href', '#i-tick')
    await expect(page.locator('#copy-status')).toHaveText('Link copied.')
    await expect(link).toHaveAccessibleName('Copy link to Code block')
    await page.clock.runFor(1500)
    await expect(link.locator('use')).toHaveAttribute('href', '#i-link')
  })

  test('a failed copy keeps the copy icon and says so', async ({ page }) => {
    const copy = page.locator('#code-block .code-head .copy[data-copy="code-src"]')
    const icon = copy.locator('use')
    await page.evaluate(() => { (window as unknown as { failCopy: boolean }).failCopy = true })
    await copy.click()
    await expect(page.locator('#copy-status')).toHaveText('Copy failed. Select the text instead.')
    await expect(icon).toHaveAttribute('href', '#i-copy')
    // A failure during a tick puts the copy icon back at once.
    await page.evaluate(() => { (window as unknown as { failCopy: boolean }).failCopy = false })
    await copy.click()
    await expect(icon).toHaveAttribute('href', '#i-tick')
    await page.evaluate(() => { (window as unknown as { failCopy: boolean }).failCopy = true })
    await copy.click()
    await expect(page.locator('#copy-status')).toHaveText('Copy failed. Select the text instead.')
    await expect(icon).toHaveAttribute('href', '#i-copy')
  })
})

// Two copies in flight finish 1s apart. Each finished copy restarts the wait, so the tick stays until 1.5s after the
// last one, on the catalogue and on the reference page's own copy script.
for (const [file, selector] of [['components.html', '#code-block .code-head .copy[data-copy="code-src"]'], ['reference.html', '#detail .copy']]) {
  test(`${file}: two copies in flight keep the tick until 1.5s after the last one finishes`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.clock.install()
    await page.addInitScript(() => {
      // The first copy finishes after 1s and the second after 2s, counted from the clicks.
      const delays = [1000, 2000]
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => new Promise((resolve) => setTimeout(resolve, delays.shift())) } })
    })
    await page.goto(new URL(`../../language/${file}`, import.meta.url).href)
    const copy = page.locator(selector)
    const icon = copy.locator('use')
    await copy.click()
    await copy.click()
    await page.clock.runFor(2600)
    // The first copy's wait would have ended at 2.5s.
    await expect(icon).toHaveAttribute('href', '#i-tick')
    await page.clock.runFor(1000)
    await expect(icon).toHaveAttribute('href', '#i-copy')
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
