import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import UserLayout from './components/UserLayout'
import HomePage from './pages/HomePage'
import OverviewPage from './pages/OverviewPage'
import RepositoriesPage from './pages/RepositoriesPage'
import { RouteFallback } from './components/States'
import ComparePage from './pages/ComparePage'
import SavedPage from './pages/SavedPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

// The charting library is large, so the two pages that use it are downloaded only when opened.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="u/:username" element={<UserLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="repos" element={<RepositoriesPage />} />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="activity"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ActivityPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="compare" element={<ComparePage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
