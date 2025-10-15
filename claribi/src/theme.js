import { createTheme } from '@mui/material/styles';

const createAppTheme = (isDarkMode = false) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: isDarkMode ? '#FCC000' : '#555555',
      light: isDarkMode ? '#FFD700' : '#777777',
      dark: isDarkMode ? '#E6B800' : '#333333',
      contrastText: isDarkMode ? '#000000' : '#ffffff',
    },
    secondary: {
      main: isDarkMode ? '#FCC000' : '#666666',
      light: isDarkMode ? '#FFD700' : '#999999',
      dark: isDarkMode ? '#E6B800' : '#444444',
      contrastText: isDarkMode ? '#000000' : '#ffffff',
    },
    black: {
      main: isDarkMode ? '#FCC000' : '#000000',
      light: isDarkMode ? '#FFD700' : '#333333',
      dark: isDarkMode ? '#E6B800' : '#000000',
      contrastText: isDarkMode ? '#000000' : '#ffffff',
    },
    background: {
      default: isDarkMode ? '#121212' : '#EEEEEE',
      paper: isDarkMode ? '#1E1E1E' : '#ffffff',
      sidebar: isDarkMode ? 'rgba(18, 18, 18, 0.95)' : 'transparent',
      content: isDarkMode ? '#1E1E1E' : 'transparent',
    },
    text: {
      primary: isDarkMode ? '#FFFFFF' : '#212121',
      secondary: isDarkMode ? '#B0B0B0' : '#616161',
      disabled: isDarkMode ? '#666666' : '#9e9e9e',
      hint: isDarkMode ? '#666666' : '#9e9e9e',
    },
    action: {
      hover: '#FCC000'
    }
  },
  typography: {
    fontFamily: "'Nunito Sans', system-ui, -apple-system, sans-serif",
    h1: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    h2: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    h3: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    h4: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    h5: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    h6: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 'normal',
    },
    subtitle1: {
      fontFamily: "'Nunito Sans', sans-serif",
      fontWeight: 600,
    },
    button: {
      fontFamily: "'Nunito Sans', sans-serif",
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  palette: {
    primary: {
      main: '#555555',
      light: '#777777',
      dark: '#333333',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666',
      light: '#999999',
      dark: '#444444',
      contrastText: '#ffffff',
    },
    black: {
      main: '#000000',
      light: '#333333',
      dark: '#000000',
      contrastText: '#ffffff',
    },
    background: {
      default: '#EEEEEE',
      paper: '#ffffff',
      sidebar: 'transparent',
      content: 'transparent',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
      disabled: '#9e9e9e',
      hint: '#9e9e9e',
    },
    action: {
      hover: '#FCC000'
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          height: '100%',
          width: '100%',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          '&:hover': {
            color: '#FCC000'
          }
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#555555',
          '&:hover': {
            color: '#FCC000',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#555555',
          },
          '&.Mui-focusVisible': {
            backgroundColor: 'rgba(85, 85, 85, 0.1)',
          },
          '&:hover': {
            color: '#FCC000'
          }
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#555555',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.08) !important' 
              : 'rgba(238, 238, 238, 0.7) !important',
          }
        }
      }
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: isDarkMode ? '#FCC000' : '#555555',
          '&.Mui-checked': {
            color: isDarkMode ? '#FCC000' : '#555555',
          }
        }
      }
    }
  },
});

// Export both the function and a default theme for backward compatibility
export { createAppTheme };
export default createAppTheme(false);