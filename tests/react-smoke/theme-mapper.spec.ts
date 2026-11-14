import { expect, test } from '@playwright/test'
import { mapVsCodeTheme, themeVariables, type MappedTheme } from '@filipgutica/design-system/theme-mapper'
import dark from '../../language/editor-themes/graphite-indigo/themes/graphite-indigo-dark-color-theme.json' with { type: 'json' }
import light from '../../language/editor-themes/graphite-indigo/themes/graphite-indigo-light-color-theme.json' with { type: 'json' }
import { core } from '../../theme-mapper/core.js'
import { applyTheme, resolveData } from '../../theme-mapper/engine.js'
import { themeInputs } from '../../theme-mapper/vscode.js'

// An imported theme in the mode opposite to the reader's system: the inline variables and the forced
// data-theme must win over tokens.css's own blocks for that mode, so every token computes to the engine's value.
const cases = [
  { theme: dark, colorScheme: 'light' },
  { theme: light, colorScheme: 'dark' },
] as const

for (const { theme, colorScheme } of cases) {
  const mapped: MappedTheme = mapVsCodeTheme(theme)

  test.describe(`${mapped.name} under a ${colorScheme} system`, () => {
    test.use({ colorScheme })

    test('every token computes to the engine value for the theme\'s mode', async ({ page }) => {
      const expected = resolveData(applyTheme(core, themeInputs(mapped)))[mapped.appearance]
      await page.goto('/')
      await expect(page.getByTestId('heading')).toBeVisible()
      await page.evaluate(({ appearance, variables }) => {
        const root = document.documentElement
        root.dataset.theme = appearance
        for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)
      }, { appearance: mapped.appearance, variables: themeVariables(mapped) })

      const computed = await page.evaluate((names) => {
        const style = getComputedStyle(document.documentElement)
        return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]))
      }, Object.keys(expected))

      expect(computed).toEqual(expected)
    })
  })
}
