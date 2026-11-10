import test from 'node:test'
import assert from 'node:assert/strict'
import { docProblems } from '../scripts/build-tokens.mjs'
import { read } from './css.mjs'

// The Foundations page shows every token's role from tokens/graphite-indigo.json, and tokens:check
// refuses a token without one, so a new token cannot ship undocumented.
const source = () => JSON.parse(read('tokens/graphite-indigo.json'))

test('every token group has its reader-facing text, and every token a plain-text role', () => {
  assert.deepEqual(docProblems(source()), [])
})

test('the role check catches a missing role, a stray role, markup, and a group without a note', () => {
  const data = source()
  const [surfaces] = data.groups.filter(({ id }) => id === 'surfaces')
  delete surfaces.roles['color-bg']
  surfaces.roles['color-gone'] = 'A token that no longer exists'
  surfaces.roles['color-text'] = 'Body <b>text</b>'
  delete data.groups[0].note

  assert.deepEqual(docProblems(data), [
    'identity-inputs: no note',
    '--color-bg: no role',
    '--color-text: markup in its role',
    'surfaces: role for --color-gone, which the group does not have',
  ])
})

// reference.html#foundations describes most tokens too (some specimens carry no description). The
// token source owns each role, so a description there must say the same thing, with <code> for each
// backtick span.
const referenceRoles = (html) => new Map(html.split('data-token="--').slice(1).map((chunk) => {
  const item = chunk.slice(0, chunk.indexOf('</li>'))
  const use = /<span class="use">([\s\S]*?)<\/span>(?:<\/div>|$)/.exec(item)?.[1]
  return [item.slice(0, item.indexOf('"')), use?.replace(/<code>([^<]*)<\/code>/g, '`$1`')]
}))
const roleDrift = ({ data, html }) => {
  const roles = Object.fromEntries(data.groups.flatMap((group) => Object.entries(group.roles ?? {})))
  return [...referenceRoles(html)].filter(([name, use]) => use !== undefined && use !== roles[name]).map(([name]) => `--${name}`)
}

test('reference.html describes each token with its role from the token source', () => {
  const html = read('language/reference.html')
  assert.ok([...referenceRoles(html).values()].filter(Boolean).length > 80)
  assert.deepEqual(roleDrift({ data: source(), html }), [])
})

test('the role parity check names a token whose description drifts', () => {
  const html = read('language/reference.html').replace('<span class="use">Links</span>', '<span class="use">Text links</span>')
  assert.deepEqual(roleDrift({ data: source(), html }), ['--color-link'])
})
