import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import Dashboard from './components/dashboard/Dashboard';
import ReportIncident from './pages/ReportIncident';
import EmergencyButton from './components/sos/EmergencyButton';
import ReportDetail from './pages/ReportDetail';
import AllReports from './pages/AllReports';
import ScrollToTop from './components/common/ScrollToTop';
import ProfilePage from './pages/ProfilePage';
import SafetyMap from './pages/SafetyMap';
import { SOSProvider } from './context/SOSContext';
import NotFound from './pages/NotFound';
import Community from './pages/Community';
import PoliceDashboard from './components/dashboard/PoliceDashboard';
import { Shield } from 'lucide-react';

const AppContent = () => {
  const { user, loading } = useAuth();

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
  //       <div className="text-center">
  //         <div className="text-6xl mb-4 emergency-pulse">🛡️</div>
  //         <p className="text-xl text-gray-600">Loading CityShield...</p>
  //       </div>
  //     </div>
  //   );
  // }
  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center relative">
              <Shield className="w-10 h-10 text-white" />
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Loading CityShield...
            </h3>
            {/* <p className="text-gray-600 mb-4">📡 Connecting to community reports and safety data...</p> */}
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative">
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {user?.role === 'police' ? (
          <Route path="/" element={< PoliceDashboard />} />
        ) : (
          <>
            <Route path="/" element={user ? <Dashboard /> : <LandingPage />} />
            <Route path="/reports" element={<AllReports />} />
            <Route path="/safety-map" element={<SafetyMap />} />

            {/* Protected Routes */}
            {/* <Route path="/dashboard" element={user ? <Dashboard /> : <Link to="/login" replace />}/> */}
            <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/report" element={user ? <ReportIncident /> : <Navigate to="/login" />} />
            <Route path="/reports/:reportId" element={<ReportDetail />} />
            <Route path="/community" element={user ? <Community /> : <Navigate to="/login" />} />
            {/* <Route path="/reports" element={user ? <AllReports /> : <LoginPage />} /> */}

          </>
        )}

        {/* 404 Page - Catch all route */}
        <Route path="*" element={<NotFound />} />

      </Routes>

      {/* Emergency button always available */}
      {user ? ((user.role !== 'police' && user.role !== 'municipality' && user.role !== 'government') ? <EmergencyButton /> : '') : <EmergencyButton />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <SOSProvider> {/* Wrap with SOSProvider */}
          <AppContent />
        </SOSProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
