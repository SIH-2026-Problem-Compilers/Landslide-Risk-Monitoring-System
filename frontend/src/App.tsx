import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GISPage } from './pages/GISPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportSubmitPage } from './pages/ReportSubmitPage';
import { RoadsPage } from './pages/RoadsPage';
import { AlertsPage } from './pages/AlertsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { SensorsPage } from './pages/SensorsPage';
import { HistoricalPage } from './pages/HistoricalPage';
import { SettingsPage } from './pages/SettingsPage';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // For prototype, allow access without auth
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="gis" element={<GISPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/submit" element={<ReportSubmitPage />} />
            <Route path="roads" element={<RoadsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="sensors" element={<SensorsPage />} />
            <Route path="historical" element={<HistoricalPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
