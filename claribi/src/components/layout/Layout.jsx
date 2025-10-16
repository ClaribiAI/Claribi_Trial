import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme, IconButton } from '@mui/material';
import { List } from '@phosphor-icons/react';
import Sidebar from './Sidebar';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';

const Layout = ({ children, fullWidth = false }) => {
  const theme = useTheme();
  const { isDarkMode } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      overflow: 'hidden', 
      position: 'relative',
      bgcolor: theme.palette.background.default
    }}>

      <Box 
        component="aside"
        sx={{
          flexShrink: 0,
          display: {
            xs: sidebarOpen ? 'block' : 'none',
            sm: 'block'
          }
        }}
      >
        <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />
      </Box>

      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          position: 'relative',
          ml: 0,
          pl: 0,
        }}
      >
        <Box sx={{ 
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1250,
        }}>
          {isMobile && (
            <IconButton 
              edge="start" 
              color="inherit" 
              aria-label="menu"
              onClick={toggleSidebar}
              sx={{ 
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.paper,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
                '&:hover': {
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              <List size={20} />
            </IconButton>
          )}
        </Box>

        <Box 
          sx={{ 
            flexGrow: 1,
            overflow: 'auto',
            width: '100%',
            height: '100%',
            background: theme.palette.background.default,
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0,
          }}
        >
          {fullWidth ? (
            // Full width layout
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
              padding: 0,
              bgcolor: theme.palette.background.default
            }}>
              {children}
            </Box>
          ) : (
            // Constrained layout for other pages
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              p: { xs: 3, sm: 4, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              maxWidth: '1400px',
              mx: 'auto',
              bgcolor: theme.palette.background.default
            }}>
              {children}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;