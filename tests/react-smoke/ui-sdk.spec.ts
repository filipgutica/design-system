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

const card = [...box.filter((prop) => prop !== 'height'), 'padding-top', 'padding-right', 'cursor']
const badgeMark = ['width', 'height', 'border-right-width', 'border-bottom-width', 'border-right-color', 'transform']
const track = ['background-color', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'box-shadow', 'width', 'height']
const knob = ['width', 'height', 'top', 'left', 'background-color', 'box-shadow', 'border-top-left-radius', 'transform']
const chevron = ['width', 'height', 'right', 'border-right-width', 'border-right-color', 'transform']
const popup = ['background-color', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'box-shadow', 'padding-top', 'color', 'font-size']
// A native select reports its own min-height, so the select compares its height instead.
const selectBox = [...control.filter((prop) => prop !== 'min-height'), 'padding-right']
const option = ['min-height', 'padding-left', 'padding-top', 'border-top-left-radius', 'background-color']
const section = ['padding-top', 'padding-left', 'gap', 'justify-content', 'background-color', 'border-top-width', 'border-top-color', 'border-bottom-width', 'border-bottom-color']
// The live specimens sit outside the inert, pinned states.
const liveCards = '#radio-card-group .state:not([inert])'
const restToggle = ':not(.is-hover, .is-focus, [aria-pressed="true"], [disabled], [data-size])'

// specimen: the components.html element; part: a data-testid on ui-sdk.html, or a selector there.
// target: the part a state acts on when it is not the part read; open: a trigger clicked first, for a popup;
// specimenPseudo: the specimen's pseudo-element when the ui-sdk part draws it as a real element.
type Pair = {
  name: string; specimen: string; part: string; props: string[]; state?: 'hover' | 'focus' | 'press' | 'click'
  pseudo?: '::before' | '::after'; specimenPseudo?: '::after'; target?: string; open?: string
}
const pairs: Pair[] = [
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
  { name: 'radio card', specimen: `${liveCards} .radio-card:has(input:not(:checked))`, part: 'card', props: card },
  { name: 'radio card on hover', specimen: '#radio-card-group .radio-card.is-hover', part: 'card', props: card, state: 'hover' },
  { name: 'selected radio card', specimen: `${liveCards} .radio-card:has(input:checked)`, part: 'card-checked', props: card },
  { name: 'selected radio card focused', specimen: '#radio-card-group .radio-card:has(input.is-focus:checked)', part: 'card-checked', target: 'card-radio-checked', props: ring, state: 'focus' },
  { name: 'disabled radio card', specimen: '#radio-card-group .radio-card:has(input:disabled)', part: 'card-disabled', props: card },
  { name: 'radio card description', specimen: `${liveCards} .radio-card .muted`, part: '[data-testid="card"] > span', props: text },
  { name: 'radio card badge', specimen: `${liveCards} .radio-card input:not(:checked)`, part: 'card-radio', props: [...box, 'width', 'top', 'right'] },
  { name: 'selected radio card badge', specimen: `${liveCards} .radio-card input:checked`, part: 'card-radio-checked', props: [...box, 'width', 'top', 'right'] },
  { name: 'selected radio card check', specimen: `${liveCards} .radio-card input:checked`, part: 'card-radio-checked', props: badgeMark, pseudo: '::after' },
  { name: 'switch', specimen: '#sw-rest .switch-track', part: 'switch', props: track },
  { name: 'switch on', specimen: '#sw-on .switch-track', part: 'switch-on', props: track },
  { name: 'switch knob', specimen: '#sw-rest .switch-track', specimenPseudo: '::after', part: 'switch-thumb', props: knob },
  { name: 'switch knob on', specimen: '#sw-on .switch-track', specimenPseudo: '::after', part: 'switch-on-thumb', props: knob },
  { name: 'switch focused', specimen: '#sw-focus .switch-track', part: 'switch', props: ring, state: 'focus' },
  { name: 'switch row', specimen: '#sw-rest', part: 'switch-label', props: ['min-height'] },
  { name: 'disabled switch', specimen: '#sw-off-dis', part: 'switch-disabled-label', props: ['opacity', 'cursor'] },
  { name: 'small switch', specimen: '#switch .switch[data-size="sm"] .switch-track', part: 'switch-sm', props: track },
  { name: 'large switch', specimen: '#switch .switch[data-size="lg"] .switch-track', part: 'switch-lg', props: track },
  { name: 'toggle button', specimen: `#toggle-button .toggle${restToggle}`, part: 'toggle', props: [...control, 'gap', 'padding-right'] },
  // The pinned hover specimen has no description, so it is shorter than the live one.
  { name: 'toggle button on hover', specimen: '#toggle-button .toggle.is-hover', part: 'toggle', props: control.filter((prop) => prop !== 'height'), state: 'hover' },
  { name: 'pressed toggle button', specimen: '#toggle-button .toggle[aria-pressed="true"]:not([data-size])', part: 'toggle-pressed', props: control },
  { name: 'toggle button focused', specimen: '#toggle-button .toggle.is-focus', part: 'toggle', props: ring, state: 'focus' },
  { name: 'disabled toggle button', specimen: '#toggle-button .toggle[disabled]', part: 'toggle-disabled', props: control },
  { name: 'toggle button track', specimen: `#toggle-button .toggle${restToggle} .toggle-track`, part: '[data-testid="toggle"] [data-slot="toggle-icon"]', props: track },
  { name: 'toggle button knob', specimen: `#toggle-button .toggle${restToggle} .toggle-track`, part: '[data-testid="toggle"] [data-slot="toggle-icon"]', props: knob, pseudo: '::after' },
  { name: 'pressed toggle button track', specimen: '#toggle-button .toggle[aria-pressed="true"]:not([data-size]) .toggle-track', part: '[data-testid="toggle-pressed"] [data-slot="toggle-icon"]', props: track },
  { name: 'pressed toggle button knob', specimen: '#toggle-button .toggle[aria-pressed="true"]:not([data-size]) .toggle-track', part: '[data-testid="toggle-pressed"] [data-slot="toggle-icon"]', props: knob, pseudo: '::after' },
  { name: 'toggle button description', specimen: '#toggle-button .toggle-text small', part: '[data-testid="toggle"] small', props: text },
  { name: 'small toggle button', specimen: '#toggle-button .toggle[data-size="sm"]', part: 'toggle-sm', props: control },
  { name: 'large toggle button', specimen: '#toggle-button .toggle[data-size="lg"]', part: 'toggle-lg', props: control },
  { name: 'select', specimen: '#se-rest', part: 'select', props: selectBox },
  { name: 'select chevron', specimen: '#se-rest', part: 'select', props: chevron, pseudo: '::after' },
  { name: 'select focused', specimen: '#se-focus', part: 'select', props: ring, state: 'focus' },
  { name: 'invalid select', specimen: '#se-invalid', part: 'select-invalid', props: selectBox },
  { name: 'disabled select', specimen: '#se-disabled', part: 'select-disabled', props: selectBox },
  { name: 'small select', specimen: '#select .select[data-size="sm"]', part: 'select-sm', props: selectBox },
  { name: 'large select', specimen: '#select .select[data-size="lg"]', part: 'select-lg', props: selectBox },
  { name: 'select list', specimen: '#select .picker', part: 'select-content', props: popup, open: 'select' },
  { name: 'select option', specimen: '#select .picker li:not(.is-hover, [aria-selected])', part: 'select-item', props: option, open: 'select' },
  { name: 'select option on hover', specimen: '#select .picker li.is-hover', part: 'select-item', props: option, state: 'hover', open: 'select' },
  // ui-sdk highlights the selected option on open, as a native select does, so the pointer moves to another first.
  { name: 'selected select option', specimen: '#select .picker li[aria-selected="true"]', part: 'select-item-selected', target: 'select-item', props: option, state: 'hover', open: 'select' },
  { name: 'selected select option check', specimen: '#select .picker li[aria-selected="true"]', part: 'select-item-selected', props: ['content', 'color'], pseudo: '::after', open: 'select' },
  { name: 'dialog', specimen: '#live-dialog', part: 'dialog', props: [...box.filter((prop) => prop !== 'height'), 'padding-top', 'color'], open: 'dialog-trigger' },
  { name: 'dialog header', specimen: '#live-dialog .dialog-head', part: '[data-testid="dialog"] > header', props: section, open: 'dialog-trigger' },
  { name: 'dialog body', specimen: '#live-dialog .dialog-body', part: 'dialog-body', props: ['padding-top', 'padding-left', 'overflow-y'], open: 'dialog-trigger' },
  { name: 'dialog footer', specimen: '#live-dialog .dialog-foot', part: 'dialog-footer', props: section, open: 'dialog-trigger' },
  // The static dialog takes the catalogue page's .row rules, such as .row h4, so the live dialog is the specimen.
  { name: 'dialog title', specimen: '#live-dialog-title', part: 'dialog-title', props: text, open: 'dialog-trigger' },
  { name: 'dialog description', specimen: '#live-dialog-desc', part: 'dialog-description', props: [...text, 'margin-top'], open: 'dialog-trigger' },
  { name: 'dialog close button', specimen: '#live-dialog .close', part: 'dialog-close', props: ['width', 'min-height', 'color', 'background-color', 'border-top-left-radius', 'border-top-width'], open: 'dialog-trigger' },
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
  const { specimen, part, props, state, pseudo, specimenPseudo, target, open } = pair
  const reference = await context.newPage()
  await reference.goto(catalogue)
  await reference.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
  // A real press also hovers, so the pressed specimen takes the pinned hover as well.
  if (state === 'press') await reference.locator(specimen).first().evaluate((element) => element.classList.add('is-hover'))
  const expected = await read(reference, specimen, props, specimenPseudo ?? pseudo)

  await page.goto('/ui-sdk.html')
  await page.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
  if (open) {
    await page.getByTestId(open).click()
    await expect(page.locator(uiPart(part)).first()).toBeVisible()
  }
  // A checked part is clicked on its control, which is the part itself or the box it marks.
  const control = page.locator(uiPart(target ?? (part.includes('checkbox-indicator') ? 'checkbox' : part))).first()
  await expect(control).toBeVisible()
  if (state === 'hover') await control.hover()
  if (state === 'focus') await control.focus()
  if (state === 'click') await control.click()
  if (state === 'press') {
    await control.hover()
    await page.mouse.down()
  }
  expect(await read(page, uiPart(part), props, pseudo)).toEqual(expected)
  if (state === 'press') await page.mouse.up()
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
  for (const name of ['primary button', 'input', 'checkbox row', 'switch row', 'toggle button', 'select']) {
    const pair = pairs.find((candidate) => candidate.name === name)!
    test(name, ({ page, context }) => compare({ page, context, mode: 'light', pair }))
  }
})

// Forced colours replace author colours with system ones, so these compare what the rules set there.
test.describe('ui-sdk parts match the catalogue in forced colours', () => {
  test.use({ forcedColors: 'active' })
  const outline = ['outline-style', 'outline-width', 'outline-offset', 'outline-color']
  const forced: Pair[] = [
    { ...pairs.find(({ name }) => name === 'checked checkbox')!, props: ['background-color', 'border-top-color'] },
    { ...pairs.find(({ name }) => name === 'check mark')!, props: ['border-right-color'] },
    { ...pairs.find(({ name }) => name === 'checked radio')!, props: ['background-color', 'border-top-color'] },
    { ...pairs.find(({ name }) => name === 'input focused')!, props: outline },
    { ...pairs.find(({ name }) => name === 'checkbox focused')!, props: outline },
    { ...pairs.find(({ name }) => name === 'select focused')!, props: outline },
    { ...pairs.find(({ name }) => name === 'selected radio card badge')!, props: ['background-color', 'border-top-color'] },
    { ...pairs.find(({ name }) => name === 'selected radio card check')!, props: ['border-right-color'] },
    ...['switch', 'switch on', 'switch knob', 'switch knob on', 'pressed toggle button track', 'pressed toggle button knob'].map((name): Pair => (
      { ...pairs.find((pair) => pair.name === name)!, props: ['background-color', 'border-top-color'] })),
    { ...pairs.find(({ name }) => name === 'switch focused')!, props: outline },
  ]
  for (const pair of forced) test(pair.name, ({ page, context }) => compare({ page, context, mode: 'light', pair }))
})

test('every part ui-sdk.css draws renders from the installed ui-sdk', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  await page.getByTestId('checkbox').click()
  // The slots come from the loaded stylesheet's own selectors, so a new rule is checked with no list to update.
  const slotsIn = () => page.evaluate(() => {
    const rules = (list: CSSRuleList): string[] => [...list].flatMap((rule) =>
      rule instanceof CSSStyleRule ? [rule.selectorText] : 'cssRules' in rule ? rules((rule as CSSGroupingRule).cssRules) : [])
    const sheet = [...document.styleSheets].find((candidate) => [...candidate.cssRules].some((rule) => rule.cssText.includes('[data-slot="button"]')))
    const found = [...new Set(rules(sheet?.cssRules ?? ([] as unknown as CSSRuleList)).flatMap((selector) => [...selector.matchAll(/\[data-slot="([\w-]+)"\]/g)].map((match) => match[1])))]
    return { slots: found, rendered: found.filter((slot) => document.querySelector(`[data-slot="${slot}"]`)) }
  })
  // A popup's parts render only while it is open, so the page is read closed, with the select open, and with the dialog open.
  const closed = await slotsIn()
  await page.getByTestId('select').click()
  const selectOpen = await slotsIn()
  await page.keyboard.press('Escape')
  await page.getByTestId('dialog-trigger').click()
  const dialogOpen = await slotsIn()
  const rendered = new Set([...closed.rendered, ...selectOpen.rendered, ...dialogOpen.rendered])
  expect(closed.slots.length).toBeGreaterThan(10)
  expect(closed.slots.filter((slot) => !rendered.has(slot))).toEqual([])
})

test('a keyboard-highlighted select option draws the inset focus ring', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  await page.getByTestId('select').click()
  await page.keyboard.press('ArrowDown')
  const option = page.locator('[data-slot="select-item"][data-highlighted]')
  await expect(option).toHaveCount(1)
  const { ring, expected } = await option.evaluate((element) => {
    const probe = document.createElement('span')
    probe.style.cssText = 'color: var(--color-focus); background: var(--color-row-hover); width: var(--focus-width)'
    document.body.append(probe)
    const token = getComputedStyle(probe)
    const expected = { outlineStyle: 'solid', outlineWidth: token.width, outlineOffset: `-${token.width}`, outlineColor: token.color, backgroundColor: token.backgroundColor }
    probe.remove()
    const style = getComputedStyle(element)
    return { ring: { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset, outlineColor: style.outlineColor, backgroundColor: style.backgroundColor }, expected }
  })
  expect(ring).toEqual(expected)
})

test('the dialog opens centred over the overlay, and as a bottom sheet on phones', async ({ page }) => {
  const open = async () => {
    await page.goto('/ui-sdk.html')
    await page.getByTestId('dialog-trigger').click()
    await expect(page.getByTestId('dialog')).toBeVisible()
    return page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--color-overlay)'
      document.body.append(probe)
      const overlay = getComputedStyle(probe).color
      probe.remove()
      const dialog = document.querySelector('[data-testid="dialog"]')!
      const rect = dialog.getBoundingClientRect()
      const style = getComputedStyle(dialog)
      return {
        backdrop: getComputedStyle(document.querySelector('[data-slot="dialog-backdrop"]')!).backgroundColor,
        overlay,
        centre: [Math.round(rect.left + rect.width / 2 - innerWidth / 2), Math.round(rect.top + rect.height / 2 - innerHeight / 2)],
        width: Math.round(rect.width),
        bottomGap: Math.round(innerHeight - rect.bottom),
        corners: [style.borderTopLeftRadius, style.borderBottomLeftRadius],
      }
    })
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  const desktop = await open()
  expect(desktop.backdrop).toBe(desktop.overlay)
  expect(desktop.width).toBe(512)
  expect(Math.abs(desktop.centre[0])).toBeLessThanOrEqual(1)
  expect(Math.abs(desktop.centre[1])).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 375, height: 700 })
  const phone = await open()
  expect(phone.width).toBe(375)
  expect(phone.bottomGap).toBe(0)
  expect(phone.corners[1]).toBe('0px')
  expect(phone.corners[0]).not.toBe('0px')
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
