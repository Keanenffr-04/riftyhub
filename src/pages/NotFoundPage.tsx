import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States'

export default function NotFoundPage() {
  return (
    <div className="stack">
      <EmptyState title="Page not found" body="That page doesn’t exist." />
      <Link className="btn btn-primary" style={{ alignSelf: 'center' }} to="/">
        Back to search
      </Link>
    </div>
  )
}
