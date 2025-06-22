import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/home';
import ProjectsPage from './pages/projects';
import ProjectDetailPage from './pages/project-detail';
import ReportConfigPage from './pages/report-config';
import SettingsPage from './pages/settings';
import HelpPage from './pages/help';
import LoginPage from './pages/login';
import FavoritesPage from './pages/favorites/FavoritesPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SharedProjectHandler from './components/projects/SharedProjectHandler';
import { ROLES } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <HomePage />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId" element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetailPage />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/reports/:reportId" element={
                <ProtectedRoute>
                  <Layout>
                    <ReportConfigPage />
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
              <Route path="/favorites" element={
                <ProtectedRoute>
                  <Layout>
                    <FavoritesPage />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/shared-project/:token" element={<SharedProjectHandler />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App; 