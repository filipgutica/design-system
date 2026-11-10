import test from 'node:test'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateSnapshot, formatPercent, renderReport } from '../language/visualizations/build-count-report.mjs'

const sample = () => ({
  schemaVersion: 1, title: 'Synthetic API responses', capturedAt: '2026-01-08T12:05:00Z',
  source: { provider: 'synthetic', dataset: 'example traces', basis: 'Spans -> Count', unit: 'retained spans', sampling: 'Synthetic fixture, no live data', scope: 'POST query endpoints', query: 'Example aggregate grouped by region, endpoint and status' },
  categories: [{ key: '200', label: '200', tone: 'success' }, { key: '408', label: '408', tone: 'warning' }, { key: '500', label: '500', tone: 'danger' }, { key: 'other', label: 'Other', tone: 'neutral' }],
  defaultWindow: 'hour', windows: [{ key: 'hour', label: 'Last hour', from: '2026-01-08T11:00:00Z', to: '2026-01-08T12:00:00Z', complete: true, referenceCounts: { '200': 90, '408': 7, '500': 1, other: 2 }, rows: [{ region: 'east', endpoint: 'POST /query', counts: { '200': 90, '408': 7, '500': 1, other: 2 } }] }],
})

test('validation rejects missing data, duplicate cells, incomplete captures and aggregate mismatches', () => {
  const cases = [
    [(s) => { s.windows[0].rows[0].counts['408'] = null }, /nonnegative/],
    [(s) => { delete s.windows[0].rows[0].counts['408'] }, /exactly/],
    [(s) => { s.windows[0].rows.push(structuredClone(s.windows[0].rows[0])) }, /unique/],
    [(s) => { s.windows[0].complete = false }, /incomplete/],
    [(s) => { s.windows[0].referenceCounts['408'] = 8 }, /aggregate mismatch/],
    [(s) => { s.source.basis = '' }, /source.basis/],
    [(s) => { s.windows[0].from = '2025-02-30T11:00:00Z' }, /calendar timestamp/],
    [(s) => { s.windows[0].to = '2026-01-08T13:00:00Z' }, /bounds/],
    [(s) => { s.windows[0].rows[0].counts['200'] = Number.MAX_SAFE_INTEGER }, /precision/],
  ]
  for (const [mutate, error] of cases) { const value = sample(); mutate(value); assert.throws(() => validateSnapshot(value), error) }
  assert.equal(validateSnapshot(sample()).schemaVersion, 1)
})

test('percentage formatting preserves zero, tiny failures and incomplete 100% shares', () => {
  assert.equal(formatPercent(0, 0), '—')
  assert.equal(formatPercent(0, 10), '0%')
  assert.equal(formatPercent(10, 10), '100%')
  assert.equal(formatPercent(19999, 20000), '>99.99%')
  assert.equal(formatPercent(199, 200000), '0.10%')
  assert.equal(formatPercent(1, 20000), '0.0050%')
  assert.equal(formatPercent(7, 100), '7.00%')
})

test('the generated initial state has reconciled counts, provenance and safe embedded content', async () => {
  const value = sample()
  value.title = 'Example </script><script>alert(1)</script>'
  value.source.query = '<private query>'
  const html = await renderReport(value)
  const initial = html.split('<script>')[0]
  assert.match(initial, /data-summary="" data-count="100"/)
  assert.match(initial, /7 <span class="ov-percent">\(7.00%\)<\/span>/)
  assert.match(initial, /Independent aggregate cross-check matched/)
  assert.match(initial, /<label for="ov-region">Group<\/label>/)
  assert.match(initial, /id="ov-mobile"/)
  assert.equal((initial.match(/data-category="408" data-count="7"/g) || []).length, 2)
  assert.match(initial, /&lt;private query&gt;/)
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
  assert.match(html, /Example \\u003c\/script>/)
  assert.doesNotMatch(html, /window\.openai|fetch\(/)
})

test('standalone mode requires tokens; missing aggregate evidence and empty results stay visible', async () => {
  await assert.rejects(renderReport(sample(), { mode: 'standalone' }), /tokens/)
  const html = await renderReport(sample(), { mode: 'standalone', tokens: ':root{--color-text:currentColor}' })
  assert.match(html, /--foreground:var\(--color-text\)/)
  const value = sample()
  delete value.windows[0].referenceCounts
  value.windows[0].rows = []
  const empty = await renderReport(value)
  assert.match(empty, /No retained spans in this selection/)
  assert.match(empty, /No independent aggregate supplied/)
  value.source.url = 'javascript:alert(1)'
  assert.throws(() => validateSnapshot(value), /HTTP\(S\)/)
})

test('the inline script keeps a __proto__ category as data', async () => {
  const value = JSON.parse(JSON.stringify(sample()).replaceAll('"other"', '"__proto__"'))
  const html = await renderReport(value)
  const expression = html.match(/const snapshot=(JSON\.parse\(".*?"\)),root=/)[1]
  const embedded = vm.runInNewContext(expression)
  assert.ok(Object.hasOwn(embedded.windows[0].rows[0].counts, '__proto__'))
  assert.equal(embedded.windows[0].rows[0].counts.__proto__, 2)
})

// On phones an item name sits in a flex heading; an unbroken segment must wrap there, not widen the page.
const wrapsItemNames = (css) => /\.ov-entry-heading code\{[^}]*overflow-wrap:anywhere/.test(css)

test('a long unbroken item name wraps in the phone layout', async () => {
  assert.equal(wrapsItemNames('.ov-entry-heading code{min-width:0;flex:1}'), false)
  assert.ok(wrapsItemNames(readFileSync(new URL('../language/visualizations/report.css', import.meta.url), 'utf8')))
  // The rule only helps if the phone layout puts the name in that element.
  const value = sample()
  const name = `POST /query/${'a'.repeat(80)}`
  value.windows[0].rows[0].endpoint = name
  const html = await renderReport(value)
  assert.match(html.match(/<section id="ov-mobile"[\s\S]*?<\/section>/)[0], /class="ov-entry-heading"><code>(?:(?!<\/code>)[\s\S])*a{80}/)
})

test('standalone pickers take the field recipe; inline pickers keep the host look', async () => {
  const field = /\.ov-controls select\{background:var\(--color-field-bg\);border-color:var\(--color-field-edge\);border-radius:var\(--radius-field\);box-shadow:var\(--shadow-field\)\}\.ov-controls select:focus-visible\{outline:none;border-color:var\(--color-accent\);box-shadow:var\(--shadow-field-focus\)\}@media \(forced-colors:active\)\{\.ov-controls select:focus-visible\{outline:var\(--focus-width\) solid Highlight;outline-offset:-1px\}\}/
  const standalone = await renderReport(sample(), { mode: 'standalone', tokens: ':root{--color-text:currentColor}' })
  assert.match(standalone, field)
  // Equal specificity, so the field recipe must come after report.css's own picker and focus rules to win.
  assert.ok(standalone.search(field) > standalone.indexOf('.ov-controls select{font:inherit'))
  assert.ok(standalone.search(field) > standalone.indexOf('.ov-controls select:focus-visible{outline:var(--focus-width,2px)'))
  assert.doesNotMatch(await renderReport(sample()), /--color-field|--shadow-field|--color-well|--shadow-sink/)
})
