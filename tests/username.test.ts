import { describe, expect, it } from 'vitest'
import { isValidUsername } from '../src/utils/username'

describe('isValidUsername', () => {
  it('accepts normal GitHub usernames', () => {
    for (const name of ['a', 'octocat', 'Ada-Lovelace', 'user123', 'a'.repeat(39)]) expect(isValidUsername(name)).toBe(true)
  })

  it('rejects empty, too long, and badly hyphenated names', () => {
    for (const name of ['', 'a'.repeat(40), '-ada', 'ada-', 'ada--lovelace', 'ada lovelace', 'ada_lovelace', 'ada/x', '@ada'])
      expect(isValidUsername(name)).toBe(false)
  })
})
