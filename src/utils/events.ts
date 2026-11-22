import type { ActivityEvent, ActivityKind } from '../types/github'

interface RawPayload {
  action?: string
  size?: number
  ref?: string | null
  ref_type?: string
  number?: number
  head?: string
  pull_request?: { html_url?: string; title?: string; number?: number; merged?: boolean }
  issue?: { html_url?: string; title?: string; number?: number }
  comment?: { html_url?: string }
  review?: { html_url?: string }
  release?: { html_url?: string; tag_name?: string; name?: string | null }
  forkee?: { html_url?: string }
}

/** A public event as returned by GitHub's `/users/:user/events/public`. */
export interface RawEvent {
  id: string
  type: string | null
  repo: { name: string }
  created_at: string | null
  payload?: RawPayload
}

const GITHUB = 'https://github.com'
const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function describe(e: RawEvent): { kind: ActivityKind; title: string; url: string | null; commits: number } {
  const p = e.payload ?? {}
  const repoUrl = `${GITHUB}/${e.repo.name}`

  switch (e.type) {
    case 'PushEvent': {
      const commits = typeof p.size === 'number' && p.size > 0 ? p.size : 1
      const branch = p.ref ? p.ref.replace(/^refs\/heads\//, '') : null
      return {
        kind: 'push',
        title: `Pushed ${plural(commits, 'commit')}${branch ? ` to ${branch}` : ''}`,
        url: p.head ? `${repoUrl}/commit/${p.head}` : repoUrl,
        commits,
      }
    }
    case 'PullRequestEvent': {
      const pr = p.pull_request
      const action = pr?.merged && p.action === 'closed' ? 'merged' : (p.action ?? 'updated')
      const number = p.number ?? pr?.number
      return {
        kind: 'pull_request',
        title: `${capitalize(action)} pull request${number ? ` #${number}` : ''}${pr?.title ? `: ${pr.title}` : ''}`,
        url: pr?.html_url ?? repoUrl,
        commits: 0,
      }
    }
    case 'IssuesEvent': {
      const issue = p.issue
      return {
        kind: 'issue',
        title: `${capitalize(p.action ?? 'updated')} issue${issue?.number ? ` #${issue.number}` : ''}${issue?.title ? `: ${issue.title}` : ''}`,
        url: issue?.html_url ?? repoUrl,
        commits: 0,
      }
    }
    case 'IssueCommentEvent': {
      const issue = p.issue
      return {
        kind: 'comment',
        title: `Commented on${issue?.number ? ` #${issue.number}` : ' an issue'}${issue?.title ? `: ${issue.title}` : ''}`,
        url: p.comment?.html_url ?? issue?.html_url ?? repoUrl,
        commits: 0,
      }
    }
    case 'PullRequestReviewEvent':
    case 'PullRequestReviewCommentEvent': {
      const pr = p.pull_request
      return {
        kind: 'review',
        title: `Reviewed pull request${pr?.number ? ` #${pr.number}` : ''}${pr?.title ? `: ${pr.title}` : ''}`,
        url: p.review?.html_url ?? p.comment?.html_url ?? pr?.html_url ?? repoUrl,
        commits: 0,
      }
    }
    case 'CreateEvent':
      return {
        kind: 'create',
        title: `Created ${p.ref_type ?? 'item'}${p.ref_type !== 'repository' && p.ref ? ` ${p.ref}` : ''}`,
        url: repoUrl,
        commits: 0,
      }
    case 'ForkEvent':
      return { kind: 'fork', title: 'Forked the repository', url: p.forkee?.html_url ?? repoUrl, commits: 0 }
    case 'WatchEvent':
      return { kind: 'star', title: 'Starred the repository', url: repoUrl, commits: 0 }
    case 'ReleaseEvent': {
      const name = p.release?.name || p.release?.tag_name
      return { kind: 'release', title: `Published release${name ? ` ${name}` : ''}`, url: p.release?.html_url ?? repoUrl, commits: 0 }
    }
    case 'PublicEvent':
      return { kind: 'other', title: 'Made the repository public', url: repoUrl, commits: 0 }
    case 'DeleteEvent':
      return { kind: 'other', title: `Deleted ${p.ref_type ?? 'item'}${p.ref ? ` ${p.ref}` : ''}`, url: repoUrl, commits: 0 }
    default:
      return { kind: 'other', title: (e.type ?? 'Activity').replace(/Event$/, ''), url: repoUrl, commits: 0 }
  }
}

export function mapEvent(e: RawEvent): ActivityEvent | null {
  if (!e.created_at) return null
  return { id: e.id, repo: e.repo.name, createdAt: e.created_at, ...describe(e) }
}
