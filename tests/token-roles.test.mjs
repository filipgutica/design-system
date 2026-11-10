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
