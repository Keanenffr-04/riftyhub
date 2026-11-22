import type { GitHubRepo } from '../types/github'

/**
 * GitHub returns about 90 fields per repository (mostly URLs). RiftyHub uses only these,
 * so keeping just them cuts memory and cache size by roughly 90%.
 */
export function slimRepo(r: GitHubRepo): GitHubRepo {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description ?? null,
    fork: r.fork,
    archived: r.archived,
    language: r.language ?? null,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    open_issues_count: r.open_issues_count,
    created_at: r.created_at,
    updated_at: r.updated_at,
    pushed_at: r.pushed_at ?? null,
    topics: r.topics ?? [],
    homepage: r.homepage ?? null,
    license: r.license ? { name: r.license.name, spdx_id: r.license.spdx_id } : null,
  }
}
