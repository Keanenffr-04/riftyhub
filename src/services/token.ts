import { useSyncExternalStore } from 'react'
import { createPersistentStore } from '../utils/persistentStore'
import { clearRateLimit } from './rateLimit'

/**
 * Optional GitHub personal access token. It lives only in this browser (localStorage), is sent only
 * to api.github.com in an Authorization header, and is never included in backups.
 */
const store = createPersistentStore<string>('riftyhub:token', (raw) => (typeof raw === 'string' && isValidTokenFormat(raw) ? raw : ''))

/** Classic (ghp_…), fine-grained (github_pat_…) or older 40-character hexadecimal tokens. */
export function isValidTokenFormat(value: string): boolean {
  return /^(ghp_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255}|[a-f0-9]{40})$/.test(value)
}

export const getToken = (): string => store.get()

export function setToken(value: string) {
  const next = value.trim()
  if (next === store.get()) return
  store.set(next)
  // The old request quota belongs to the old token (or to no token), so start counting afresh.
  clearRateLimit()
}

export const useToken = (): string => useSyncExternalStore(store.subscribe, store.get, store.get)
