import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLUGIN_MANIFESTS, prepare } from '../scripts/stamp-plugin-version.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// The plugin root is the repository root, so the skill reads language/ in place. Plugin caches copy
// only the plugin root, so the path the skill names must stay inside it.
test('the design-system skill names a DESIGN.md that exists in the plugin', () => {
  const skillDir = join(root, readJson(join(root, '.claude-plugin/plugin.json')).skills, 'design-system')
  const skill = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
  const path = skill.match(/`(\.\.\/\.\.\/language\/DESIGN\.md)`/)?.[1]
  assert.ok(path, 'SKILL.md names ../../language/DESIGN.md')
  assert.ok(existsSync(join(skillDir, path)), path)
  assert.equal(readJson(join(root, '.codex-plugin/plugin.json')).skills, readJson(join(root, '.claude-plugin/plugin.json')).skills)
})

test('a release stamps its version into every plugin manifest and keeps the other fields', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'ds-plugin-'))
  try {
    for (const file of PLUGIN_MANIFESTS) {
      mkdirSync(join(cwd, dirname(file)), { recursive: true })
      cpSync(join(root, file), join(cwd, file))
    }
    prepare({}, { cwd, nextRelease: { version: '1.2.3' }, logger: { log: () => {} } })
    for (const file of PLUGIN_MANIFESTS) {
      assert.deepEqual(readJson(join(cwd, file)), { ...readJson(join(root, file)), version: '1.2.3' }, file)
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
