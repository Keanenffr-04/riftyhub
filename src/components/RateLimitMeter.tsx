import { useSyncExternalStore } from 'react'
import { getRateLimit, subscribeRateLimit } from '../services/rateLimit'

export default function RateLimitMeter() {
  const info = useSyncExternalStore(subscribeRateLimit, getRateLimit, getRateLimit)

  if (!info) {
    return <p>Live data from the public GitHub API. Without a token, GitHub allows 60 requests per hour.</p>
  }

  const low = info.remaining <= 10
  return (
    <div className={`rate${low ? ' low' : ''}`}>
      <p>
        GitHub requests left: <strong>{info.remaining}</strong> of {info.limit}
      </p>
      <p>Resets at {info.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}
