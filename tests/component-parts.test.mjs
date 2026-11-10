import test from 'node:test'
import assert from 'node:assert/strict'
import { read } from './css.mjs'

// Every component section in components.md has the same parts, so a reader finds each answer in the
// same place. A part that does not apply says "None", then a colon and the reason. Do and Don't come
// right after States. The catalogue shows the same Do and Don't lines under each component's purpose.
const REQUIRED = ['Anatomy', 'States', 'Do', "Don't", 'Keyboard and screen reader', 'Motion', 'Forced colors']

const slug = (title) => title.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-')
// A section runs to the next level-2 or level-3 heading, so a subsection's parts do not count for it.
// Only a "- **Part.** text" bullet is a part; a word in prose is not.
const specSections = (md) => new Map(md.split(/^(?=#{2,3} )/m).filter((block) => block.startsWith('## '))
  .map((block) => [slug(block.match(/^## (.+)/)[1]), [...block.matchAll(/^- \*\*([^*]+?)\.\*\* (.*)$/gm)].map(([, name, text]) => ({ name, text }))]))

const catalogueIds = (html) => [...html.matchAll(/<section class="component" id="([\w-]+)"/g)].map(([, id]) => id)

// Lists each missing part, each "None" without a reason, and Do or Don't out of place, as "id: problem".
const partProblems = (md, ids) => {
  const sections = specSections(md)
  return ids.flatMap((id) => {
    const parts = sections.get(id)
    if (!parts) return [`${id}: no section`]
    const names = parts.map(({ name }) => name)
    const problems = REQUIRED.filter((part) => !names.includes(part)).map((part) => `${id}: no ${part}`)
    for (const { name, text } of parts) {
      if (REQUIRED.includes(name) && /^None\b/.test(text) && !/^None: \S/.test(text)) problems.push(`${id}: ${name} says None without a reason`)
    }
    const states = names.indexOf('States')
    if (states >= 0 && (names[states + 1] !== 'Do' || names[states + 2] !== "Don't")) problems.push(`${id}: Do and Don't do not follow States`)
    return problems
  })
}

const html = read('language/components.html')
const md = read('language/components.md')

test('every component section has every part, or says None with a reason', () => {
  assert.equal(catalogueIds(html).length, 32)
  assert.deepEqual(partProblems(md, catalogueIds(html)), [])
})

test('the parts check catches a missing part, a bare None, a part in prose only, and Do out of place', () => {
  const section = (body) => `## Widget\n\nLayer: Core.\n\n${body}\n`
  const full = ['Anatomy. A box.', 'States. Rest.', 'Do. Use it.', "Don't. Misuse it.", 'Keyboard and screen reader. A button.', 'Motion. None: it is static.', 'Forced colors. The edge draws.']
  const bullets = (lines) => lines.map((line) => line.replace(/^([^.]+)\./, '- **$1.**')).join('\n')
  assert.deepEqual(partProblems(section(bullets(full)), ['widget']), [])
  assert.deepEqual(partProblems(section(bullets(full.filter((line) => !line.startsWith('Motion')))), ['widget']), ['widget: no Motion'])
  assert.deepEqual(partProblems(section(bullets(full.map((line) => (line.startsWith('Motion') ? 'Motion. None.' : line)))), ['widget']), ['widget: Motion says None without a reason'])
  assert.deepEqual(partProblems(section(bullets(full.map((line) => (line.startsWith('Motion') ? 'Motion. None by default.' : line)))), ['widget']), ['widget: Motion says None without a reason'])
  assert.deepEqual(partProblems(section(`${bullets(full.filter((line) => !line.startsWith('Motion')))}\n\nMotion is none, because it is static.`), ['widget']), ['widget: no Motion'])
  assert.deepEqual(partProblems(section(bullets(full.filter((line) => !line.startsWith("Don't")))), ['widget']), ["widget: no Don't", "widget: Do and Don't do not follow States"])
  const [anatomy, states, ...rest] = full
  assert.deepEqual(partProblems(section(bullets([anatomy, ...rest, states])), ['widget']), ["widget: Do and Don't do not follow States"])
  // A subsection's parts do not fill the gaps of the section above it.
  const sub = `## Widget\n\nLayer: Core.\n\n${bullets(full.slice(0, 4))}\n\n### Variant\n\n${bullets(full.slice(4))}\n`
  assert.deepEqual(partProblems(sub, ['widget']), ['widget: no Keyboard and screen reader', 'widget: no Motion', 'widget: no Forced colors'])
  assert.deepEqual(partProblems(md, ['widget']), ['widget: no section'])
  // On the real spec, dropping one line is caught.
  const dropped = md.replace(/^- \*\*Forced colors\.\*\* Fills drop and the transparent border draws as the system edge, so each badge.*\n/m, '')
  assert.notEqual(dropped, md)
  assert.deepEqual(partProblems(dropped, catalogueIds(html)), ['badge: no Forced colors'])
})

// The catalogue writes each line as HTML: code spans become <code>, and outside code an apostrophe
// becomes ’ and a quoted phrase takes curly quotes.
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const asHtml = (line) => line.split(/(`[^`]+`)/).map((part) => (part.startsWith('`')
  ? `<code>${escape(part.slice(1, -1))}</code>`
  : escape(part).replace(/'/g, '’').replace(/"([^"]*)"/g, '“$1”'))).join('')
const catalogueGuidance = (page) => new Map([...page.matchAll(/<section class="component" id="([\w-]+)"[^>]*>\n {4}<header>.*\n {4}<p class="purpose">[^<]*<\/p>\n {4}<dl class="guidance"><dt>Do<\/dt><dd>(.*?)<\/dd><dt>Don’t<\/dt><dd>(.*?)<\/dd><\/dl>\n/g)]
  .map(([, id, doLine, dontLine]) => [id, { do: doLine, dont: dontLine }]))
const specGuidanceHtml = (spec) => new Map([...specSections(spec)].map(([id, parts]) => [id, {
  do: asHtml(parts.find(({ name }) => name === 'Do')?.text ?? ''),
  dont: asHtml(parts.find(({ name }) => name === "Don't")?.text ?? ''),
}]))

test('the catalogue shows each component’s Do and Don’t lines from components.md, under its purpose', () => {
  const shown = catalogueGuidance(html)
  const spec = specGuidanceHtml(md)
  assert.deepEqual([...shown.keys()], catalogueIds(html))
  for (const [id, lines] of shown) assert.deepEqual(lines, spec.get(id), id)
  // A spec edit that the catalogue does not follow is caught.
  const edited = specGuidanceHtml(md.replace('- **Do.** Use a select for one choice from more than five options', '- **Do.** Use a select for one choice from more than six options'))
  assert.notDeepEqual(shown.get('select'), edited.get('select'))
  assert.equal(asHtml("Links with `role=\"tab\"`, or a \"set\" that isn't"), 'Links with <code>role="tab"</code>, or a “set” that isn’t')
})
