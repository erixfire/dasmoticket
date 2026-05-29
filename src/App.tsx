import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TicketsPage from '@/pages/TicketsPage'
import TicketDetailPage from '@/pages/TicketDetailPage'
import CreateTicketPage from '@/pages/CreateTicketPage'
import NotificationsPage from '@/pages/NotificationsPage'
import SchedulePage from '@/pages/SchedulePage'
import SurveyStatsPage from '@/pages/SurveyStatsPage'
import AdminPage from '@/pages/AdminPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { ToastContainer } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return (
    <>
      {user && <Sidebar />}
      {children}
      <ToastContainer />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
          <Route path="/tickets/new" element={<ProtectedRoute><CreateTicketPage /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/surveys" element={<ProtectedRoute roles={['it_staff','admin']}><SurveyStatsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  )
}
