import type { LanguageStat } from '../utils/analytics'

export default function LanguageBars({ languages, limit = 7 }: { languages: LanguageStat[]; limit?: number }) {
  if (languages.length === 0) return <p className="muted">No language data available.</p>

  return (
    <ul className="lang-bars">
      {languages.slice(0, limit).map((l) => (
        <li key={l.name}>
          <div className="lang-bar-head">
            <span className="lang">
              <i style={{ background: l.color }} aria-hidden="true" />
              {l.name}
            </span>
            <span className="muted">
              {l.count} · {l.percent.toFixed(1)}%
            </span>
          </div>
          <div className="bar">
            <span style={{ width: `${l.percent}%`, background: l.color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
