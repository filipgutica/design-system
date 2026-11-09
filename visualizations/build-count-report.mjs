#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const fail = (message) => { throw new Error(message) }
const text = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty text`)
}
const instant = (value, name) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${name} must be an ISO UTC timestamp ending in Z`)
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z')
  if (new Date(value).toISOString() !== canonical) fail(`${name} must be a valid calendar timestamp`)
  return Date.parse(value)
}
const unique = (items, name) => {
  if (new Set(items).size !== items.length) fail(`${name} must be unique`)
}
const safeSum = (values) => {
  const sum = values.reduce((a, b) => a + b, 0)
  if (!Number.isSafeInteger(sum)) fail('Count total exceeds safe integer precision')
  return sum
}
const countKeys = (counts, keys, name) => {
  if (!counts || Object.keys(counts).sort().join('\0') !== keys.slice().sort().join('\0')) fail(`${name} must contain exactly the declared categories`)
  for (const key of keys) if (!Number.isSafeInteger(counts[key]) || counts[key] < 0) fail(`${name}.${key} must be a nonnegative safe integer; missing data is not zero`)
  safeSum(Object.values(counts))
}

export function validateSnapshot(snapshot) {
  if (snapshot?.schemaVersion !== 1) fail('schemaVersion must be 1')
  text(snapshot.title, 'title')
  for (const key of ['filterLabel', 'dimensionLabel']) if (snapshot[key] !== undefined) text(snapshot[key], key)
  const captured = instant(snapshot.capturedAt, 'capturedAt')
  for (const key of ['provider', 'dataset', 'basis', 'unit', 'sampling', 'scope', 'query']) text(snapshot.source?.[key], `source.${key}`)
  if (snapshot.source.url !== undefined) {
    let url
    try { url = new URL(snapshot.source.url) } catch { fail('source.url must be an HTTP(S) URL') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('source.url must be an HTTP(S) URL without credentials')
  }
  if (!Array.isArray(snapshot.categories) || !snapshot.categories.length) fail('categories must be a nonempty array')
  for (const category of snapshot.categories) {
    text(category.key, 'category.key'); text(category.label, 'category.label')
    if (!['success', 'warning', 'danger', 'neutral', 'info'].includes(category.tone)) fail('Unknown category tone')
  }
  const keys = snapshot.categories.map((c) => c.key)
  unique(keys, 'Category keys')
  if (!Array.isArray(snapshot.windows) || !snapshot.windows.length) fail('windows must be a nonempty array')
  unique(snapshot.windows.map((w) => w.key), 'Window keys')
  if (!snapshot.windows.some((w) => w.key === snapshot.defaultWindow)) fail('defaultWindow must identify a window')
  for (const window of snapshot.windows) {
    text(window.key, 'window.key'); text(window.label, 'window.label')
    const from = instant(window.from, 'window.from'), to = instant(window.to, 'window.to')
    if (from >= to || to > captured) fail('Window bounds must increase and end no later than capturedAt')
    if (window.complete !== true) fail(`${window.key}: incomplete captures cannot be presented as totals`)
    if (!Array.isArray(window.rows)) fail('window.rows must be an array')
    const cells = []
    for (const row of window.rows) {
      text(row.region, 'row.region'); text(row.endpoint, 'row.endpoint')
      cells.push(JSON.stringify([row.region, row.endpoint]))
      countKeys(row.counts, keys, 'row.counts')
    }
    unique(cells, `${window.key} group/item cells`)
    const totals = Object.fromEntries(keys.map((key) => [key, safeSum(window.rows.map((r) => r.counts[key]))]))
    safeSum(Object.values(totals))
    if (window.referenceCounts !== undefined) {
      countKeys(window.referenceCounts, keys, 'referenceCounts')
      for (const key of keys) if (totals[key] !== window.referenceCounts[key]) fail(`${window.key}: aggregate mismatch for ${key}`)
    }
  }
  return snapshot
}

export function formatPercent(count, total) {
  if (!total) return '—'
  if (!count) return '0%'
  if (count === total) return '100%'
  const p = 100 * count / total
  if (p.toFixed(2) === '100.00') return '>99.99%'
  if (p < .1) {
    const rounded = p.toPrecision(2)
    return `${Number(rounded) >= .1 ? '0.10' : rounded}%`
  }
  return `${p.toFixed(2)}%`
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// This same function builds the initial DOM and every picker state.
function buildView({ snapshot, windowKey, region, percent, escape }) {
  const window = snapshot.windows.find((w) => w.key === windowKey)
  const keys = snapshot.categories.map((c) => c.key), rows = new Map()
  for (const cell of window.rows.filter((r) => region === '' || r.region === region)) {
    if (!rows.has(cell.endpoint)) rows.set(cell.endpoint, { endpoint: cell.endpoint, counts: Object.fromEntries(keys.map((k) => [k, 0])) })
    for (const key of keys) rows.get(cell.endpoint).counts[key] += cell.counts[key]
  }
  const endpoints = [...rows.values()].map((r) => ({ ...r, total: Object.values(r.counts).reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total)
  const counts = Object.fromEntries(keys.map((k) => [k, endpoints.reduce((s, r) => s + r.counts[k], 0)]))
  const total = Object.values(counts).reduce((a, b) => a + b, 0), number = (n) => n.toLocaleString('en-US')
  const summary = [{ key: '', label: 'Total', tone: 'neutral' }, ...snapshot.categories].map((c) => {
    const n = c.key === '' ? total : counts[c.key]
    return `<div class="ov-metric"><span class="ov-muted"><span aria-hidden="true" class="ov-dot ${c.tone}">●</span> ${escape(c.label)}</span><strong data-summary="${escape(c.key)}" data-count="${n}">${number(n)}</strong><span class="ov-muted">${percent(n, total)}</span></div>`
  }).join('')
  const cell = (row, category) => {
    const n = row.counts[category.key], hot = ['warning', 'danger'].includes(category.tone) && n / row.total >= .01
    return `<span data-category="${escape(category.key)}" data-count="${n}" class="${n === 0 ? 'ov-zero' : hot ? 'ov-hot' : ''}">${number(n)} <span class="ov-percent">(${percent(n, row.total)})</span></span>`
  }
  const route = (row) => escape(row.endpoint).replaceAll('/', '/<wbr>').replaceAll('.', '.<wbr>')
  const empty = `No ${escape(snapshot.source.unit)} in this selection.`
  const table = endpoints.map((r) => `<tr><th scope="row"><code>${route(r)}</code></th><td data-total="${r.total}">${number(r.total)}</td>${snapshot.categories.map((c) => `<td>${cell(r, c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${keys.length + 2}">${empty}</td></tr>`
  const mobile = endpoints.map((r) => `<article class="ov-entry"><div class="ov-entry-heading"><code>${route(r)}</code><span class="ov-muted">Total ${number(r.total)}</span></div><dl>${snapshot.categories.map((c) => `<div><dt><span aria-hidden="true" class="ov-dot ${c.tone}">●</span> ${escape(c.label)}</dt><dd>${cell(r, c)}</dd></div>`).join('')}</dl></article>`).join('') || `<p>${empty}</p>`

  let x = 0
  const bars = snapshot.categories.map((c) => {
    const width = total ? 100 * counts[c.key] / total : 0
    const mark = `<rect x="${x}" y="0" width="${width}" height="6" class="${c.tone}"><title>${escape(c.label)}: ${number(counts[c.key])} (${percent(counts[c.key], total)})</title></rect>`
    x += width
    return mark
  }).join('')
  const date = (s) => new Date(s).toISOString().replace('T', ' ').replace('.000Z', 'Z')
  return { summary, table, mobile, bars, caption: `${date(window.from)} → ${date(window.to)} · snapshot`, announcement: `${snapshot.filterLabel || 'Group'}: ${region || 'All'}, ${window.label}: ${number(total)} ${snapshot.source.unit}`, reference: window.referenceCounts ? 'Independent aggregate cross-check matched.' : 'No independent aggregate supplied.' }
}

export async function renderReport(snapshot, { mode = 'inline', tokens = '' } = {}) {
  validateSnapshot(snapshot)
  if (!['inline', 'standalone'].includes(mode)) fail('mode must be inline or standalone')
  if (mode === 'standalone' && !tokens.trim()) fail('Standalone mode requires design-language CSS tokens')
  const css = await readFile(new URL('./report.css', import.meta.url), 'utf8')
  const regions = [...new Set(snapshot.windows.flatMap((w) => w.rows.map((r) => r.region)))].sort()
  const view = buildView({ snapshot, windowKey: snapshot.defaultWindow, region: '', percent: formatPercent, escape: escapeHtml })
  const options = (items) => items.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('')
  const headers = snapshot.categories.map((c) => `<th><span class="ov-dot ${c.tone}" aria-hidden="true">●</span> ${escapeHtml(c.label)}</th>`).join('')
  // JSON.parse keeps a category key such as __proto__ as data; an object literal would not.
  const data = JSON.stringify(JSON.stringify(snapshot)).replaceAll('<', '\\u003c')
  const script = `(()=>{const snapshot=JSON.parse(${data}),root=document.getElementById('ov-report'),region=root.querySelector('#ov-region'),windowPicker=root.querySelector('#ov-window');const percent=${formatPercent.toString()},escape=${escapeHtml.toString()},build=${buildView.toString()};windowPicker.value=snapshot.defaultWindow;function update(){const view=build({snapshot,windowKey:windowPicker.value,region:region.value,percent,escape});root.querySelector('#ov-summary').innerHTML=view.summary;root.querySelector('#ov-rows').innerHTML=view.table;root.querySelector('#ov-mobile').innerHTML=view.mobile;root.querySelector('#ov-bars').innerHTML=view.bars;root.querySelector('#ov-caption').textContent=view.caption;root.querySelector('#ov-announcement').textContent=view.announcement;root.querySelector('#ov-reference').textContent=view.reference;}region.addEventListener('change',update);windowPicker.addEventListener('change',update);update();})();`
  const standalone = mode === 'standalone' ? `${tokens}\n:root{--foreground:var(--text);--muted-foreground:var(--text-muted);--background:var(--bg);--card:var(--surface-raised);--destructive:var(--danger);--primary:var(--link);--ring:var(--focus);--radius:var(--radius-sm)}body{background:var(--bg);padding:1.5rem}.ov-report{max-width:1100px;margin-inline:auto}` : ''
  const link = snapshot.source.url ? `<a href="${escapeHtml(snapshot.source.url)}">Source</a> · ` : ''
  const other = snapshot.categories.some((c) => c.key === 'other') ? `<p class="ov-muted">Other = categories outside ${snapshot.categories.filter((c) => c.key !== 'other').map((c) => escapeHtml(c.label)).join(', ')}.</p>` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(snapshot.title)}</title><style>${standalone}\n${css}</style></head><body><main id="ov-report" class="ov-report">
<header><h1>${escapeHtml(snapshot.title)}</h1><div class="ov-controls"><label for="ov-region">${escapeHtml(snapshot.filterLabel || 'Group')}</label><select id="ov-region">${options([['', 'All'], ...regions.map((r) => [r, r])])}</select><label for="ov-window">Time</label><select id="ov-window">${snapshot.windows.map((w) => `<option value="${escapeHtml(w.key)}"${w.key === snapshot.defaultWindow ? ' selected' : ''}>${escapeHtml(w.label)}</option>`).join('')}</select></div></header>
<p id="ov-caption" class="ov-muted">${escapeHtml(view.caption)}</p><p class="ov-muted">${escapeHtml(snapshot.source.provider)} · ${escapeHtml(snapshot.source.basis)} · ${escapeHtml(snapshot.source.sampling)}</p>
<div id="ov-summary" class="ov-summary" role="group" aria-label="Overall counts and percentages">${view.summary}</div><svg id="ov-bars" viewBox="0 0 100 6" preserveAspectRatio="none" role="img" aria-label="Category shares; exact counts and percentages are listed above">${view.bars}</svg>
<div class="ov-table-heading"><h2>By ${escapeHtml((snapshot.dimensionLabel || 'Item').toLowerCase())}</h2><span class="ov-muted">Count (% of row total)</span></div><div class="ov-scroll"><table><thead><tr><th>${escapeHtml(snapshot.dimensionLabel || 'Item')}</th><th>Total</th>${headers}</tr></thead><tbody id="ov-rows">${view.table}</tbody></table></div><section id="ov-mobile" class="ov-mobile" aria-label="${escapeHtml(snapshot.dimensionLabel || 'Item')} breakdown">${view.mobile}</section>
${other}<p id="ov-announcement" class="ov-sr-only" aria-live="polite">${escapeHtml(view.announcement)}</p><footer class="ov-muted"><p>${link}All percentages use ${escapeHtml(snapshot.source.unit)} in the selected population. No auto-refresh.</p><p id="ov-reference">${view.reference}</p><details><summary>Measurement and scope</summary><p>${escapeHtml(snapshot.source.dataset)} · ${escapeHtml(snapshot.source.scope)}</p><pre>${escapeHtml(snapshot.source.query)}</pre><p>Captured ${escapeHtml(snapshot.capturedAt)}. Each item in this view is counted once. The category counts add up to Total.</p></details></footer>
</main><script>${script}</script></body></html>`
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { mode: { type: 'string', default: 'inline' }, tokens: { type: 'string' }, help: { type: 'boolean' } } })
  if (values.help) { console.log('build-count-report.mjs <snapshot.json> <output.html> [--mode inline|standalone] [--tokens tokens.css]'); return }
  if (positionals.length !== 2) fail('Expected snapshot.json and output.html; use --help')
  const [input, output] = positionals.map((p) => resolve(p))
  if (input === output || (values.tokens && resolve(values.tokens) === output)) fail('Output must not overwrite an input file')
  const snapshot = JSON.parse(await readFile(input, 'utf8'))
  const tokens = values.tokens ? await readFile(values.tokens, 'utf8') : ''
  const html = await renderReport(snapshot, { mode: values.mode, tokens })
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, html)
  console.log(output)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
