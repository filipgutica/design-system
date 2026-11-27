import { expect, test, type Page } from '@playwright/test'

// An app loads only the package's stylesheets, not the catalogue's inline rules: the layer order, then tokens.css,
// ui-sdk.css, feedback.css, and conversation.css, as devchat does. The alert's icon and the resolution note's check
// must still draw as 16px and 14px line icons, and take the system text colour in forced colors.
const root = new URL('../../', import.meta.url)
const origin = 'http://design-system.test/'
const page = `<!doctype html><html lang="en"><head>
  <style>@layer ui-sdk, base, components;</style>
  <link rel="stylesheet" href="language/tokens.css">
  <link rel="stylesheet" href="language/ui-sdk.css">
  <link rel="stylesheet" href="language/feedback.css">
  <link rel="stylesheet" href="language/conversation.css">
  </head><body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="i-alert" viewBox="0 0 16 16"><path d="M8 2.5 14 13H2z"/><path d="M8 6.5v3M8 11.2v.1"/></symbol>
    <symbol id="i-check" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M5.8 8.2l1.5 1.5 2.9-3"/></symbol>
  </svg>
  <div class="alert warning" role="status"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg><p>Not resolved: the board refused the change.</p></div>
  <ol class="stream"><li class="msg"><span class="avatar" aria-hidden="true">F</span><div><div class="msg-head"><span class="author">Filip</span><span class="tag resolved"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Resolved the thread</span><time>Today 10:02</time></div></div></li></ol>
  </body></html>`

const open = async (target: Page) => {
  await target.route(`${origin}**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1)
    if (path === 'page.html') return route.fulfill({ contentType: 'text/html', body: page })
    return route.fulfill({ path: new URL(path, root).pathname })
  })
  await target.goto(`${origin}page.html`)
}

const icons = (target: Page) => target.evaluate(() => Object.fromEntries(
  [['alert', '.alert .icon'], ['check', '.tag.resolved .icon']].map(([name, selector]) => {
    const icon = document.querySelector(selector)!
    const style = getComputedStyle(icon)
    const { width, height } = icon.getBoundingClientRect()
    return [name, { width, height, stroke: style.stroke, fill: style.fill, strokeWidth: style.strokeWidth, color: style.color }]
  }),
))

test('with only the package stylesheets, the alert icon and the resolution check draw as line icons', async ({ page: target }) => {
  await open(target)
  const { alert, check } = await icons(target)
  expect(alert).toMatchObject({ width: 16, height: 16, fill: 'none', strokeWidth: '1.5px' })
  expect(check).toMatchObject({ width: 14, height: 14, fill: 'none', strokeWidth: '1.5px' })
  // The stroke is the icon's own colour, the tone.
  expect(alert.stroke).toBe(alert.color)
  expect(check.stroke).toBe(check.color)
})

test('with only the package stylesheets, both icons take the system text colour in forced colors', async ({ browser }) => {
  const context = await browser.newContext({ forcedColors: 'active' })
  const target = await context.newPage()
  await open(target)
  const { alert, check } = await icons(target)
  const text = await target.evaluate(() => getComputedStyle(document.querySelector('.author')!).color)
  expect(alert.color).toBe(text)
  expect(check.color).toBe(text)
  expect(check.stroke).toBe(text)
  await context.close()
})
