import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches unexpected errors while drawing a page, so the user sees a clear message instead of a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RiftyHub hit an unexpected error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    // A page that failed to download (for example after losing the connection) is fixed by reloading.
    const failedToLoad = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(this.state.error.message)
    return (
      <div className="card state" role="alert">
        <div className="state-icon">
          <AlertTriangle size={26} />
        </div>
        <h2>{failedToLoad ? 'This page couldn’t be loaded' : 'Something went wrong'}</h2>
        <p>
          {failedToLoad
            ? 'Part of the app failed to download. Check your connection and reload the page.'
            : 'RiftyHub ran into an unexpected problem. Reloading the page usually fixes it.'}
        </p>
        <div className="state-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="btn" href="/">
            Back to home
          </a>
        </div>
      </div>
    )
  }
}
