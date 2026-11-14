import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mapVsCodeTheme, themeVariables } from '@filipgutica/design-system/theme-mapper'

// The mapper's promise to a caller: a theme with no problems renders the catalogue with no contrast failure.
// Each theme is set as an app sets it, its variables inline on the root with the mode forced, and axe's
// colour-contrast rule then reads the page. Any violation axe finds must be in the theme's problems.
const url = new URL('../../language/components.html', import.meta.url).href

const themes = {
  // Soft text that reads on the page but not on a secondary button or a status alert.
  'soft text': { type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#777777', 'button.background': '#a99ce2' } },
  // Muted text that reads on the page but not on the row hover fill.
  'muted on hover': { type: 'dark', colors: { 'editor.background': '#000000', 'editor.foreground': '#ffffff', descriptionForeground: '#777777', 'list.hoverBackground': '#444444' } },
  'Monokai-like': { type: 'dark', colors: {
    'editor.background': '#272822', 'editor.foreground': '#f8f8f2', 'list.inactiveSelectionBackground': '#414339',
    descriptionForeground: '#90908a', 'editorLineNumber.foreground': '#c2c2bf',
  } },
  'Dark Modern-like': { type: 'dark', colors: { 'editor.background': '#1f1f1f', 'editor.foreground': '#cccccc', 'editorWidget.background': '#202020' } },
  'Solarized-like': { type: 'light', colors: { 'editor.background': '#fdf6e3', 'editor.foreground': '#657b83', 'input.foreground': '#586e75' } },
}

for (const [name, theme] of Object.entries(themes)) {
  test(`axe finds a contrast failure only where the mapper reports a problem: ${name}`, async ({ browser }) => {
    const mapped = mapVsCodeTheme(theme)
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(url)
    await page.evaluate(({ appearance, variables }) => {
      const root = document.documentElement
      root.dataset.theme = appearance
      for (const [property, value] of Object.entries(variables)) root.style.setProperty(property, value)
    }, { appearance: mapped.appearance, variables: themeVariables(mapped) })
    // Two frames, so axe reads the theme's colours rather than a transition toward them.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
    const found = violations.flatMap(({ nodes }) => nodes.map((node) => `${node.target.join(' ')} ${node.any[0]?.data?.contrastRatio}:1`))
    expect(found.length === 0 || mapped.problems.length > 0, `axe found ${found.join(', ')}, but problems is empty`).toBe(true)
    await context.close()
  })
}
