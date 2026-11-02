import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SOSProvider } from './context/SOSContext';
import RequireAuth from './auth/RequireAuth';
import { canManageStaff, isCommunityUser, isOperations, isSuperAdmin } from './auth/roles';
import ScrollToTop from './components/common/ScrollToTop';
import FullPageLoader from './components/common/FullPageLoader';
import EmergencyButton from './components/sos/EmergencyButton';

const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const OperationsDashboard = lazy(() => import('./components/dashboard/OperationsDashboard'));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'));
const ReportIncident = lazy(() => import('./pages/ReportIncident'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const AllReports = lazy(() => import('./pages/AllReports'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SafetyMap = lazy(() => import('./pages/SafetyMap'));
const Community = lazy(() => import('./pages/Community'));
const NotFound = lazy(() => import('./pages/NotFound'));

const communityOrSuper = (u) => isCommunityUser(u) || isSuperAdmin(u);

const Home = () => {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  return isOperations(user) ? <OperationsDashboard /> : <Dashboard />;
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  // The SOS button is for the public (anonymous visitors, citizens, volunteers).
  const showSOS = !user || isCommunityUser(user);

  return (
    <div className="relative">
      <ScrollToTop />
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

          <Route path="/reports" element={<RequireAuth><AllReports /></RequireAuth>} />
          <Route path="/reports/:reportId" element={<RequireAuth><ReportDetail /></RequireAuth>} />
          <Route path="/report" element={<RequireAuth allow={communityOrSuper}><ReportIncident /></RequireAuth>} />
          <Route path="/safety-map" element={<RequireAuth><SafetyMap /></RequireAuth>} />
          <Route path="/community" element={<RequireAuth allow={communityOrSuper}><Community /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin/staff" element={<RequireAuth allow={canManageStaff}><StaffManagement /></RequireAuth>} />

          {/* legacy paths */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/report-incident" element={<Navigate to="/report" replace />} />
          <Route path="/reports/new" element={<Navigate to="/report" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {showSOS && <EmergencyButton />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <SOSProvider>
          <AppContent />
        </SOSProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
