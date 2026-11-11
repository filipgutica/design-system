import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

// Behaviour of the catalogue shell in language/components.html: Find, the / shortcut, location
// tracking, the tablet drawer, the tab glide, the live slider's value, the page without JavaScript,
// overflow, forced colors, and axe.
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
    await page.setViewportSize({ width: 1280, height: 2100 })
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
    await page.setViewportSize({ width: 1280, height: 2100 })
    await page.goto(url)
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'smooth'
      const hashed = new Promise((done) => addEventListener('hashchange', done, { once: true }))
      document.querySelector<HTMLAnchorElement>('#rail a[href="#page-type-and-helpers"]')!.click()
      await hashed
    })
    // A frame between resizes delivers each one as its own resize event; without it they coalesce into one.
    for (let shrink = 1; shrink <= 40; shrink++) {
      await page.setViewportSize({ width: 1280, height: 2100 - shrink })
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
  'every status badge label': { selector: '.badge:is(.success, .warning, .danger, .info)', min: 4.5 },
  'every enabled toggle card label and description': { selector: '.toggle:not(:disabled) :is(.toggle-text, .toggle-text small)', min: 4.5 },
  'every selected segmented label on its thumb': { selector: '.segmented button[aria-pressed="true"]:not(:disabled)', fillPseudo: '::before', min: 4.5 },
  'the command plate text': { selector: '.code.command .line', min: 4.5 },
  'the command plate prompt': { selector: '.code.command .line', textPseudo: '::before', min: 3 },
  'every code block header label and Copy on the frame': { selector: '.code-head :is(b, .lang, .copy)', min: 4.5 },
  'every code block Copy at rest, in muted text': { selector: '.code .copy:not(.is-hover, [data-copied])', min: 4.5 },
  'every source line, line number, and syntax colour on its panel': { selector: '.code :is(.line, .ln, .k, .s, .n, .c)', min: 4.5 },
  'every focused field edge, on its fill and on the surface around it': { selector: ':is(.input, .select, .textarea, .search).is-focus', edge: true, min: 3 },
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
  '--radius-control': ['.btn:not(.rail-summary, .menu-glyph)', '.quiet-action:not(.projects > summary)', '.segmented', '.segmented button', '.segmented button::before'],
  '--radius-pill': ['.switch-track', '.toggle-track', '.switch-track::after', '.toggle-track::after', '.progress', '.score .pips i', '.badge', '.navlist a[aria-current="location"]::before'],
  '--radius-inline': ['.check input:not([type="radio"])', '.tab', '.navlist a:not(.projects .navlist a)', '.group-toggle', '.crumbs a', '.site-name', '.key', '.rows [role="option"]'],
  // One-line controls that are not actions take the field corner: the select, the project-menu trigger,
  // the labelled contents trigger at rest and pressed, its no-JavaScript summary, and the skip link.
  '--radius-field': ['.input', '.select', '.textarea', '.search', '.toggle', '.pager a', '.projects > summary', '.menu-glyph', '.rail-summary', '.skip'],
  '--radius-panel': ['.picker', '.radio-card', '.alert', '.surface', '.card', '.figure-plate', '.dialog', '.code:not(.example > .code)', '.example', '.capture', '.projects .navlist'],
}
// Rows that sit --space-1 inside a panel are concentric with it, as is a code block's source panel.
const concentricRows = ['.select option', '.picker li', '.projects .navlist a', '.code:not(.example > .code) > pre']
const shapeProblems = (page: Page) => page.evaluate(({ roles, concentric }) => {
  const corners = (style: CSSStyleDeclaration) => [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].join(' ')
  const probe = document.body.appendChild(document.createElement('i'))
  probe.style.borderRadius = 'calc(var(--radius-panel) - var(--space-1))'
  const expected = [
    ...Object.entries(roles).flatMap(([token, list]) => list.map((selector) => [selector, getComputedStyle(document.documentElement).getPropertyValue(token).trim()])),
    ...concentric.map((selector) => [selector, getComputedStyle(probe).borderTopLeftRadius]),
  ].map(([selector, value]) => ({ base: selector.replace(/::[\w-]+$/, ''), pseudo: selector.match(/::[\w-]+$/)?.[0] ?? null, selector, value }))
  probe.remove()
  const problems = new Set<string>()
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
}, { roles: shapeRoles, concentric: concentricRows })

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
    const table = [...(await docText(page, 'DESIGN.md')).matchAll(/^\s*\| [^|]+ \| (Pill|\d+px) \| `(--radius-[\w-]+)` \|/gm)].map(([, shape, token]) => [token, shape])
    expect(table.map(([token]) => token).sort()).toEqual(Object.keys(shapeRoles).sort())
    await page.goto(url)
    const values = await page.evaluate((tokens) => tokens.map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim()), table.map(([token]) => token))
    expect(values).toEqual(table.map(([, shape]) => (shape === 'Pill' ? '999px' : shape)))
  })


  test('the shape check catches a role override, a corner longhand, and a radius with no role', async ({ page }) => {
    await page.goto(url)
    await page.addStyleTag({ content: '.tab{border-radius:var(--radius-field)} .key { border-top-left-radius: var(--radius-pill) } .purpose { border-radius: var(--radius-control) }' })
    const problems = await shapeProblems(page)
    expect(problems).toContain('.tab: 10px 10px 10px 10px, not 6px')
    expect(problems).toContain('.key: 999px 6px 6px 6px, not 6px')
    expect(problems).toContain('p.purpose: 999px 999px 999px 999px, with no role')
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
  })
}

// The code block is a frame that holds the header, with the source in a panel --space-1 inside it on the
// other sides. A live example's source is flush with its frame and is left out.
test('the code block source is a 12px panel 4px inside a 16px frame', async ({ page }) => {
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
  // Specimens with and without a header, on the source well and on the command plate.
  expect(blocks.filter(({ head }) => head).length).toBeGreaterThanOrEqual(2)
  expect(blocks.filter(({ head }) => !head).length).toBeGreaterThanOrEqual(3)
  // Under a header the panel meets the header; without one it sits 4px below the frame's edge.
  for (const block of blocks) expect(block).toEqual({ head: block.head, frame: '16px', panel: '12px', top: block.head ? 0 : 4, left: 4, bottom: 4, right: 4 })
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

test.describe('quiet action fill', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('a hovering pointer adds a 6% fill, and a press 12%', async ({ page }) => {
    await page.goto(url)
    const copy = page.locator('#code-block .code-head .copy')
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
    const copy = page.locator('#code-block .code-head .copy')
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
    const copy = page.locator('#code-block .code-head .copy')
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
    const copy = page.locator('#code-block .code-head .copy')
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
for (const [file, selector] of [['components.html', '#code-block .code-head .copy'], ['reference.html', '#detail .copy']]) {
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
