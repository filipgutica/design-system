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
const thumb = ['background-color', 'box-shadow', 'border-top-left-radius']
// The live specimens sit outside the inert, pinned states.
const liveSegmented = '#segmented-control .segmented[data-live]:not([data-icon-only])'
const restTab = ':not([aria-selected="true"], .is-hover, .is-focus)'
const liveCards = '#radio-card-group .state:not([inert])'
const restToggle = ':not(.is-hover, .is-focus, [aria-pressed="true"], [disabled], [data-size])'

// specimen: the components.html element; part: a data-testid on ui-sdk.html, or a selector there.
// target: the part a state acts on when it is not the part read; open: a trigger clicked first, for a popup;
// specimenPseudo: the specimen's pseudo-element when the ui-sdk part draws it as a real element.
type Pair = {
  name: string; specimen: string; part: string; props: string[]; state?: 'hover' | 'focus' | 'press' | 'click'
  pseudo?: '::before' | '::after'; specimenPseudo?: '::before' | '::after'; target?: string; open?: string
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
  { name: 'segmented control', specimen: `${liveSegmented}`, part: 'segmented', props: [...box.filter((prop) => prop !== 'height'), 'padding-left'] },
  { name: 'segmented option', specimen: `${liveSegmented} button[aria-pressed="false"]`, part: 'seg-grid', props: control },
  { name: 'segmented option on hover', specimen: '#segmented-control .segmented button.is-hover', part: 'seg-grid', props: ['color'], state: 'hover' },
  { name: 'segmented hover thumb', specimen: '#segmented-control .segmented button.is-hover', part: 'seg-grid', props: thumb, state: 'hover', pseudo: '::before' },
  { name: 'checked segmented option', specimen: `${liveSegmented} button[aria-pressed="true"]`, part: 'seg-list', props: control },
  { name: 'segmented thumb', specimen: `${liveSegmented} button[aria-pressed="true"]`, specimenPseudo: '::before', part: 'segmented-indicator', props: thumb },
  { name: 'segmented option focused', specimen: '#segmented-control .segmented button.is-focus', part: 'seg-list', props: ring, state: 'focus' },
  { name: 'disabled segmented option', specimen: '#segmented-control .segmented button[aria-pressed="false"]:disabled', part: 'seg-disabled', props: control },
  { name: 'disabled checked segmented option', specimen: '#segmented-control .segmented button[aria-pressed="true"]:disabled', part: 'seg-off-list', props: control },
  { name: 'disabled segmented thumb', specimen: '#segmented-control .segmented button[aria-pressed="true"]:disabled', part: 'segmented-off-indicator', props: ['opacity'] },
  { name: 'icon-only segmented option', specimen: '#segmented-control .segmented[data-icon-only] button[aria-pressed="false"]', part: 'seg-icon-grid', props: [...control, 'width'] },
  { name: 'small segmented option', specimen: '#segmented-control .segmented[data-size="sm"] button[aria-pressed="true"]', part: 'seg-sm-item', props: control },
  { name: 'large segmented option', specimen: '#segmented-control .segmented[data-size="lg"] button[aria-pressed="true"]', part: 'seg-lg-item', props: control },
  { name: 'tab list', specimen: '#tabs .tablist', part: 'tabs-list', props: ['display', 'padding-top', 'padding-left', 'overflow-x', 'isolation'] },
  { name: 'tab', specimen: `#tabs .tab${restTab}`, part: 'tab-history', props: [...control, 'border-top-left-radius'] },
  { name: 'tab on hover', specimen: '#tabs .tab.is-hover', part: 'tab-history', props: control, state: 'hover' },
  { name: 'selected tab', specimen: '#tabs .tab[aria-selected="true"]:not(.is-focus)', part: 'tab-overview', props: control },
  { name: 'selected tab fill', specimen: '#tabs .tab[aria-selected="true"]:not(.is-focus)', specimenPseudo: '::before', part: 'tabs-indicator', props: thumb },
  { name: 'tab focused', specimen: '#tabs .tab.is-focus', part: 'tab-overview', props: ring, state: 'focus' },
  { name: 'tab panel', specimen: '#tabs .tabpanel', part: 'tabs-panel', props: ['padding-top'] },
  { name: 'progress track', specimen: '#progress .progress[aria-valuenow="40"]', part: 'progress-track', props: [...box, 'overflow-x'] },
  { name: 'progress indicator', specimen: '#progress .progress[aria-valuenow="40"] > span', part: 'progress-indicator', props: ['background-color', 'border-top-left-radius', 'height'] },
  { name: 'drawer', specimen: '#live-drawer', part: 'drawer', props: [...box.filter((prop) => prop !== 'height'), 'color'], open: 'drawer-trigger' },
  { name: 'drawer header', specimen: '#live-drawer .drawer-head', part: 'drawer-header', props: section, open: 'drawer-trigger' },
  { name: 'drawer body', specimen: '#live-drawer .drawer-body', part: 'drawer-body', props: ['padding-top', 'padding-left', 'overflow-y', 'overscroll-behavior-y'], open: 'drawer-trigger' },
  { name: 'drawer title', specimen: '#live-drawer-title', part: 'drawer-title', props: text, open: 'drawer-trigger' },
  { name: 'drawer close button', specimen: '#live-drawer .close', part: 'drawer-close', props: ['width', 'min-height', 'color', 'background-color', 'border-top-left-radius', 'border-top-width'], open: 'drawer-trigger' },
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
    // ui-sdk fades a drawer in with the Web Animations API even under reduced motion.
    await settled(page)
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
  for (const name of ['primary button', 'input', 'checkbox row', 'switch row', 'toggle button', 'select', 'segmented option', 'icon-only segmented option', 'tab']) {
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
    { ...pairs.find(({ name }) => name === 'checked segmented option')!, props: ['color'] },
    { ...pairs.find(({ name }) => name === 'segmented thumb')!, props: ['background-color'] },
    { ...pairs.find(({ name }) => name === 'segmented option focused')!, props: outline },
    { ...pairs.find(({ name }) => name === 'selected tab')!, props: ['border-top-width', 'border-top-color', 'padding-left', 'padding-top'] },
    { ...pairs.find(({ name }) => name === 'progress indicator')!, props: ['background-color'] },
    // The catalogue's range draws its fill as a pseudo-element, so the slider's range compares with the progress mark.
    { ...pairs.find(({ name }) => name === 'progress indicator')!, name: 'slider range', part: 'slider-indicator', props: ['background-color'] },
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
  await page.keyboard.press('Escape')
  await page.getByTestId('drawer-trigger').click()
  const drawerOpen = await slotsIn()
  const rendered = new Set([...closed.rendered, ...selectOpen.rendered, ...dialogOpen.rendered, ...drawerOpen.rendered])
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

// Waits for time-based animations, such as ui-sdk's drawer fade, to finish. The tab list's edge fade runs on
// a scroll timeline, so it never finishes and is left out.
const settled = (page: Page) => page.waitForFunction(() =>
  document.getAnimations().every((animation) => animation.timeline !== document.timeline || animation.playState !== 'running'))

// Resolves design tokens on a probe element, so a test can compare a part with the values the spec names.
const tokens = (page: Page, css: string) => page.evaluate((text) => {
  const probe = document.createElement('div')
  probe.style.cssText = text
  document.body.append(probe)
  const style = getComputedStyle(probe)
  const values = { color: style.color, background: style.backgroundColor, width: style.width, height: style.height, border: style.borderTopColor }
  probe.remove()
  return values
}, css)

// The catalogue's slider is a native range whose thumb and track are pseudo-elements that computed styles do not
// expose, so the slider's parts are checked against the tokens components.md names.
test('the slider draws the spec track, range, thumb, and value', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  const style = (testId: string, props: string[]) => page.getByTestId(testId).evaluate((element, names) => {
    const computed = getComputedStyle(element)
    return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]))
  }, props)
  const muted = await tokens(page, 'background: var(--color-surface-muted)')
  const accent = await tokens(page, 'background: var(--color-accent); color: var(--color-accent)')
  const raised = await tokens(page, 'background: var(--color-surface-raised)')
  const control = await tokens(page, 'height: var(--control-md)')
  expect(await style('slider-track', ['height', 'background-color'])).toEqual({ height: '6px', 'background-color': muted.background })
  expect(await style('slider-indicator', ['background-color'])).toEqual({ 'background-color': accent.background })
  expect(await style('slider-thumb', ['width', 'height', 'border-top-width', 'border-top-color', 'background-color', 'border-top-left-radius'])).toEqual({
    width: '18px', height: '18px', 'border-top-width': '2px', 'border-top-color': accent.color, 'background-color': raised.background, 'border-top-left-radius': '50%',
  })
  expect(await style('slider-control', ['height'])).toEqual({ height: control.height })
  expect((await style('slider-value', ['font-variant-numeric']))['font-variant-numeric']).toBe('tabular-nums')
  expect((await style('slider-sm-thumb', ['width']))['width']).toBe('16px')
  expect((await style('slider-lg-thumb', ['width']))['width']).toBe('20px')
  expect((await style('slider-disabled', ['opacity']))['opacity']).toBe('0.58')

  // The thumb's hidden range input takes focus, and the ring goes on the thumb.
  await page.getByTestId('slider-thumb').locator('input').focus()
  const focus = await tokens(page, 'color: var(--color-focus)')
  expect(await style('slider-thumb', ['outline-style', 'outline-color'])).toEqual({ 'outline-style': 'solid', 'outline-color': focus.color })
})

const rect = (page: Page, testId: string, of: string) => page.getByTestId(testId).evaluate((element, selector) => {
  const box = (target: Element) => { const { left, top, width, height } = target.getBoundingClientRect(); return [left, top, width, height].map((value) => Math.round(value)) }
  return { indicator: box(element), target: box(element.parentElement!.querySelector(selector)!) }
}, of)

test('the segmented thumb sits 2px inside the checked option, with no glide on first render', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  // A control that starts on its second option is already in place, with no animation.
  const first = await rect(page, 'segmented-second-indicator', '[data-checked]')
  expect(await page.getByTestId('segmented-second-indicator').evaluate((element) => element.getAnimations().length)).toBe(0)
  const inset = ([left, top, width, height]: number[]) => [left + 2, top + 2, width - 4, height - 4]
  expect(first.indicator).toEqual(inset(first.target))

  await page.getByTestId('seg-grid').click()
  await settled(page)
  const after = await rect(page, 'segmented-indicator', '[data-checked]')
  expect(after.indicator).toEqual(inset(after.target))
})

test('the tab fill covers the selected tab, in a list that scrolls too', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  const fixed = await rect(page, 'tabs-indicator', '[data-selected]')
  expect(fixed.indicator).toEqual(fixed.target)

  // Selecting the last tab scrolls the list; the fill follows the tab.
  await page.getByTestId('tab-t6').click()
  await settled(page)
  const scrolled = await rect(page, 'tabs-scroll-indicator', '[data-selected]')
  expect(scrolled.indicator).toEqual(scrolled.target)
})

const fade = (page: Page) => page.getByTestId('tabs-scroll').evaluate((element) => {
  const style = getComputedStyle(element)
  return [style.getPropertyValue('--tab-fade-start').trim(), style.getPropertyValue('--tab-fade-end').trim(), style.maskImage === 'none' ? 'none' : 'mask']
})

test.describe('a scrolling tab list', () => {
  test.use({ reducedMotion: 'no-preference' })
  test('fades each clipped edge over 24px', async ({ page }) => {
    await page.goto('/ui-sdk.html')
    const list = page.getByTestId('tabs-scroll')
    // At the start only the end is clipped; in the middle both are; at the end only the start is.
    expect(await fade(page)).toEqual(['0px', '24px', 'mask'])
    await list.evaluate((element) => { element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2 })
    await expect.poll(() => fade(page)).toEqual(['24px', '24px', 'mask'])
    await list.evaluate((element) => { element.scrollLeft = element.scrollWidth })
    await expect.poll(() => fade(page)).toEqual(['24px', '0px', 'mask'])
  })
})

// The file runs under reduced motion; these run with motion allowed, where the glides apply.
test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' })

  // Lists the CSS transitions running on a part, as property and duration.
  const running = (page: Page, testId: string) => page.getByTestId(testId).evaluate((element) =>
    element.getAnimations().filter((animation) => animation instanceof CSSTransition)
      .map((animation) => `${(animation as CSSTransition).transitionProperty} ${animation.effect?.getTiming().duration}`).sort())

  test('the thumb and the tab fill do not glide on first render', async ({ page }) => {
    // Records every transition from the first frame, before ui-sdk measures the indicators.
    await page.addInitScript(() => {
      const started: string[] = []
      Object.assign(window, { started })
      document.addEventListener('transitionstart', (event) => started.push(`${(event.target as Element).getAttribute('data-slot')} ${event.propertyName}`))
    })
    await page.goto('/ui-sdk.html')
    await page.waitForTimeout(500)
    const started = await page.evaluate(() => (window as unknown as { started: string[] }).started)
    expect(started.filter((entry) => /indicator/.test(entry))).toEqual([])
  })

  test('a change of choice glides both edges over 260ms and cross-fades the labels', async ({ page }) => {
    await page.goto('/ui-sdk.html')
    await page.getByTestId('seg-grid').click()
    expect(await running(page, 'segmented-indicator')).toEqual(['left 260', 'width 260'])
    expect(await running(page, 'seg-grid')).toEqual(['color 260'])

    // The first tab change glides, and so does a change back the other way.
    await page.getByTestId('tab-history').click()
    expect(await running(page, 'tabs-indicator')).toEqual(['left 260', 'width 260'])
    expect(await running(page, 'tab-history')).toContain('color 260')
    await page.waitForTimeout(400)
    await page.getByTestId('tab-overview').click()
    expect(await running(page, 'tabs-indicator')).toEqual(['left 260', 'width 260'])
  })
})

test('a scrolling tab list does not fade under reduced motion, where the base stops animations', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  expect(await fade(page)).toEqual(['', '', 'none'])
})

test('the drawer is a full-height layer on the left edge', async ({ page }) => {
  // Below 320px the drawer is 48px narrower than the viewport.
  for (const width of [1280, 300]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto('/ui-sdk.html')
    await page.getByTestId('drawer-trigger').click()
    await expect(page.getByTestId('drawer')).toBeVisible()
    await settled(page)
    const box = await page.getByTestId('drawer').evaluate((element) => {
      const { left, top, width: drawn, height } = element.getBoundingClientRect()
      return { left: Math.round(left), top: Math.round(top), width: Math.round(drawn), height: Math.round(height), radius: getComputedStyle(element).borderTopRightRadius }
    })
    // min(--sidebar + 48px, 100vw - 48px), with --sidebar at 224px.
    expect(box).toEqual({ left: 0, top: 0, width: Math.min(224 + 48, width - 48), height: 700, radius: '0px' })
  }
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
