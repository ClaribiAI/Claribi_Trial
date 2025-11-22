import { FC } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Layout from './components/layout/Layout';
import SettingsPage from './pages/settings';
import HelpPage from './pages/help';
import LoginWrapper from './components/auth/LoginWrapper';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { FileProvider } from './contexts/FileContext';
import { useTheme } from './contexts/ThemeContext';
import { createAppTheme } from './theme.js';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PowerBIDocumentation from './pages/powerbi-docs';
import PowerBIChat from './pages/powerbi-chat';
import PowerBIDiagnostics from './pages/powerbi-diagnostics';
import Home from './pages/home';
import NotFound from './pages/not-found';
import './App.css';

const AppContent: FC = () => {
  const { isDarkMode } = useTheme();
  const theme = createAppTheme(isDarkMode);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout fullWidth>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/powerbi-docs" element={
            <ProtectedRoute>
              <Layout fullWidth>
                <PowerBIDocumentation />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/powerbi-chat" element={
            <ProtectedRoute>
              <Layout fullWidth>
                <PowerBIChat />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/powerbi-diagnostics" element={
            <ProtectedRoute>
              <Layout fullWidth>
                <PowerBIDiagnostics />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute>
              <Layout>
                <HelpPage />
              </Layout>
            </ProtectedRoute>
          } />
          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={
            <Layout>
              <NotFound />
            </Layout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

const App: FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <FileProvider>
          <AppContent />
        </FileProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
