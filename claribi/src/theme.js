import { createTheme } from '@mui/material/styles';

const createAppTheme = (isDarkMode = false) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: isDarkMode ? '#FCC000' : '#555555',
      dark: isDarkMode ? '#E6B800' : '#333333',
      contrastText: isDarkMode ? '#000000' : '#ffffff',
    },
    secondary: {
      main: isDarkMode ? '#FCC000' : '#666666',
      dark: isDarkMode ? '#E6B800' : '#444444',
      contrastText: isDarkMode ? '#000000' : '#ffffff',
    },
    background: {
      default: isDarkMode ? '#121212' : '#EEEEEE',
      paper: isDarkMode ? '#1E1E1E' : '#ffffff',
      input: isDarkMode ? '#2A2A2A' : '#f5f5f5',
      hover: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      chat: isDarkMode ? '#141414' : '#ffffff',
    },
    text: {
      primary: isDarkMode ? '#FFFFFF' : '#1a1a1a',
      secondary: isDarkMode ? '#B0B0B0' : '#6b7280',
      disabled: isDarkMode ? '#666666' : '#9e9e9e',
    },
    divider: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#e9ecef',
    action: {
      hover: '#FCC000',
      selected: isDarkMode ? '#FCC000' : '#555555',
    },
    // Custom palette extensions
    sidebar: {
      background: isDarkMode ? '#1E1E1E' : '#f8f9fa',
      activeBackground: isDarkMode ? '#FCC000' : '#000000',
      activeText: isDarkMode ? '#000000' : '#FFFFFF',
      inactiveBackground: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      inactiveText: isDarkMode ? '#B0B0B0' : '#6b7280',
      hoverBackground: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      border: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#e9ecef',
    },
    tooltip: {
      background: isDarkMode ? '#1a1a1a' : '#1a1a1a',
      text: isDarkMode ? '#ffffff' : '#ffffff',
    },
    menu: {
      background: isDarkMode ? '#2A2A2A' : '#ffffff',
      hover: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      text: isDarkMode ? '#E0E0E0' : '#374151',
      icon: isDarkMode ? '#B0B0B0' : '#6b7280',
    },
    input: {
      border: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      focusBorder: isDarkMode ? '#B0B0B0' : '#555555',
    },
    code: {
      background: isDarkMode ? 'rgba(252, 192, 0, 0.2)' : 'rgba(85, 85, 85, 0.1)',
      text: isDarkMode ? '#FCC000' : '#555555',
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
    },
    caption: {
      fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
      fontWeight: 10,
      fontSize: '0.7rem',
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
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
        },
        contained: {
          '&:hover': {
            color: `${isDarkMode ? '#000000' : '#ffffff'} !important`
          }
        },
        outlined: {
          '&:hover': {
            color: '#FCC000 !important'
          }
        },
        text: {
          '&:hover': {
            color: '#FCC000 !important'
          }
        }
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: isDarkMode ? '#FCC000' : '#555555',
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
            color: isDarkMode ? '#FCC000' : '#555555',
          },
          '&.Mui-focusVisible': {
            backgroundColor: isDarkMode ? 'rgba(252, 192, 0, 0.1)' : 'rgba(85, 85, 85, 0.1)',
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
          backgroundColor: isDarkMode ? '#FCC000' : '#555555',
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
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: isDarkMode ? '#2A2A2A' : '#f5f5f5',
            color: isDarkMode ? '#E0E0E0' : 'inherit',
            '&:hover': {
              backgroundColor: isDarkMode ? '#2A2A2A' : '#f5f5f5',
              borderColor: isDarkMode ? 'rgba(252, 192, 0, 0.3)' : 'rgba(85, 85, 85, 0.3)',
            },
            '&.Mui-focused': {
              backgroundColor: isDarkMode ? '#2A2A2A' : '#ffffff',
              borderColor: isDarkMode ? '#B0B0B0' : '#555555',
            },
            '& .MuiInputBase-input::placeholder': {
              color: isDarkMode ? '#B0B0B0' : 'inherit',
              opacity: 1
            }
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#1a1a1a',
          color: isDarkMode ? '#ffffff' : '#ffffff',
          fontSize: '0.75rem',
          fontFamily: "'Nunito Sans', sans-serif",
          fontWeight: 500,
          borderRadius: 2,
          padding: '6px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: isDarkMode ? '#2A2A2A' : '#ffffff',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e9ecef',
          '& .MuiMenuItem-root': {
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            }
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          color: isDarkMode ? '#B0B0B0' : '#6b7280',
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#e9ecef',
        }
      }
    }
  },
});

// Export both the function and a default theme for backward compatibility
export { createAppTheme };
export default createAppTheme(false);