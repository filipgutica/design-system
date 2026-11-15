import { PLUGIN_MANIFESTS } from './scripts/stamp-plugin-version.mjs'

export default {
  branches: ['main'],
  // ds-v, not v: the v1.0.0–v2.4.0 tags belong to the earlier version series, and semantic-release
  // takes the highest matching tag. A bare ${version} would still match them, because semver accepts a
  // leading v. ds-v1.0.0 seeds the 1.0.x series.
  tagFormat: 'ds-v${version}',
  plugins: [
    [
      './scripts/analyze-commits.mjs',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { breaking: true, release: 'major' },
          { type: 'fix', release: 'patch' },
          { type: 'feat', release: 'minor' },
          // language/ is what agents read through the plugin, so a docs change to it must ship.
          { type: 'docs', release: 'patch' },
        ],
      },
    ],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    '@semantic-release/npm',
    './scripts/stamp-plugin-version.mjs',
    // Commits the stamped plugin versions back to main, so plugin installs see each release.
    // package.json stays 0.0.0-development; npm takes the version from the release.
    ['@semantic-release/git', { assets: PLUGIN_MANIFESTS, message: 'chore(release): ${nextRelease.version} [skip ci]' }],
    '@semantic-release/github',
  ],
}
