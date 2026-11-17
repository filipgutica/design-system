import { expect, test, type Page } from '@playwright/test'

// Minimal by default (DESIGN.md) on the application example: the rules a page can be checked for.
// Counts of words, boxes, and controls are evidence for a change, not a test; these are the structural
// rules that hold on every state of the console.
const url = new URL('../../language/reference.html', import.meta.url).href
// The console: its toolbar and its content. The Foundations catalogue below it shows tokens, not an interface.
const consoleRoots = ['main > .toolbar', 'main > .content']

const minimalProblems = (page: Page) => page.evaluate((roots) => {
  const scopes = roots.map((selector) => document.querySelector(selector)).filter((node): node is Element => node !== null)
  const all = scopes.flatMap((scope) => [scope, ...scope.querySelectorAll('*')])
  const visible = (node: Element) => {
    const box = node.getBoundingClientRect()
    return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]')
  }
  const text = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()
  const name = (node: Element) => `${node.tagName.toLowerCase()}${[...node.classList].map((c) => `.${c}`).join('')}`
  const problems: string[] = []

  // Status in one sentence: one alert per view at most, and none that repeats a badge in view.
  const alerts = all.filter((node) => node.matches('.alert, [role="alert"]') && visible(node))
  if (alerts.length > 1) problems.push(`${alerts.length} alerts in view`)
  const badges = all.filter((node) => node.matches('.badge') && visible(node)).map(text).filter(Boolean)
  for (const alert of alerts) for (const badge of badges) if (text(alert).toLowerCase().includes(badge.toLowerCase())) problems.push(`an alert repeats the badge "${badge}"`)

  // One-line rows, --row tall, with one action in reach: two visible buttons at most (a primary and a menu trigger).
  const probe = document.body.appendChild(document.createElement('i'))
  probe.style.cssText = 'display: block; height: var(--row)'
  const rowHeight = probe.getBoundingClientRect().height
  probe.remove()
  for (const row of all.filter((node) => node.matches('[role="option"], [role="row"], tr') && visible(node))) {
    const height = row.getBoundingClientRect().height
    if (height > rowHeight + 0.5) problems.push(`${name(row)} "${text(row).slice(0, 24)}" is ${height}px tall, not one ${rowHeight}px line`)
    const actions = [...row.querySelectorAll('button, a[href], [role="button"]')].filter(visible).length
    if (actions > 2) problems.push(`${name(row)} "${text(row).slice(0, 24)}" shows ${actions} actions`)
  }

  // A sticky bar sits on the page without a shadow.
  for (const node of all) {
    const style = getComputedStyle(node)
    if (style.position === 'sticky' && node.getBoundingClientRect().width > innerWidth / 2 && style.boxShadow !== 'none') problems.push(`the sticky bar ${name(node)} has a shadow`)
  }

  // No box inside a box. A box is a container with three or more visible borders, or a shadow; controls are not containers.
  const control = 'button, a, input, select, textarea, summary, label, kbd, [role="option"], [role="button"], .segmented, .search, .badge'
  const isBox = (node: Element) => {
    if (node.closest(control)) return false
    const style = getComputedStyle(node)
    const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).filter((side) => parseFloat(style[`border${side}Width`]) > 0
      && style[`border${side}Style`] !== 'none' && !/^rgba\(.*, 0\)$|^transparent$/.test(style[`border${side}Color`])).length
    return sides >= 3 || style.boxShadow !== 'none'
  }
  const boxes = all.filter((node) => visible(node) && isBox(node))
  for (const box of boxes) if (boxes.some((outer) => outer !== box && outer.contains(box))) problems.push(`a box inside a box: ${name(box)}`)
  return problems
}, consoleRoots)

test.describe('minimal by default, on the application example', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  for (const filter of ['all', 'alerting', 'warning', 'nodata']) {
    test(`the console keeps the minimal rules with the ${filter} filter`, async ({ page }) => {
      await page.goto(url)
      await page.locator(`[data-filter="${filter}"]`).click()
      expect(await minimalProblems(page)).toEqual([])
    })
  }

  test('the No data monitor states its status in one sentence, with no badge or alert', async ({ page }) => {
    await page.goto(url)
    await page.locator('[data-filter="nodata"]').click()
    const detail = page.locator('#detail')
    await expect(detail.locator('.status-line')).toHaveText('No data for 42 minutes. Check ingestion before you trust this monitor.')
    await expect(detail.locator('.badge, .alert')).toHaveCount(0)
  })

  test('the guard catches a second alert, an alert that repeats a badge, a tall row, a row of actions, a sticky shadow, and a box in a box', async ({ page }) => {
    await page.goto(url)
    await page.evaluate(() => {
      const detail = document.getElementById('detail')!
      detail.insertAdjacentHTML('beforeend', '<div class="alert warning"><p>Alerting since 09:12.</p></div><div class="alert"><p>Second note.</p></div>')
      detail.insertAdjacentHTML('beforeend', '<div class="panel" style="padding: 8px">nested</div>')
      const row = document.querySelector('#list [role="option"]')!
      row.querySelector('.title')!.insertAdjacentHTML('beforeend', '<br>Second line')
      const actions = document.querySelectorAll('#list [role="option"]')[1]
      actions.insertAdjacentHTML('beforeend', '<span><a href="#a">A</a><a href="#b">B</a><a href="#c">C</a></span>')
      document.querySelector<HTMLElement>('main > .toolbar')!.style.boxShadow = 'var(--shadow-surface)'
    })
    const problems = await minimalProblems(page)
    expect(problems).toContain('2 alerts in view')
    expect(problems).toContain('an alert repeats the badge "Alerting"')
    expect(problems.some((line) => /is [\d.]+px tall, not one/.test(line))).toBe(true)
    expect(problems.some((line) => /shows 3 actions$/.test(line))).toBe(true)
    expect(problems).toContain('the sticky bar div.toolbar has a shadow')
    expect(problems).toContain('a box inside a box: div.panel')
  })
})
