import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import UserLayout from './components/UserLayout'
import HomePage from './pages/HomePage'
import OverviewPage from './pages/OverviewPage'
import RepositoriesPage from './pages/RepositoriesPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="u/:username" element={<UserLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="repos" element={<RepositoriesPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
