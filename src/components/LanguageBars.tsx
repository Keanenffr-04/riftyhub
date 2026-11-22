import type { LanguageStat } from '../utils/analytics'

interface Props {
  languages: LanguageStat[]
  limit?: number
  /** How to print each row's raw value (default: the plain number). */
  formatValue?: (n: number) => string
}

export default function LanguageBars({ languages, limit = 7, formatValue = String }: Props) {
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
              {formatValue(l.count)} · {l.percent.toFixed(1)}%
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
