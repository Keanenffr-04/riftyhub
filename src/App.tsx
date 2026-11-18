import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import UserLayout from './components/UserLayout'
import HomePage from './pages/HomePage'
import OverviewPage from './pages/OverviewPage'
import RepositoriesPage from './pages/RepositoriesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ComparePage from './pages/ComparePage'
import SavedPage from './pages/SavedPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="u/:username" element={<UserLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="repos" element={<RepositoriesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="compare" element={<ComparePage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
