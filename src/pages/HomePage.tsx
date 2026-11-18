import { Link } from 'react-router-dom'
import SearchForm from '../components/SearchForm'

const examples = ['torvalds', 'gaearon', 'sindresorhus', 'tj']

export default function HomePage() {
  return (
    <section className="hero">
      <h1>Explore any GitHub developer</h1>
      <p className="hero-sub">
        Enter a username to see their profile and public repositories, pulled live from GitHub.
      </p>
      <SearchForm large />
      <p className="examples">
        Try{' '}
        {examples.map((name, i) => (
          <span key={name}>
            <Link to={`/u/${name}`}>{name}</Link>
            {i < examples.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
    </section>
  )
}
