import type { GitHubRepo } from '../types/github'

/**
 * The Repositories search box understands plain words plus operators, for example
 *   react stars:>100 lang:typescript -is:fork pushed:>=2024-01-01
 * Plain words must appear in the name, description, language or topics. Every operator narrows the
 * list further. An operator with a value that cannot be understood (stars:lots) is reported in
 * `ignored` instead of silently matching nothing. Unknown words such as http://x are plain text.
 */
export interface Condition {
  /** The operator as typed, e.g. "stars:>100". */
  source: string
  test: (repo: GitHubRepo) => boolean
}

export interface ParsedQuery {
  /** Lower-case plain-text terms; each one must appear somewhere in the repository's text. */
  terms: string[]
  conditions: Condition[]
  /** Operators that were recognised but had a value that could not be understood. */
  ignored: string[]
}

interface Token {
  text: string
  /** True when the token began with a quote, so it is a phrase and never an operator. */
  phrase: boolean
}

/** Splits on spaces; double quotes keep spaces together (lang:"jupyter notebook", "machine learning"). */
function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let text = ''
  let phrase = false
  let inQuotes = false
  let started = false
  const flush = () => {
    if (started && text) tokens.push({ text, phrase })
    text = ''
    phrase = false
    started = false
  }
  for (const ch of input) {
    if (ch === '"') {
      if (!started) phrase = true
      started = true
      inQuotes = !inQuotes
    } else if (/\s/.test(ch) && !inQuotes) {
      flush()
    } else {
      started = true
      text += ch
    }
  }
  flush()
  return tokens
}

type NumberTest = (n: number) => boolean

function parseNumberExpr(v: string): NumberTest | null {
  let m = /^(\d+)\.\.(\d+)$/.exec(v)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return (n) => n >= lo && n <= hi
  }
  m = /^(>=|<=|>|<)(\d+)$/.exec(v)
  if (m) {
    const x = Number(m[2])
    switch (m[1]) {
      case '>':
        return (n) => n > x
      case '>=':
        return (n) => n >= x
      case '<':
        return (n) => n < x
      default:
        return (n) => n <= x
    }
  }
  m = /^(\d+)$/.exec(v)
  if (m) {
    const x = Number(m[1])
    return (n) => n === x
  }
  return null
}

/** A year (2024), month (2024-03) or day (2024-03-09) as the time span [start, end) in UTC. */
function parsePeriod(s: string): [number, number] | null {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s)
  if (!m) return null
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : null
  const day = m[3] ? Number(m[3]) : null
  if (month !== null && (month < 1 || month > 12)) return null
  if (month !== null && day !== null) {
    const probe = new Date(Date.UTC(year, month - 1, day))
    if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null
  }
  const start = Date.UTC(year, month === null ? 0 : month - 1, day ?? 1)
  const end = day !== null ? Date.UTC(year, month! - 1, day + 1) : month !== null ? Date.UTC(year, month, 1) : Date.UTC(year + 1, 0, 1)
  return [start, end]
}

function parseDateExpr(v: string): NumberTest | null {
  const range = /^([^.]+)\.\.([^.]+)$/.exec(v)
  if (range) {
    const a = parsePeriod(range[1])
    const b = parsePeriod(range[2])
    if (!a || !b) return null
    const from = Math.min(a[0], b[0])
    const to = Math.max(a[1], b[1])
    return (t) => t >= from && t < to
  }
  const m = /^(>=|<=|>|<)?(.+)$/.exec(v)
  if (!m) return null
  const period = parsePeriod(m[2])
  if (!period) return null
  const [start, end] = period
  switch (m[1]) {
    case '>':
      return (t) => t >= end
    case '>=':
      return (t) => t >= start
    case '<':
      return (t) => t < start
    case '<=':
      return (t) => t < end
    default:
      return (t) => t >= start && t < end
  }
}

const time = (value: string | null | undefined): number => Date.parse(value ?? '') || 0

type Builder = (value: string) => ((repo: GitHubRepo) => boolean) | null

const numeric =
  (read: (r: GitHubRepo) => number): Builder =>
  (v) => {
    const test = parseNumberExpr(v)
    return test ? (r) => test(read(r)) : null
  }

const dated =
  (read: (r: GitHubRepo) => number): Builder =>
  (v) => {
    const test = parseDateExpr(v)
    return test ? (r) => test(read(r)) : null
  }

const BUILDERS: Record<string, Builder> = {
  stars: numeric((r) => r.stargazers_count),
  forks: numeric((r) => r.forks_count),
  issues: numeric((r) => r.open_issues_count),
  pushed: dated((r) => time(r.pushed_at ?? r.updated_at)),
  created: dated((r) => time(r.created_at)),
  lang: (v) => {
    const want = v.toLowerCase()
    return want === 'none' ? (r) => !r.language : (r) => (r.language ?? '').toLowerCase() === want
  },
  topic: (v) => {
    const want = v.toLowerCase()
    return (r) => (r.topics ?? []).some((t) => t.toLowerCase() === want)
  },
  license: (v) => {
    const want = v.toLowerCase()
    if (want === 'none') return (r) => !r.license
    return (r) => !!r.license && (r.license.name.toLowerCase().includes(want) || r.license.spdx_id.toLowerCase() === want)
  },
  name: (v) => {
    const want = v.toLowerCase()
    return (r) => r.name.toLowerCase().includes(want)
  },
  desc: (v) => {
    const want = v.toLowerCase()
    return (r) => (r.description ?? '').toLowerCase().includes(want)
  },
  is: (v) => {
    switch (v.toLowerCase()) {
      case 'fork':
        return (r) => r.fork
      case 'source':
        return (r) => !r.fork
      case 'archived':
        return (r) => r.archived
      default:
        return null
    }
  },
}
BUILDERS.language = BUILDERS.lang
BUILDERS.description = BUILDERS.desc

export function parseQuery(input: string): ParsedQuery {
  const result: ParsedQuery = { terms: [], conditions: [], ignored: [] }

  for (const token of tokenize(input)) {
    const negate = !token.phrase && token.text.startsWith('-') && token.text.length > 1
    const body = negate ? token.text.slice(1) : token.text
    const colon = body.indexOf(':')
    const key = !token.phrase && colon > 0 ? body.slice(0, colon).toLowerCase() : ''
    const build = key && Object.prototype.hasOwnProperty.call(BUILDERS, key) ? BUILDERS[key] : null

    if (!build) {
      // Not an operator (or an unknown one): ordinary search text, hyphen included.
      result.terms.push(token.text.toLowerCase())
      continue
    }

    const value = body.slice(colon + 1)
    if (!value) continue // still being typed, e.g. "stars:"
    const test = build(value)
    if (!test) {
      result.ignored.push(token.text)
      continue
    }
    result.conditions.push({ source: token.text, test: negate ? (r) => !test(r) : test })
  }
  return result
}
