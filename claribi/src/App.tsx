import { FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Layout from './components/layout/Layout';
import { NotificationProvider } from './contexts/NotificationContext';
import { FileProvider } from './contexts/FileContext';
import { useTheme } from './contexts/ThemeContext';
import { createAppTheme } from './theme.js';
import PowerBIDiagnostics from './pages/powerbi-diagnostics';
import './App.css';

const AppContent: FC = () => {
  const { isDarkMode } = useTheme();
  const theme = createAppTheme(isDarkMode);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/powerbi-diagnostics" replace />} />
          <Route path="/powerbi-diagnostics" element={
            <Layout fullWidth>
              <PowerBIDiagnostics />
            </Layout>
          } />
          {/* Catch-all route redirects to diagnostics */}
          <Route path="*" element={<Navigate to="/powerbi-diagnostics" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

const App: FC = () => {
  return (
    <NotificationProvider>
      <FileProvider>
        <AppContent />
      </FileProvider>
    </NotificationProvider>
  );
}

export default App;
