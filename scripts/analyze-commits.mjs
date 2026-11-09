import { analyzeCommits as analyzeConventionalCommits } from '@semantic-release/commit-analyzer'

const BREAKING_CHANGE_PATTERN = /(?:BREAKING CHANGE:|\[BREAKING CHANGE\])/

export const hasBreakingChangeMarker = (text) =>
  BREAKING_CHANGE_PATTERN.test(text ?? '')

const pullRequestsForCommit = async ({ apiUrl, fetch, owner, repo, sha, token }) => {
  const response = await fetch(
    `${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}/pulls?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while checking PRs for commit ${sha}`)
  }

  return response.json()
}

export const analyzeCommits = async (pluginConfig, context) => {
  const { commits, logger } = context

  if (commits.some(({ message }) => hasBreakingChangeMarker(message))) {
    logger.log('A commit contains a breaking-change marker; selecting a major release')
    return 'major'
  }

  const conventionalRelease = await analyzeConventionalCommits(pluginConfig, context)
  const env = context.env ?? process.env
  const fetch = context.fetch ?? globalThis.fetch
  const repository = env.GITHUB_REPOSITORY
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN

  if (!repository || !token) {
    logger.log('GitHub credentials are unavailable; skipping PR body analysis')
    return conventionalRelease
  }

  const [owner, repo, ...extraParts] = repository.split('/')
  if (!owner || !repo || extraParts.length > 0) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`)
  }

  const apiUrl = (env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '')
  const commitShas = [...new Set(commits.map(({ hash }) => hash).filter(Boolean))]

  for (const sha of commitShas) {
    const pullRequests = await pullRequestsForCommit({
      apiUrl,
      fetch,
      owner,
      repo,
      sha,
      token,
    })

    if (pullRequests.some(({ body }) => hasBreakingChangeMarker(body))) {
      logger.log('An associated PR body contains a breaking-change marker; selecting a major release')
      return 'major'
    }
  }

  return conventionalRelease
}
