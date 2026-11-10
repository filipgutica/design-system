import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../release.config.mjs'
import { analyzeCommits } from '../scripts/analyze-commits.mjs'
import { releaseVersion } from '../scripts/build-site.mjs'

// Releases stay 1.0.x (decisions.md, Versioning): the analyzer caps every release at a patch, with the
// release rules and options from release.config.mjs.
const [, analyzerConfig] = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === './scripts/analyze-commits.mjs')
const cwd = fileURLToPath(new URL('..', import.meta.url))

// Runs the analyzer on commit messages. With prBodies, it has GitHub credentials and a fake API that
// returns those bodies for every commit; without, it skips PR body analysis.
const analyze = async (messages, prBodies) => {
  const logs = []
  const release = await analyzeCommits(analyzerConfig, {
    cwd,
    commits: messages.map((message, index) => ({ message, hash: `sha${index}` })),
    logger: { log: (line) => logs.push(line) },
    env: prBodies ? { GITHUB_REPOSITORY: 'owner/repo', GH_TOKEN: 'test' } : {},
    fetch: async () => ({ ok: true, json: async () => prBodies.map((body) => ({ body })) }),
  })
  return { release, logs }
}

test('the release analyzer caps feat, fix, and breaking changes, from a commit or a PR body, at a patch', async () => {
  const cases = [
    { name: 'fix', messages: ['fix(language): a fix'] },
    { name: 'feat', messages: ['feat(language): a feature'], capped: 'minor' },
    { name: 'breaking type', messages: ['feat(language)!: a breaking feature'], capped: 'major' },
    { name: 'commit marker', messages: ['fix(language): a fix\n\nBREAKING CHANGE: a token is renamed'], capped: 'major' },
    { name: 'PR body marker', messages: ['chore(deps): a bump'], prBodies: ['Notes\n\nBREAKING CHANGE: a token is renamed'], capped: 'major' },
  ]
  for (const { name, messages, prBodies, capped } of cases) {
    const { release, logs } = await analyze(messages, prBodies)
    assert.equal(release, 'patch', name)
    if (capped) assert.ok(logs.includes(`Capping the ${capped} release at patch: releases stay 1.0.x`), name)
  }
})

test('the release analyzer releases nothing for chore-only commits', async () => {
  assert.equal((await analyze(['chore(deps): a bump', 'build: a script'])).release, null)
  assert.equal((await analyze(['chore(deps): a bump'], ['No breaking change here.'])).release, null)
})

test('the site version comes from the latest ds-v tag and ignores the earlier v tags', () => {
  const repo = mkdtempSync(join(tmpdir(), 'ds-tags-'))
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], { cwd: repo, stdio: 'pipe' })
  try {
    git('init', '-q')
    git('commit', '-q', '--allow-empty', '-m', 'first')
    git('tag', '-a', 'v2.4.0', '-m', 'earlier series')
    assert.throws(() => releaseVersion(repo))
    git('tag', '-a', 'ds-v1.0.0', '-m', 'seed')
    git('commit', '-q', '--allow-empty', '-m', 'second')
    git('tag', '-a', 'ds-v1.0.1', '-m', 'release')
    git('commit', '-q', '--allow-empty', '-m', 'third')
    git('tag', '-a', 'v9.0.0', '-m', 'a stray earlier-series tag')
    assert.equal(releaseVersion(repo), '1.0.1')
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})
