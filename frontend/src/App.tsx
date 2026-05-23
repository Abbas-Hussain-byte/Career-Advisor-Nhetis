import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { LanguageProvider } from './context/LanguageContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CareerExplorer from './pages/CareerExplorer';
import Colleges from './pages/Colleges';
import Profile from './pages/Profile';
import Insights from './pages/Insights';
import Scholarships from './pages/Scholarships';
import Resources from './pages/Resources';

// Components
import ChatWidget from './components/ChatWidget';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// Chat widget wrapper — only shows when logged in and assessment taken
const AuthenticatedChat = () => {
  const { user } = useAuth();
  const hasAssessment = !!(user?.assessment?.results?.length);
  return user && hasAssessment ? <ChatWidget /> : null;
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <OfflineProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/careers" element={<PrivateRoute><CareerExplorer /></PrivateRoute>} />
            <Route path="/colleges" element={<PrivateRoute><Colleges /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
            <Route path="/scholarships" element={<PrivateRoute><Scholarships /></PrivateRoute>} />
            <Route path="/resources" element={<PrivateRoute><Resources /></PrivateRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AuthenticatedChat />
        </Router>
        </OfflineProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;