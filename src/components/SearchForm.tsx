import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { isValidUsername } from '../services/github'

interface Props {
  initialValue?: string
  large?: boolean
  onSubmitted?: () => void
}

export default function SearchForm({ initialValue = '', large = false, onSubmitted }: Props) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const username = value.trim().replace(/^@/, '')
    if (!username) {
      setError('Enter a GitHub username.')
      return
    }
    if (!isValidUsername(username)) {
      setError('Usernames use letters, numbers and single hyphens (max 39 characters).')
      return
    }
    setError(null)
    navigate(`/u/${encodeURIComponent(username)}`)
    onSubmitted?.()
  }

  return (
    <form className={`search ${large ? 'search-large' : ''}`} onSubmit={handleSubmit} role="search">
      <div className="search-field">
        <Search size={large ? 20 : 16} aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Search a GitHub username"
          aria-label="GitHub username"
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
