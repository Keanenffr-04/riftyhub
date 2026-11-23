export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: Date
}

let current: RateLimitInfo | null = null
const listeners = new Set<() => void>()

export function setRateLimit(info: RateLimitInfo) {
  current = info
  listeners.forEach((l) => l())
}

export function clearRateLimit() {
  current = null
  listeners.forEach((l) => l())
}

export const getRateLimit = () => current

export function subscribeRateLimit(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
