import { FC } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SettingsPage from './pages/settings';
import HelpPage from './pages/help';
import LoginPage from './pages/login';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PowerBIDocumentation from './pages/powerbi-docs';
import PowerBIChat from './pages/powerbi-chat';
import './App.css';

const App: FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute requiredRole={null} requiredMicrosoftRole={null}>
                <Layout>
                  <PowerBIDocumentation />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/powerbi" element={
              <ProtectedRoute requiredRole={null} requiredMicrosoftRole={null}>
                <Layout>
                  <PowerBIDocumentation />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/powerbi-chat" element={
              <ProtectedRoute requiredRole={null} requiredMicrosoftRole={null}>
                <Layout fullWidth>
                  <PowerBIChat />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute requiredRole={null} requiredMicrosoftRole={null}>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute requiredRole={null} requiredMicrosoftRole={null}>
                <Layout>
                  <HelpPage />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
