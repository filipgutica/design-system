import { expect, type Page, test } from '@playwright/test'

// ui-sdk.css redraws the catalogue's components on ui-sdk's parts, so each ui-sdk part must compute
// the same styles as its components.html specimen, state by state, in light and dark.
const catalogue = new URL('../../language/components.html', import.meta.url).href

const box = ['background-color', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'box-shadow', 'height', 'opacity']
const text = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-decoration-line']
const control = [...box, ...text, 'min-height', 'padding-left', 'padding-top']
const ring = ['outline-style', 'outline-width', 'outline-offset', 'outline-color', 'border-top-color', 'box-shadow']

const notVariant = ':not(.secondary, .ghost, .danger, .text, [data-size])'
const restButton = `${notVariant}:not(.is-hover, .is-focus, .is-active, [disabled])`

type Pair = { name: string; specimen: string; part: string; props: string[]; state?: 'hover' | 'focus' | 'press' | 'check' }
const pairs: Pair[] = [
  { name: 'primary button', specimen: `#button .btn${restButton}`, part: 'primary', props: control },
  { name: 'primary button on hover', specimen: `#button .btn.is-hover${notVariant}`, part: 'primary', props: control, state: 'hover' },
  { name: 'primary button pressed', specimen: `#button .btn.is-active${notVariant}`, part: 'primary', props: [...control, 'transform'], state: 'press' },
  { name: 'primary button focused', specimen: `#button .btn.is-focus${notVariant}`, part: 'primary', props: ring, state: 'focus' },
  { name: 'disabled button', specimen: `#button .btn${notVariant}[disabled]:not([aria-busy])`, part: 'disabled', props: control },
  { name: 'secondary button', specimen: '#button .btn.secondary:not(.is-hover, .is-focus, .is-active, [disabled], [data-size])', part: 'secondary', props: control },
  { name: 'secondary button on hover', specimen: '#button .btn.secondary.is-hover', part: 'secondary', props: control, state: 'hover' },
  { name: 'ghost button', specimen: '#button .btn.ghost:not(.is-hover, .is-focus, .is-active, [disabled])', part: 'ghost', props: control },
  { name: 'danger button', specimen: '#button .btn.danger:not(.is-hover, .is-focus, .is-active, [disabled])', part: 'danger', props: control },
  { name: 'text button', specimen: '#button .btn.text:not(.is-hover, .is-focus, .is-active, [disabled])', part: 'text', props: control },
  { name: 'link styled as a button', specimen: '#button a.btn.secondary:not(.is-focus)', part: 'link-button', props: control },
  { name: 'field label', specimen: 'label[for="in-rest"]', part: 'field-label', props: text },
  { name: 'field error', specimen: '#text-input-and-textarea .field-error', part: 'field-error', props: text },
  { name: 'input', specimen: '#in-rest', part: 'input', props: control },
  { name: 'input focused', specimen: '#in-focus', part: 'input', props: ring, state: 'focus' },
  { name: 'invalid input', specimen: '#in-invalid', part: 'input-invalid', props: control },
  { name: 'invalid input focused', specimen: '#in-invalid-focus', part: 'input-invalid', props: ring, state: 'focus' },
  { name: 'disabled input', specimen: '#in-disabled', part: 'input-disabled', props: control },
  { name: 'textarea', specimen: '#ta-rest', part: 'textarea', props: [...box.filter((prop) => prop !== 'height'), ...text, 'min-height', 'padding-left', 'padding-top'] },
  { name: 'checkbox', specimen: '#checkbox-and-radio .check input[type="checkbox"]:not(:checked, :disabled, .is-focus)', part: 'checkbox', props: box },
  { name: 'checked checkbox', specimen: '#checkbox-and-radio .check input[type="checkbox"]:checked:not(:disabled)', part: 'checkbox', props: box, state: 'check' },
  { name: 'disabled checkbox label', specimen: '#checkbox-and-radio .check:has(input[type="checkbox"]:disabled:not(:checked))', part: 'checkbox-disabled-label', props: ['opacity', 'min-height', 'gap'] },
  { name: 'radio', specimen: '#checkbox-and-radio .check input[type="radio"]:not(:checked, :disabled)', part: 'radio', props: box },
  { name: 'checked radio', specimen: '#checkbox-and-radio .check input[type="radio"]:checked:not(:disabled)', part: 'radio-checked', props: box },
]

const read = (page: Page, selector: string, props: string[]) =>
  page.locator(selector).first().evaluate((element, names) => {
    const style = getComputedStyle(element)
    // With no outline drawn, its width, offset, and colour do not show, and the base's :focus-visible
    // sets them on a really focused part but not on a specimen pinned with .is-focus.
    const hidden = style.outlineStyle === 'none' ? ['outline-width', 'outline-offset', 'outline-color'] : []
    return Object.fromEntries(names.filter((name) => !hidden.includes(name)).map((name) => [name, style.getPropertyValue(name)]))
  }, props)

const uiPart = (page: Page, part: string) =>
  part === 'checkbox-disabled-label' ? '[data-slot="label"]:has([data-testid="checkbox-disabled"])' : `[data-testid="${part}"]`

// Motion would leave a hover or press mid-transition, so both pages run with reduced motion.
test.use({ reducedMotion: 'reduce' })

for (const mode of ['light', 'dark'] as const) {
  test.describe(`ui-sdk parts match the catalogue in ${mode}`, () => {
    for (const { name, specimen, part, props, state } of pairs) {
      test(name, async ({ page, context }) => {
        const reference = await context.newPage()
        await reference.goto(catalogue)
        await reference.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
        const expected = await read(reference, specimen, props)

        await page.goto('/ui-sdk.html')
        await page.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
        const target = page.locator(uiPart(page, part))
        await expect(target).toBeVisible()
        if (state === 'hover') await target.hover()
        if (state === 'focus') await target.focus()
        if (state === 'check') await target.click()
        if (state === 'press') {
          await target.hover()
          await page.mouse.down()
        }
        expect(await read(page, uiPart(page, part), props)).toEqual(expected)
        if (state === 'press') await page.mouse.up()
      })
    }
  })
}

test('every part ui-sdk.css draws renders from the installed ui-sdk', async ({ page }) => {
  await page.goto('/ui-sdk.html')
  await page.getByTestId('checkbox').click()
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
