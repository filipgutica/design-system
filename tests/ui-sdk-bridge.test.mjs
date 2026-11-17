import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { declarations, read, ruleBody } from './css.mjs'

// language/ui-sdk.css sets ui-sdk's theme variables to design-system roles. ui-sdk is a beta, so
// a version bump can add, rename, or drop a theme variable; this reads the installed web.css.
const webCss = readFileSync(fileURLToPath(import.meta.resolve('@ui-sdk/core/web.css')), 'utf8')
const uiSdkTheme = [...ruleBody(webCss, ':where(:root, :host)').matchAll(/(--ui-[\w-]+)\s*:/g)].map(([, name]) => name)
const bridge = declarations(ruleBody(read('language/ui-sdk.css'), ':root'))
const tokens = declarations(ruleBody(read('language/tokens.css'), ':root'))

// The bridge leaves the icon masks at ui-sdk's defaults, as its header says.
const leftAtDefault = (name) => name.startsWith('--ui-icon-')

test('the bridge sets every ui-sdk theme variable but the icons, and nothing else', () => {
  assert.deepEqual(Object.keys(bridge).sort(), uiSdkTheme.filter((name) => !leftAtDefault(name)).sort())
})

test('every token the bridge reads exists in tokens.css', () => {
  const targets = Object.values(bridge).flatMap((value) => [...value.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name))
  assert.ok(targets.length > 0)
  for (const name of targets) assert.ok(name in tokens, `${name} is not a tokens.css token`)
})
