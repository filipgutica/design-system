import test from 'node:test'
import assert from 'node:assert/strict'
import { declarations, read, ruleBody } from './css.mjs'

// language/ui-sdk.css draws ui-sdk's headless parts with the design system's tokens. The browser
// tests in tests/react-smoke compare each part with its catalogue specimen; these check the file itself.
const css = read('language/ui-sdk.css')
const pkg = JSON.parse(read('package.json'))
const tokens = declarations(ruleBody(read('language/tokens.css'), ':root'))

test('the tested ui-sdk packages are pinned to the version ui-sdk.css names', () => {
  const [, version] = css.match(/checked against @ui-sdk\/\* (\S+)\./) ?? []
  assert.ok(version, 'ui-sdk.css names no checked version')
  for (const name of ['@ui-sdk/core', '@ui-sdk/react']) assert.equal(pkg.devDependencies[name], version, name)
})

test('ui-sdk.css uses no ui-sdk theme variable and loads no ui-sdk stylesheet', () => {
  assert.doesNotMatch(css, /var\(--ui-/)
  assert.doesNotMatch(css, /@import/)
})

test('every token ui-sdk.css reads exists in tokens.css', () => {
  // --depth is the file's own per-component variable, as in the components.html recipes.
  const own = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name))
  const names = [...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name))].filter((name) => !own.has(name))
  assert.ok(names.length > 10)
  for (const name of names) assert.ok(name in tokens, `${name} is not a tokens.css token`)
})
