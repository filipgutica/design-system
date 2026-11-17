import { expect, type Page, test } from '@playwright/test'

// Resolves a design-system token to the computed form the browser reports for a property.
const tokenAs = (page: Page, property: string, token: string) =>
  page.evaluate(([prop, name]) => {
    const probe = document.createElement('div')
    probe.style.setProperty(prop, `var(--${name})`)
    document.body.append(probe)
    const value = getComputedStyle(probe).getPropertyValue(prop)
    probe.remove()
    return value
  }, [property, token])

const computed = (page: Page, testId: string, property: string) =>
  page.getByTestId(testId).evaluate((element, prop) => getComputedStyle(element).getPropertyValue(prop), property)

for (const mode of ['light', 'dark'] as const) {
  test.describe(`ui-sdk with the bridge in ${mode}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/ui-sdk.html')
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
      await expect(page.getByTestId('save')).toBeVisible()
    })

    test('controls take the design-system roles', async ({ page }) => {
      await page.getByTestId('checkbox').click()
      expect(await computed(page, 'checkbox', 'background-color')).toBe(await tokenAs(page, 'background-color', 'color-accent'))
      expect(await computed(page, 'save', 'background-color')).toBe(await tokenAs(page, 'background-color', 'color-accent'))
      expect(await computed(page, 'save', 'color')).toBe(await tokenAs(page, 'color', 'color-accent-text'))
      expect(await computed(page, 'input', 'background-color')).toBe(await tokenAs(page, 'background-color', 'color-surface-raised'))
      expect(await computed(page, 'input', 'border-radius')).toBe(await tokenAs(page, 'border-radius', 'radius-field'))
    })

    // With ui-sdk below base, the design system's link colour and focus ring win over ui-sdk's.
    test('links and focus follow the design system', async ({ page }) => {
      expect(await computed(page, 'link', 'color')).toBe(await tokenAs(page, 'color', 'color-link'))
      await page.getByTestId('save').focus()
      expect(await computed(page, 'save', 'outline-width')).toBe(await tokenAs(page, 'outline-width', 'focus-width'))
      expect(await computed(page, 'save', 'outline-offset')).toBe(await tokenAs(page, 'outline-offset', 'focus-offset'))
      expect(await computed(page, 'save', 'outline-color')).toBe(await tokenAs(page, 'outline-color', 'color-focus'))
    })
  })
}

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
