import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import { ThemeProvider as CustomThemeProvider } from './contexts/ThemeContext'
import './index.css'

const AppWithTheme = () => {
  return (
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CssBaseline />
    <AppWithTheme />
  </React.StrictMode>,
)
