import { useSyncExternalStore } from 'react'
import { getRateLimit, subscribeRateLimit } from '../services/rateLimit'
import { useToken } from '../services/token'

export default function RateLimitMeter() {
  const info = useSyncExternalStore(subscribeRateLimit, getRateLimit, getRateLimit)
  const token = useToken()

  if (!info) {
    return <p>{token ? 'Live data from GitHub, using your token (5,000 requests per hour).' : 'Live data from the public GitHub API. Without a token, GitHub allows 60 requests per hour.'}</p>
  }

  const low = info.remaining <= 10
  return (
    <div className={`rate${low ? ' low' : ''}`}>
      <p>
        GitHub requests left: <strong>{info.remaining}</strong> of {info.limit}
      </p>
      {token && <p>Using your token</p>}
      <p>Resets at {info.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  )
}
