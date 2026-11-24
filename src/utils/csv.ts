import type { GitHubRepo } from '../types/github'

type Cell = string | number | boolean | null | undefined

/**
 * One CSV field. Fields with a comma, quote or line break are quoted (quotes doubled). Text that a
 * spreadsheet would read as a formula (starting with = + - @ or a tab or return) gets a leading
 * apostrophe, so an odd repository description can't run as a formula when the file is opened.
 */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const REPO_CSV_COLUMNS: { header: string; get: (r: GitHubRepo) => Cell }[] = [
  { header: 'name', get: (r) => r.name },
  { header: 'full_name', get: (r) => r.full_name },
  { header: 'url', get: (r) => r.html_url },
  { header: 'description', get: (r) => r.description },
  { header: 'language', get: (r) => r.language },
  { header: 'stars', get: (r) => r.stargazers_count },
  { header: 'forks', get: (r) => r.forks_count },
  { header: 'open_issues_and_prs', get: (r) => r.open_issues_count },
  { header: 'is_fork', get: (r) => r.fork },
  { header: 'is_archived', get: (r) => r.archived },
  { header: 'license', get: (r) => r.license?.name },
  { header: 'topics', get: (r) => (r.topics ?? []).join('; ') },
  { header: 'created', get: (r) => r.created_at },
  { header: 'last_pushed', get: (r) => r.pushed_at },
  { header: 'last_updated', get: (r) => r.updated_at },
  { header: 'homepage', get: (r) => r.homepage },
]

/** Byte-order mark: makes Excel read the file as UTF-8, so accents and other scripts survive. */
const BOM = '\uFEFF'

/** The repositories as CSV text, in the order given: a header row, then one row per repository (CRLF line breaks). */
export function reposToCsv(repos: GitHubRepo[]): string {
  const lines = [REPO_CSV_COLUMNS.map((c) => c.header).join(',')]
  for (const r of repos) lines.push(REPO_CSV_COLUMNS.map((c) => csvCell(c.get(r))).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

/** File name for a developer's export, for example "ada-repositories.csv". */
export function repoCsvFileName(login: string): string {
  const safe = login.replace(/[^A-Za-z0-9-]/g, '')
  return `${safe || 'developer'}-repositories.csv`
}
