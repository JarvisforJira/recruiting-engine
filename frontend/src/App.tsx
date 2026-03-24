import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import RolesPage from './components/Roles/RolesPage'
import RoleDetail from './components/Roles/RoleDetail'
import ProspectsPage from './components/Prospects/ProspectsPage'
import ProspectDetail from './components/Prospects/ProspectDetail'
import QueuePage from './components/Queue/QueuePage'
import AnalyticsPage from './components/Analytics/AnalyticsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/roles/:id" element={<RoleDetail />} />
        <Route path="/prospects" element={<ProspectsPage />} />
        <Route path="/prospects/:id" element={<ProspectDetail />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </Layout>
  )
}
