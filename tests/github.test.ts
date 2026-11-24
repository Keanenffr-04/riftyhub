import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './setup'
import { clearCache } from '../src/services/cache'
import { clearRateLimit, getRateLimit } from '../src/services/rateLimit'
import { setToken } from '../src/services/token'
import { GitHubError, checkToken, forgetMoreRepos, getMoreRepos, getRepos, getUser, getUserEvents, peekMoreRepos, searchCommits } from '../src/services/github'

// ---------- A fake `fetch` ----------

interface Call {
  url: string
  headers: Record<string, string>
}

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | 'network-error'
type Responder = (url: string, call: number) => Reply

let calls: Call[] = []
let responder: Responder = () => ({ body: {} })

function installFetch() {
  calls = []
  globalThis.fetch = (async (input: unknown, init?: { headers?: Record<string, string> }) => {
    const url = String(input)
    calls.push({ url, headers: { ...(init?.headers ?? {}) } })
    const reply = responder(url, calls.length)
    if (reply === 'network-error') throw new TypeError('Failed to fetch')
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200, headers: reply.headers ?? {} })
  }) as typeof fetch
}

const user = (login: string, publicRepos = 0) => ({ login, id: 1, public_repos: publicRepos })

const rawRepo = (id: number): Record<string, unknown> => ({
  id,
  name: `r${id}`,
  full_name: `me/r${id}`,
  html_url: `https://github.com/me/r${id}`,
  description: null,
  fork: false,
  archived: false,
  language: 'Go',
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 0,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
  pushed_at: '2020-01-02T00:00:00Z',
  homepage: null,
  license: null,
  // fields RiftyHub does not use
  node_id: 'abc',
  owner: { login: 'me' },
  git_url: 'git://example',
})

/** Answers /users/:login and /users/:login/repos?page=N for a developer with `total` repositories. */
function profile(login: string, total: number): Responder {
  return (url) => {
    const page = /[?&]page=(\d+)/.exec(url)
    if (/\/repos\?/.test(url) && page) {
      const p = Number(page[1])
      const first = (p - 1) * 100
      const count = Math.max(0, Math.min(100, total - first))
      return { body: Array.from({ length: count }, (_, i) => rawRepo(first + i + 1)) }
    }
    return { body: user(login, total) }
  }
}

const reposPages = () => calls.map((c) => /\/repos\?.*page=(\d+)/.exec(c.url)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b)

/** Runs a request that may sleep between retries, advancing the (fake) clock until it settles. */
async function settle<T>(p: Promise<T>): Promise<T | GitHubError | unknown> {
  const done = p.then(
    (v) => v,
    (e) => e,
  )
  await vi.advanceTimersByTimeAsync(5000)
  return done
}

const TOKEN = `ghp_${'a'.repeat(30)}`

beforeEach(() => {
  clearCache()
  sessionStorage.clear()
  clearRateLimit()
  setToken('')
  vi.useFakeTimers()
  responder = () => ({ body: {} })
  installFetch()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('requests', () => {
  it('asks the right address, with no Authorization header when there is no token', async () => {
    responder = () => ({ body: user('ada') })
    const u = await getUser('ada')
    expect(u.login).toBe('ada')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.github.com/users/ada')
    expect(calls[0].headers.Accept).toBe('application/vnd.github+json')
    expect('Authorization' in calls[0].headers).toBe(false)
  })

  it('encodes the username in the address', async () => {
    await getUser('a b')
    expect(calls[0].url).toBe('https://api.github.com/users/a%20b')
  })

  it('sends the saved token as a Bearer header', async () => {
    setToken(TOKEN)
    await getUser('ada')
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('serves a repeated request from the cache, and fetches again when forced', async () => {
    await getUser('ada')
    await getUser('ADA')
    expect(calls).toHaveLength(1)
    await getUser('ada', true)
    expect(calls).toHaveLength(2)
  })
})

describe('rate limit tracking', () => {
  it('reads the core quota from the response headers', async () => {
    responder = () => ({ body: user('ada'), headers: { 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '41', 'x-ratelimit-reset': '1900000000' } })
    await getUser('ada')
    const info = getRateLimit()
    expect(info?.limit).toBe(60)
    expect(info?.remaining).toBe(41)
    expect(info?.resetAt.getTime()).toBe(1_900_000_000_000)
  })

  it('ignores the separate search quota', async () => {
    responder = () => ({
      body: { items: [] },
      headers: { 'x-ratelimit-limit': '10', 'x-ratelimit-remaining': '9', 'x-ratelimit-reset': '1900000000', 'x-ratelimit-resource': 'search' },
    })
    await searchCommits('ada', { text: 'fix', repo: '', since: '' })
    expect(getRateLimit()).toBeNull()
  })

  it('stops sending requests once the quota is known to be spent, but still allows search', async () => {
    const reset = String(Math.floor(Date.now() / 1000) + 3600)
    responder = (url) =>
      url.includes('/search/')
        ? { body: { items: [] } }
        : { body: user('ada'), headers: { 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset } }
    await getUser('ada')
    expect(calls).toHaveLength(1)

    const err = (await settle(getUser('grace'))) as GitHubError
    expect(err).toBeInstanceOf(GitHubError)
    expect(err.kind).toBe('rate_limit')
    expect(calls).toHaveLength(1)

    await searchCommits('grace', { text: '', repo: '', since: '' })
    expect(calls).toHaveLength(2)
  })
})

describe('errors', () => {
  const failWith = async (reply: Reply) => {
    responder = () => reply
    return (await settle(getUser('ada'))) as GitHubError
  }

  it('maps 404 to not found without retrying', async () => {
    const err = await failWith({ status: 404 })
    expect(err.kind).toBe('not_found')
    expect(calls).toHaveLength(1)
  })

  it('maps 401 to a rejected token', async () => {
    const err = await failWith({ status: 401 })
    expect(err.kind).toBe('auth')
    expect(calls).toHaveLength(1)
  })

  it('maps 403 with no requests left to a rate limit, with the reset time', async () => {
    const err = await failWith({ status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' } })
    expect(err.kind).toBe('rate_limit')
    expect(err.resetAt?.getTime()).toBe(1_900_000_000_000)
  })

  it('maps 429 and Retry-After to a rate limit', async () => {
    expect((await failWith({ status: 429 })).kind).toBe('rate_limit')
    clearCache()
    const err = await failWith({ status: 403, headers: { 'retry-after': '30' } })
    expect(err.kind).toBe('rate_limit')
    expect(err.resetAt).toBeInstanceOf(Date)
  })

  it('treats a plain 403 as unexpected, not as a rate limit', async () => {
    const err = await failWith({ status: 403 })
    expect(err.kind).toBe('unknown')
  })

  it('reports an unreadable answer', async () => {
    globalThis.fetch = (async () => new Response('<html>', { status: 200 })) as typeof fetch
    const err = (await settle(getUser('ada'))) as GitHubError
    expect(err.kind).toBe('unknown')
  })
})

describe('retries', () => {
  it('retries a server error and succeeds when GitHub recovers', async () => {
    responder = (_url, n) => (n < 2 ? { status: 503 } : { body: user('ada') })
    const result = (await settle(getUser('ada'))) as { login: string }
    expect(result.login).toBe('ada')
    expect(calls).toHaveLength(2)
  })

  it('gives up after three attempts on a server error', async () => {
    responder = () => ({ status: 500 })
    const err = (await settle(getUser('ada'))) as GitHubError
    expect(err.kind).toBe('server')
    expect(err.message).toMatch(/500/)
    expect(calls).toHaveLength(3)
  })

  it('retries a network failure, then reports it', async () => {
    responder = () => 'network-error'
    const err = (await settle(getUser('ada'))) as GitHubError
    expect(err.kind).toBe('network')
    expect(calls).toHaveLength(3)
  })

  it('does not retry a not-found answer', async () => {
    responder = () => ({ status: 404 })
    await settle(getUser('ada'))
    expect(calls).toHaveLength(1)
  })
})

describe('repositories', () => {
  it('loads one page for a small account and keeps only the fields RiftyHub uses', async () => {
    responder = profile('ada', 2)
    const repos = await getRepos('ada')
    expect(repos.map((r) => r.id)).toEqual([1, 2])
    expect('node_id' in repos[0]).toBe(false)
    expect('owner' in repos[0]).toBe(false)
    expect(repos[0].language).toBe('Go')
    expect(reposPages()).toEqual([1])
  })

  it('asks for the repositories most recently pushed first', async () => {
    responder = profile('ada', 1)
    await getRepos('ada')
    const url = calls.find((c) => c.url.includes('/repos?'))?.url ?? ''
    expect(url).toContain('type=owner')
    expect(url).toContain('sort=pushed')
    expect(url).toContain('direction=desc')
    expect(url).toContain('per_page=100')
  })

  it('loads every page for 250 repositories and fetches the profile once', async () => {
    responder = profile('ada', 250)
    const repos = await getRepos('ada')
    expect(repos).toHaveLength(250)
    expect(reposPages()).toEqual([1, 2, 3])
    expect(calls.filter((c) => c.url.endsWith('/users/ada'))).toHaveLength(1)
  })

  it('stops at 300 repositories however many exist', async () => {
    responder = profile('ada', 900)
    const repos = await getRepos('ada')
    expect(repos).toHaveLength(300)
    expect(reposPages()).toEqual([1, 2, 3])
  })
})

describe('the rest of the repositories', () => {
  it('fetches only the pages after the first 300', async () => {
    responder = profile('ada', 450)
    const more = await getMoreRepos('ada')
    expect(reposPages()).toEqual([4, 5])
    expect(more.map((r) => r.id)).toEqual(Array.from({ length: 150 }, (_, i) => 301 + i))
  })

  it('makes no repository request when everything is already loaded', async () => {
    responder = profile('ada', 250)
    expect(await getMoreRepos('ada')).toEqual([])
    expect(reposPages()).toEqual([])
  })

  it('stops at 1,000 repositories', async () => {
    responder = profile('ada', 5000)
    const more = await getMoreRepos('ada')
    expect(reposPages()).toEqual([4, 5, 6, 7, 8, 9, 10])
    expect(more).toHaveLength(700)
  })

  it('is cached, and does not repeat the profile request', async () => {
    responder = profile('ada', 450)
    await getMoreRepos('ada')
    const before = calls.length
    await getMoreRepos('ada')
    expect(calls).toHaveLength(before)
  })

  it('reports a failed page as an error', async () => {
    responder = (url, n) => (n > 1 && url.includes('page=5') ? { status: 404 } : profile('ada', 450)(url, n))
    const err = (await settle(getMoreRepos('ada'))) as GitHubError
    expect(err).toBeInstanceOf(GitHubError)
  })
})

describe('remembering the rest of the repositories', () => {
  it('has nothing stored until they are loaded, then returns them without a request', async () => {
    responder = profile('ada', 450)
    expect(peekMoreRepos('ada')).toBeUndefined()
    await getMoreRepos('ada')
    const before = calls.length
    const saved = peekMoreRepos('ADA')
    expect(saved?.repos).toHaveLength(150)
    expect(saved?.fresh).toBe(true)
    expect(calls).toHaveLength(before)
  })

  it('still returns them once past their normal lifetime, marked as not fresh', async () => {
    responder = profile('ada', 450)
    await getMoreRepos('ada')
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    const saved = peekMoreRepos('ada')
    expect(saved?.repos).toHaveLength(150)
    expect(saved?.fresh).toBe(false)
  })

  it('forgets them on request, so the next load goes to GitHub', async () => {
    responder = profile('ada', 450)
    await getMoreRepos('ada')
    forgetMoreRepos('ada')
    expect(peekMoreRepos('ada')).toBeUndefined()
    const before = reposPages().length
    await getMoreRepos('ada')
    expect(reposPages().length).toBe(before + 2)
  })
})

describe('commit search', () => {
  const ok = () => ({ body: { total_count: 2, incomplete_results: false, items: [] } })

  it('builds the search from the text, repository and date, and strips qualifier characters from the text', async () => {
    responder = ok
    await searchCommits('ada', { text: 'author:bob "fix"', repo: 'ada/tools', since: '2026-01-01' })
    const q = decodeURIComponent(/q=([^&]+)/.exec(calls[0].url)?.[1] ?? '')
    expect(q).toBe('author bob  fix author:ada repo:ada/tools author-date:>=2026-01-01')
    expect(calls[0].url).toContain('/search/commits?')
    expect(calls[0].url).toContain('per_page=30')
    expect(calls[0].url).toContain('page=1')
  })

  it('keeps only the first line of each message and reads the totals', async () => {
    responder = () => ({
      body: {
        total_count: 41,
        incomplete_results: true,
        items: [{ sha: 'abc', html_url: 'https://x/abc', commit: { message: 'Fix bug\n\nlong text', author: { date: '2026-02-01T00:00:00Z' } }, repository: { full_name: 'ada/tools' } }],
      },
    })
    const res = await searchCommits('ada', { text: '', repo: '', since: '' }, 2)
    expect(res.total).toBe(41)
    expect(res.incomplete).toBe(true)
    expect(res.commits).toEqual([{ sha: 'abc', message: 'Fix bug', url: 'https://x/abc', date: '2026-02-01T00:00:00Z', repo: 'ada/tools' }])
    expect(calls[0].url).toContain('page=2')
  })

  it('falls back to the number of items when GitHub sends no total', async () => {
    responder = () => ({ body: { items: [] } })
    const res = await searchCommits('ada', { text: '', repo: '', since: '' })
    expect(res.total).toBe(0)
    expect(res.incomplete).toBe(false)
  })

  it('caches each page of each search separately', async () => {
    responder = ok
    const q = { text: 'fix', repo: '', since: '' }
    await searchCommits('ada', q, 1)
    await searchCommits('ada', q, 1)
    await searchCommits('ada', q, 2)
    expect(calls).toHaveLength(2)
  })
})

describe('events', () => {
  const event = (id: number) => ({ id: String(id), type: 'WatchEvent', repo: { name: 'a/b' }, created_at: '2026-01-01T00:00:00Z', payload: {} })
  const page = (n: number) => Array.from({ length: n }, (_, i) => event(i))

  it('stops after a short page', async () => {
    responder = () => ({ body: page(40) })
    const events = await getUserEvents('ada')
    expect(events).toHaveLength(40)
    expect(calls).toHaveLength(1)
  })

  it('reads at most three pages of 100', async () => {
    responder = () => ({ body: page(100) })
    const events = await getUserEvents('ada')
    expect(events).toHaveLength(300)
    expect(calls).toHaveLength(3)
  })

  it('leaves out events without a date', async () => {
    responder = () => ({ body: [event(1), { id: '2', type: 'PushEvent', repo: { name: 'a/b' }, created_at: null }] })
    expect(await getUserEvents('ada')).toHaveLength(1)
  })
})

describe('checkToken', () => {
  it('accepts a token and reads its request limit', async () => {
    responder = () => ({ headers: { 'x-ratelimit-limit': '5000' } })
    expect(await checkToken(TOKEN)).toEqual({ ok: true, limit: 5000 })
    expect(calls[0].url).toBe('https://api.github.com/rate_limit')
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('reports a rejected token', async () => {
    responder = () => ({ status: 401 })
    expect(await checkToken(TOKEN)).toEqual({ ok: false, reason: 'rejected' })
  })

  it('reports a problem reaching GitHub for other failures', async () => {
    responder = () => ({ status: 500 })
    expect(await checkToken(TOKEN)).toEqual({ ok: false, reason: 'network' })
    responder = () => 'network-error'
    expect(await checkToken(TOKEN)).toEqual({ ok: false, reason: 'network' })
  })
})
