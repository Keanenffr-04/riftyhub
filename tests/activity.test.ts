import { describe, expect, it } from 'vitest'
import { eventsByDay, repoEvents } from '../src/utils/activity'
import { pageTitle } from '../src/utils/pageTitle'
import type { ActivityEvent } from '../src/types/github'

const at = (day: number) => new Date(2026, 10, day, 12).toISOString()
const event = (id: string, repo: string, day: number): ActivityEvent => ({
  id,
  kind: 'push',
  repo,
  createdAt: at(day),
  title: 'Pushed 1 commit',
  url: null,
  commits: 1,
})

describe('repoEvents', () => {
  const events = [event('1', 'Ada/Engine', 22), event('2', 'ada/other', 21), event('3', 'ada/engine', 20)]

  it('keeps only the repository, whatever the letter case', () => {
    expect(repoEvents(events, 'ada/ENGINE').map((e) => e.id)).toEqual(['1', '3'])
  })
  it('does not match a repository whose name only starts the same way', () => {
    expect(repoEvents([event('1', 'ada/engine-room', 22)], 'ada/engine')).toEqual([])
  })
})

describe('eventsByDay', () => {
  const today = new Date(2026, 10, 24, 12)

  it('covers the days from the oldest event to today', () => {
    const days = eventsByDay([event('1', 'a/b', 22)], 90, today)
    expect(days.map((d) => d.count)).toEqual([1, 0, 0])
  })
  it('can start earlier, so one repository covers the whole activity span', () => {
    const since = new Date(2026, 10, 20, 12).getTime()
    const days = eventsByDay([event('1', 'a/b', 22)], 90, today, since)
    expect(days.map((d) => d.count)).toEqual([0, 0, 1, 0, 0])
  })
  it('is empty without events', () => {
    expect(eventsByDay([], 90, today, 0)).toEqual([])
  })
})

describe('pageTitle', () => {
  it('names a single repository page', () => {
    expect(pageTitle('/u/ada/repos/engine')).toBe('Activity of engine · ada · RiftyHub')
  })
  it('keeps the other titles', () => {
    expect(pageTitle('/u/ada/repos')).toBe('Repositories · ada · RiftyHub')
    expect(pageTitle('/u/ada')).toBe('ada · RiftyHub')
    expect(pageTitle('/compare')).toBe('Compare · RiftyHub')
  })
})
