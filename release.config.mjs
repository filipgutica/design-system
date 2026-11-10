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
        ],
      },
    ],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    '@semantic-release/npm',
    '@semantic-release/github',
  ],
}
