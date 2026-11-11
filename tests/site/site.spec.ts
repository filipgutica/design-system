import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

// The built site, served under /design-system/ as on GitHub Pages: each page's layout, accessibility,
// script, and links, the header and pager order, and Foundations' Find and Copy.
const PAGES = [
  { path: '', name: 'Overview', find: 'a section' },
  { path: 'foundations.html', name: 'Foundations', find: 'a token' },
  { path: 'components.html', name: 'Components', find: 'a component' },
  { path: 'themes.html', name: 'Themes', find: 'a theme' },
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

  test(`the breadcrumb's labels sit level with the header strip in ${colorScheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4, baseURL: test.info().project.use.baseURL })
    const page = await context.newPage()
    await page.goto('foundations.html')
    // The current crumb and the current strip row both read "Foundations", so their cap tops should match.
    const pill = await labelInk(page, '.page-head .strip a[aria-current="page"]')
    for (const selector of ['.crumbs [aria-current="page"]', '.crumbs a']) {
      const crumb = await labelInk(page, selector)
      expect(Math.abs(crumb.top - pill.top), `${selector}: ink starts at ${crumb.top}px, the strip's at ${pill.top}px`).toBeLessThanOrEqual(0.5)
    }
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

test('Themes: every contrast check passes, and the table needs no script', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL })
  const page = await context.newPage()
  await page.goto('themes.html')
  const results = page.locator('table.checks .result')
  expect(await results.count()).toBe(Object.keys(tokens.themes).length * 5 * 2)
  await expect(page.locator('table.checks .result.fail')).toHaveCount(0)
  await context.close()
})
