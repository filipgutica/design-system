import { expect, test } from '@playwright/test'
import { tokens } from '@filipgutica/design-system'

const theme = tokens.themes['graphite-indigo']

for (const mode of ['light', 'dark'] as const) {
  test(`every token computes to its JSON value in ${mode}`, async ({ page }) => {
    await page.goto('/')
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, mode)
    await expect(page.getByTestId('heading')).toBeVisible()

    const computed = await page.evaluate((names) => {
      const style = getComputedStyle(document.documentElement)
      return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]))
    }, Object.keys(theme[mode]))

    expect(computed).toEqual(theme[mode])
  })
}

test('the Inter and JetBrains Mono faces load from fonts.css', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('heading')).toBeVisible()
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => `${face.family} ${face.weight}`)
  })

  expect(loaded).toEqual(expect.arrayContaining(['Inter 400', 'Inter 600', 'JetBrains Mono 400']))
})

// Latin-ext text, such as Polish or Czech names, keeps both faces: the page loads the latin-ext files for it.
test('latin-ext text loads the Inter and JetBrains Mono latin-ext faces', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('heading')).toBeVisible()
  const loaded = await page.evaluate(async () => {
    const sample = document.body.appendChild(document.createElement('p'))
    sample.innerHTML = 'Łódź <code>Dvořák</code>'
    await document.fonts.ready
    return [...document.fonts].filter((face) => face.status === 'loaded' && face.unicodeRange.startsWith('U+100-')).map((face) => `${face.family} ${face.weight}`)
  })

  expect(loaded).toEqual(expect.arrayContaining(['Inter 400', 'JetBrains Mono 400']))
})
