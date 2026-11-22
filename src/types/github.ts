export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  bio: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  fork: boolean
  archived: boolean
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  created_at: string
  updated_at: string
  pushed_at: string | null
  topics?: string[]
  homepage: string | null
  license: { name: string; spdx_id: string } | null
}

export interface UserData {
  user: GitHubUser
  repos: GitHubRepo[]
}

export interface UserContext extends UserData {
  refresh: () => void
}

export interface GitHubCommit {
  sha: string
  message: string
  url: string
  date: string
  repo: string
}

export interface SavedProfile {
  login: string
  name: string | null
  avatar_url: string
  savedAt: string
  /** Pinned to the top of the saved list. */
  favorite?: boolean
  /** Names of the collections this profile belongs to. */
  collections?: string[]
}

export type ActivityKind = 'push' | 'pull_request' | 'issue' | 'review' | 'comment' | 'create' | 'fork' | 'star' | 'release' | 'other'

/** One public GitHub event, simplified for display. */
export interface ActivityEvent {
  id: string
  kind: ActivityKind
  repo: string
  createdAt: string
  title: string
  url: string | null
  /** Number of commits for push events, otherwise 0. */
  commits: number
}

export interface CommitSearchResult {
  commits: GitHubCommit[]
  total: number
  incomplete: boolean
}
