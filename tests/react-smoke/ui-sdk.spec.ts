import { type BrowserContext, expect, type Page, test } from '@playwright/test'

// ui-sdk.css redraws the catalogue's components on ui-sdk's parts, so each ui-sdk part must compute
// the same styles as its components.html specimen, state by state, in light and dark.
const catalogue = new URL('../../language/components.html', import.meta.url).href

const box = ['background-color', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'box-shadow', 'height', 'opacity']
const text = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-decoration-line']
const control = [...box, ...text, 'min-height', 'padding-left', 'padding-top']
const ring = ['outline-style', 'outline-width', 'outline-offset', 'outline-color', 'border-top-color', 'box-shadow']

const notVariant = ':not(.secondary, .ghost, .danger, .text, [data-size])'
const restButton = `${notVariant}:not(.is-hover, .is-focus, .is-active, [disabled])`
const restOf = (variant: string) => `#button .btn.${variant}:not(.is-hover, .is-focus, .is-active, [disabled], [data-size])`
const label = (testId: string) => `[data-slot="label"]:has([data-testid="${testId}"])`
const mark = ['width', 'height', 'margin-top', 'border-right-width', 'border-bottom-width', 'border-top-width', 'border-right-color', 'transform']

// specimen: the components.html element; part: a data-testid on ui-sdk.html, or a selector there.
type Pair = { name: string; specimen: string; part: string; props: string[]; state?: 'hover' | 'focus' | 'press' | 'click'; pseudo?: '::before'; menu?: boolean }
const menuTrigger = '#overflow-menu .overflow > .quiet-action'
const menuList = '#overflow-menu .menu-list.is-static'
const menuBox = [...control, 'width', 'gap', 'text-align', 'cursor']
const icon = ['width', 'height', 'flex-shrink', 'stroke', 'fill', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
const menuPairs: Pair[] = [
  { name: 'overflow trigger', specimen: `${menuTrigger}[aria-controls]`, part: 'menu-trigger', props: menuBox },
  { name: 'overflow trigger on hover', specimen: `${menuTrigger}.is-hover`, part: 'menu-trigger', props: menuBox, state: 'hover' },
  { name: 'overflow trigger focused', specimen: `${menuTrigger}.is-focus`, part: 'menu-trigger', props: ring, state: 'focus' },
  { name: 'overflow trigger pressed', specimen: `${menuTrigger}.is-active`, part: 'menu-trigger', props: menuBox, state: 'press' },
  { name: 'overflow trigger open', specimen: `${menuTrigger}[aria-expanded="true"]`, part: 'menu-trigger', props: menuBox, state: 'click' },
  { name: 'overflow trigger disabled', specimen: `${menuTrigger}[disabled]`, part: 'menu-trigger-disabled', props: menuBox },
  { name: 'overflow More icon', specimen: `${menuTrigger}[aria-controls] .icon`, part: '[data-testid="menu-trigger"] > svg', props: icon },
  { name: 'overflow layer', specimen: menuList, part: 'menu-content', props: [...box.filter((prop) => prop !== 'height'), ...text, 'min-width', 'padding-top', 'padding-right', 'display'], menu: true },
  { name: 'overflow item', specimen: `${menuList} [role="menuitem"]:nth-child(2)`, part: 'menu-duplicate', props: menuBox, menu: true },
  { name: 'overflow item highlighted', specimen: `${menuList} .is-highlight`, part: 'menu-rename', props: menuBox, state: 'hover', menu: true },
  { name: 'overflow item focused', specimen: `${menuList} .is-highlight`, part: 'menu-rename', props: [...menuBox, ...ring], state: 'focus', menu: true },
  { name: 'overflow item disabled', specimen: `${menuList} [disabled]`, part: 'menu-disabled', props: menuBox, menu: true },
  { name: 'overflow disabled item on hover', specimen: `${menuList} [disabled]`, part: 'menu-disabled', props: menuBox, state: 'hover', menu: true },
  { name: 'overflow danger item', specimen: `${menuList} .danger`, part: 'menu-danger', props: menuBox, menu: true },
  { name: 'overflow danger item highlighted', specimen: `${menuList} .danger`, part: 'menu-danger', props: [...menuBox, ...ring], state: 'focus', menu: true },
  { name: 'overflow separator', specimen: `${menuList} [role="separator"]`, part: 'menu-separator', props: [...box, 'margin-top', 'margin-bottom', 'margin-left', 'margin-right'], menu: true },
  // The menu recipe uses the shared 16px leading icon; its static specimen has text-only items.
  { name: 'overflow item icon', specimen: '#button .btn .icon', part: '[data-testid="menu-icon"] > svg', props: icon.filter((prop) => prop !== 'stroke'), menu: true },
  { name: 'overflow item icon colour', specimen: `${menuList} [role="menuitem"]:nth-child(2)`, part: '[data-testid="menu-icon"] > svg', props: ['color'], menu: true },
]
const pairs: Pair[] = [
  ...menuPairs,
  { name: 'primary button', specimen: `#button .btn${restButton}`, part: 'primary', props: control },
  { name: 'primary button on hover', specimen: `#button .btn.is-hover${notVariant}`, part: 'primary', props: control, state: 'hover' },
  { name: 'primary button pressed', specimen: `#button .btn.is-active${notVariant}`, part: 'primary', props: [...control, 'transform'], state: 'press' },
  { name: 'primary button focused', specimen: `#button .btn.is-focus${notVariant}`, part: 'primary', props: ring, state: 'focus' },
  { name: 'small button', specimen: '#button .btn[data-size="sm"]:not(.secondary)', part: 'primary-sm', props: control },
  { name: 'large button', specimen: '#button .btn[data-size="lg"]:not(.secondary)', part: 'primary-lg', props: control },
  { name: 'disabled button', specimen: `#button .btn${notVariant}[disabled]:not([aria-busy])`, part: 'disabled', props: control },
  { name: 'busy button', specimen: `#button .btn${notVariant}[aria-busy="true"]`, part: 'pending', props: [...control, 'cursor'], state: 'click' },
  { name: 'busy button spinner', specimen: `#button .btn${notVariant}[aria-busy="true"]`, part: 'pending', props: ['width', 'height', 'border-top-width', 'border-right-color', 'border-top-left-radius'], state: 'click', pseudo: '::before' },
  ...['secondary', 'ghost', 'danger', 'text'].map((variant): Pair => (
    { name: `${variant} button`, specimen: restOf(variant), part: variant, props: control })),
  ...['secondary', 'ghost', 'danger'].map((variant): Pair => (
    { name: `${variant} button on hover`, specimen: `#button .btn.${variant}.is-hover`, part: variant, props: control, state: 'hover' })),
  ...['secondary', 'ghost', 'danger'].map((variant): Pair => (
    { name: `${variant} button pressed`, specimen: `#button .btn.${variant}.is-active`, part: variant, props: [...control, 'transform'], state: 'press' })),
  { name: 'link styled as a button', specimen: '#button a.btn.secondary:not(.is-focus)', part: 'link-button', props: control },
  { name: 'field label', specimen: 'label[for="in-rest"]', part: 'field-label', props: text },
  { name: 'field description', specimen: '#fw-desc-text', part: 'field-description', props: text },
  { name: 'field error', specimen: '#text-input-and-textarea .field-error', part: 'field-error', props: text },
  { name: 'input', specimen: '#in-rest', part: 'input', props: control },
  { name: 'input focused', specimen: '#in-focus', part: 'input', props: ring, state: 'focus' },
  { name: 'small input', specimen: '.input[data-size="sm"]', part: 'input-sm', props: control },
  { name: 'large input', specimen: '.input[data-size="lg"]', part: 'input-lg', props: control },
  { name: 'invalid input', specimen: '#in-invalid', part: 'input-invalid', props: control },
  { name: 'invalid input focused', specimen: '#in-invalid-focus', part: 'input-invalid', props: ring, state: 'focus' },
  { name: 'disabled input', specimen: '#in-disabled', part: 'input-disabled', props: control },
  { name: 'textarea', specimen: '#ta-rest', part: 'textarea', props: [...box.filter((prop) => prop !== 'height'), ...text, 'min-height', 'padding-left', 'padding-top'] },
  { name: 'textarea focused', specimen: '#ta-focus', part: 'textarea', props: ring, state: 'focus' },
  { name: 'invalid textarea', specimen: '#ta-invalid', part: 'textarea-invalid', props: [...box.filter((prop) => prop !== 'height'), 'min-height'] },
  { name: 'disabled textarea', specimen: '#ta-disabled', part: 'textarea-disabled', props: [...box.filter((prop) => prop !== 'height'), 'min-height'] },
  { name: 'checkbox', specimen: '#checkbox-and-radio .check:not([data-size]) input[type="checkbox"]:not(:checked, :disabled, .is-focus)', part: 'checkbox', props: box },
  { name: 'checkbox focused', specimen: '#checkbox-and-radio .check input[type="checkbox"].is-focus', part: 'checkbox', props: ring, state: 'focus' },
  { name: 'checked checkbox', specimen: '#checkbox-and-radio .check:not([data-size]) input[type="checkbox"]:checked:not(:disabled)', part: 'checkbox', props: box, state: 'click' },
  { name: 'check mark', specimen: '#checkbox-and-radio .check:not([data-size]) input[type="checkbox"]:checked:not(:disabled)', part: '[data-testid="checkbox"] [data-slot="checkbox-indicator"]', props: mark, state: 'click', pseudo: '::before' },
  { name: 'checkbox row', specimen: '#checkbox-and-radio .check:not([data-size]):has(input[type="checkbox"]:not(:disabled))', part: label('checkbox'), props: ['min-height', 'gap', 'font-size', 'opacity'] },
  { name: 'disabled checkbox row', specimen: '#checkbox-and-radio .check:has(input[type="checkbox"]:disabled:not(:checked))', part: label('checkbox-disabled'), props: ['opacity', 'min-height', 'gap'] },
  { name: 'checked disabled checkbox', specimen: '#checkbox-and-radio .check input[type="checkbox"]:disabled:checked', part: 'checkbox-checked-disabled', props: box },
  { name: 'checked disabled check mark', specimen: '#checkbox-and-radio .check input[type="checkbox"]:disabled:checked', part: '[data-testid="checkbox-checked-disabled"] [data-slot="checkbox-indicator"]', props: mark, pseudo: '::before' },
  { name: 'checked disabled checkbox row', specimen: '#checkbox-and-radio .check:has(input[type="checkbox"]:disabled:checked)', part: label('checkbox-checked-disabled'), props: ['opacity', 'min-height', 'gap'] },
  { name: 'small checkbox', specimen: '.check[data-size="sm"] input', part: 'checkbox-sm', props: box },
  { name: 'small checkbox row', specimen: '.check[data-size="sm"]', part: 'checkbox-sm-label', props: ['min-height', 'font-size'] },
  { name: 'large checkbox', specimen: '.check[data-size="lg"] input', part: 'checkbox-lg', props: box },
  { name: 'large checkbox row', specimen: '.check[data-size="lg"]', part: 'checkbox-lg-label', props: ['min-height', 'font-size'] },
  // The catalogue sizes radios with the same .check[data-size] rule as checkboxes, so a checkbox is the specimen.
  { name: 'small radio', specimen: '.check[data-size="sm"] input', part: 'radio-sm', props: ['width', 'height'] },
  { name: 'large radio', specimen: '.check[data-size="lg"] input', part: 'radio-lg', props: ['width', 'height'] },
  { name: 'radio', specimen: '#checkbox-and-radio .check input[type="radio"]:not(:checked, :disabled)', part: 'radio', props: box },
  { name: 'checked radio', specimen: '#checkbox-and-radio .check input[type="radio"]:checked:not(:disabled)', part: 'radio-checked', props: box },
]

const read = (page: Page, selector: string, props: string[], pseudo?: string) =>
  page.locator(selector).first().evaluate((element, [names, pseudoElement]) => {
    const style = getComputedStyle(element, pseudoElement)
    // With no outline drawn, its width, offset, and colour do not show, and the base's :focus-visible
    // sets them on a really focused part but not on a specimen pinned with .is-focus.
    const hidden = style.outlineStyle === 'none' ? ['outline-width', 'outline-offset', 'outline-color'] : []
    return Object.fromEntries((names as string[]).filter((name) => !hidden.includes(name)).map((name) => [name, style.getPropertyValue(name)]))
  }, [props, pseudo] as const)

const uiPart = (part: string) => (/^[\[.#]/.test(part) ? part : `[data-testid="${part}"]`)

const compare = async ({ page, context, mode, pair }: { page: Page; context: BrowserContext; mode: string; pair: Pair }) => {
  const { specimen, part, props, state, pseudo } = pair
  const reference = await context.newPage()
  await reference.goto(catalogue)
  await reference.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
  // A real press also hovers, so the pressed specimen takes the pinned hover as well.
  if (state === 'press') await reference.locator(specimen).first().evaluate((element) => element.classList.add('is-hover'))
  if (pair.menu && state === 'focus') {
    await reference.locator(specimen).first().evaluate((element) => element.closest('[inert]')?.removeAttribute('inert'))
    await reference.locator(specimen).first().focus()
  }
  // Forced-colour UA styles distinguish a real hovered/focused button from an inert drawing.
  if (part === 'menu-trigger' && state) {
    const trigger = reference.locator(specimen).first()
    await trigger.evaluate((element) => element.closest('[inert]')?.removeAttribute('inert'))
    if (state === 'focus') await trigger.focus()
    else await trigger.hover()
  }
  const expected = await read(reference, specimen, props, pseudo)

  await page.goto('/ui-sdk.html')
  await page.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
  if (pair.menu) await page.getByTestId('menu-trigger').press('ArrowDown')
  // A checked part is clicked on its control, which is the part itself or the box it marks.
  const control = page.locator(uiPart(part.includes('checkbox-indicator') ? 'checkbox' : part)).first()
  await expect(control).toBeVisible()
  if (state === 'hover') await control.hover()
  if (state === 'focus') await control.focus()
  if (state === 'click') await control.click()
  if (state === 'press') {
    await control.hover()
    // ui-sdk opens on pointerdown and moves focus to the popup, ending the native :active
    // state. Holding Space keeps the trigger pressed until keyup, as the recipe draws it.
    if (part === 'menu-trigger') {
      await control.focus()
      await page.keyboard.down('Space')
    } else await page.mouse.down()
  }
  expect(await read(page, uiPart(part), props, pseudo)).toEqual(expected)
  if (part === 'menu-content') {
    const [trigger, content] = await Promise.all([page.getByTestId('menu-trigger').boundingBox(), control.boundingBox()])
    const gap = parseFloat((await read(reference, '#overflow-live', ['margin-top']))['margin-top'])
    expect(content!.x + content!.width).toBeCloseTo(trigger!.x + trigger!.width, 1)
    expect(content!.y - trigger!.y - trigger!.height).toBeCloseTo(gap, 1)
  }
  if (state === 'press') {
    if (part === 'menu-trigger') await page.keyboard.up('Space')
    else await page.mouse.up()
  }
}

// Motion would leave a hover or press mid-transition, so both pages run with reduced motion.
test.use({ reducedMotion: 'reduce' })

for (const mode of ['light', 'dark'] as const) {
  test.describe(`ui-sdk parts match the catalogue in ${mode}`, () => {
    for (const pair of pairs) test(pair.name, ({ page, context }) => compare({ page, context, mode, pair }))
  })
}

// At tablet width unsized controls grow to --control-lg for touch.
test.describe('ui-sdk parts match the catalogue at 375px', () => {
  test.use({ viewport: { width: 375, height: 800 } })
  for (const mode of ['light', 'dark']) {
    for (const pair of menuPairs) test(`${pair.name} in ${mode}`, ({ page, context }) => compare({ page, context, mode, pair }))
  }
  for (const name of ['primary button', 'input', 'checkbox row']) {
    const pair = pairs.find((candidate) => candidate.name === name)!
    test(name, ({ page, context }) => compare({ page, context, mode: 'light', pair }))
  }
})

// Forced colours replace author colours with system ones, so these compare what the rules set there.
test.describe('ui-sdk parts match the catalogue in forced colours', () => {
  test.use({ forcedColors: 'active' })
  const outline = ['outline-style', 'outline-width', 'outline-offset', 'outline-color']
  const forced: Pair[] = [
    ...menuPairs,
    { ...pairs.find(({ name }) => name === 'checked checkbox')!, props: ['background-color', 'border-top-color'] },
    { ...pairs.find(({ name }) => name === 'check mark')!, props: ['border-right-color'] },
    { ...pairs.find(({ name }) => name === 'checked radio')!, props: ['background-color', 'border-top-color'] },
    { ...pairs.find(({ name }) => name === 'input focused')!, props: outline },
    { ...pairs.find(({ name }) => name === 'checkbox focused')!, props: outline },
  ]
  for (const pair of forced) test(pair.name, ({ page, context }) => compare({ page, context, mode: 'light', pair }))
})

test('every part ui-sdk.css draws renders from the installed ui-sdk', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  await page.getByTestId('checkbox').click()
  await page.getByTestId('menu-trigger').click()
  // The slots come from the loaded stylesheet's own selectors, so a new rule is checked with no list to update.
  const { slots, missing } = await page.evaluate(() => {
    const rules = (list: CSSRuleList): string[] => [...list].flatMap((rule) =>
      rule instanceof CSSStyleRule ? [rule.selectorText] : 'cssRules' in rule ? rules((rule as CSSGroupingRule).cssRules) : [])
    const sheet = [...document.styleSheets].find((candidate) => [...candidate.cssRules].some((rule) => rule.cssText.includes('[data-slot="button"]')))
    const found = [...new Set(rules(sheet?.cssRules ?? ([] as unknown as CSSRuleList)).flatMap((selector) => [...selector.matchAll(/\[data-slot="([\w-]+)"\]/g)].map((match) => match[1])))]
    return { slots: found, missing: found.filter((slot) => !document.querySelector(`[data-slot="${slot}"]`)) }
  })
  expect(slots.length).toBeGreaterThan(10)
  expect(missing).toEqual([])
})

test('menu keyboard navigation opens, moves, and Escape restores the trigger', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  const trigger = page.getByTestId('menu-trigger')
  await trigger.focus()
  await trigger.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('menu-rename')).toBeFocused()
  await expect(page.getByTestId('menu-rename')).toHaveAttribute('data-highlighted', '')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('menu-duplicate')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByTestId('menu-rename')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('menu-content')).not.toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
})

test('prose links keep the link colour', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  const [link, token] = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--color-link)'
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return [getComputedStyle(document.querySelector('[data-testid="link"]')!).color, value]
  })
  expect(link).toBe(token)
})

test('an agent reads the form and checks the box through the agent bridge', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  await expect(page.getByTestId('state')).toHaveText('Deploy emails off')
  const result = await page.evaluate(async () => {
    type Agent = { snapshot: () => { component: string; label?: string }[]; act: (input: unknown) => Promise<{ ok: boolean }> }
    const { agent } = window as unknown as { agent: Agent }
    const labels = agent.snapshot().map(({ component, label }) => `${component}: ${label}`)
    const { ok } = await agent.act({ steps: [{ ref: 'Email me about deploys', action: 'setChecked', args: [true] }] })
    return { labels, ok }
  })

  expect(result.labels).toEqual(expect.arrayContaining(['input: Project name', 'checkbox: Email me about deploys', 'button: Save']))
  expect(result.ok).toBe(true)
  await expect(page.getByTestId('state')).toHaveText('Deploy emails on')
})
