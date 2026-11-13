import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Host config installs language/ verbatim at ~/design-system and renders each file as text,
// so every payload file must be UTF-8 text that names no machine's home directory.
const root = fileURLToPath(new URL('../language/', import.meta.url))
const payload = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))

const homePath = /\/Users\/|\/home\/[a-z]/

const isText = (bytes) => {
  if (bytes.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    // The decoder throws on invalid UTF-8, which is exactly what makes a file binary here.
    return false
  }
}

test('the home-path guard catches a macOS or Linux home directory', () => {
  assert.match('see /Users/filip/design-system', homePath)
  assert.match('see /home/filip/design-system', homePath)
  assert.doesNotMatch('see ~/design-system or {{HOME}}/design-system', homePath)
})

test('no payload file names a home directory', () => {
  for (const file of payload) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), homePath, relative(root, file))
  }
})

test('the text guard catches a NUL byte and invalid UTF-8', () => {
  assert.equal(isText(Buffer.from([0x50, 0x00, 0x4e])), false)
  assert.equal(isText(Buffer.from([0x89, 0x50, 0x4e, 0x47])), false)
  assert.equal(isText(Buffer.from('Graphite Indigo, ✓ é', 'utf8')), true)
})

test('every payload file is UTF-8 text', () => {
  for (const file of payload) {
    assert.ok(isText(readFileSync(file)), relative(root, file))
  }
})
