import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// The Claude and Codex plugin manifests and marketplaces. Both hosts cache an installed plugin by its
// version, so each release stamps its version here and @semantic-release/git commits these files back.
export const PLUGIN_MANIFESTS = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.codex-plugin/plugin.json',
  '.agents/plugins/marketplace.json',
]

/** A semantic-release plugin: writes the release version into every plugin manifest. */
export const prepare = (_pluginConfig, { cwd, nextRelease, logger }) => {
  for (const file of PLUGIN_MANIFESTS) {
    const path = join(cwd, file)
    const manifest = JSON.parse(readFileSync(path, 'utf8'))
    writeFileSync(path, `${JSON.stringify({ ...manifest, version: nextRelease.version }, null, 2)}\n`)
    logger.log(`Stamped ${nextRelease.version} into ${file}`)
  }
}
