import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  List, 
  Divider, 
  Tooltip, 
  Typography, 
  Paper,
  ListItem,
  ListItemText,
  ListItemIcon,
  Popper,
  Fade,
  ClickAwayListener,
  Chip,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  useTheme
} from '@mui/material';
import { 
  House, 
  Folder, 
  Question, 
  SignOut, 
  Star,
  Clock,
  Eye,
  Gear,
  User,
  ChatCircle,
  Bell,
  Plus,
  Files,
  Sun,
  Moon
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';

const Sidebar = ({ open = false, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  
  // State for user menu
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  const menuItems = [
    { text: 'Home', icon: <House size={20} />, path: '/' },
    { text: 'Docs', icon: <Files size={20} />, path: '/powerbi-docs' },
    { text: 'Chat', icon: <ChatCircle size={20} />, path: '/powerbi-chat' },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return currentUser && item.roles.includes(currentUser.role);
  });
  
  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setUserMenuAnchorEl(null);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    // For exact matches, use exact equality
    if (path === '/powerbi-docs' || path === '/powerbi-chat') {
      return location.pathname === path;
    }
    // For other paths, use startsWith
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      className="sidebar-container"
      sx={{
        width: { xs: '100%', sm: 80 },
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        position: { xs: 'fixed', sm: 'static' },
        zIndex: { xs: 1200, sm: 1 },
        transform: { xs: open ? 'translateX(0)' : 'translateX(-100%)', sm: 'none' },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.sidebar.background,
        boxShadow: { 
          xs: '0 8px 32px rgba(0,0,0,0.12)', 
          sm: '0 0 0 1px rgba(0,0,0,0.05)' 
        },
        backdropFilter: { xs: 'blur(20px)', sm: 'none' },
      }}
    >
      <Box 
        component={Link} 
        to="/"
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textDecoration: 'none',
          mb: 4,
          p: 2,
          borderRadius: 3,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            transform: 'translateY(-2px)',
          }
        }}
      >
        <Box
          component="img"
          src={isDarkMode ? '/claribi_icon_logo_dark.png' : '/claribi_icon_logo_light.png'}
          alt="Claribi Logo"
          sx={{ 
            width: 36, 
            height: 36, 
            mb: 1,
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.08)'
            }
          }}
        />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: theme.palette.text.primary,
            letterSpacing: '0.3px',
            textTransform: 'uppercase'
          }}
        >
          claribi
        </Typography>
      </Box>

      <Box 
        sx={{
          flexGrow: 1,
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <Box sx={{ mt: 2 }} />
        <Box 
          sx={{
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 0.5,
            width: '100%',
            px: 1.5,
          }}
        >
          {filteredMenuItems.map((item) => (
            <Tooltip 
              key={item.text}
              title={item.text}
              placement="right"
              arrow
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: theme.palette.tooltip.background,
                    color: theme.palette.tooltip.text,
                    fontSize: '0.75rem',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.75,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }
                }
              }}
            >
              <Box 
            component={Link}
                to={item.path}
                onClick={() => toggleSidebar && toggleSidebar()}
            sx={{ 
              textDecoration: 'none', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
              width: '100%',
              color: 'inherit',
              cursor: 'pointer',
                  p: 1,
                  borderRadius: 3,
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: theme.palette.sidebar.hoverBackground,
                    transform: 'translateY(-1px)',
                    '& .menuIcon': {
                      color: isActive(item.path) ? theme.palette.sidebar.activeText : theme.palette.text.primary,
                      transform: 'scale(1.05)',
                    },
                  },
                  '&:active': {
                    transform: 'translateY(0)',
              }
            }}
          >
            <Box 
              className="menuIcon"
              sx={{
                    width: 44,
                    height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                    borderRadius: 3,
                    backgroundColor: isActive(item.path) ? theme.palette.sidebar.activeBackground : theme.palette.sidebar.inactiveBackground,
                    color: isActive(item.path) ? theme.palette.sidebar.activeText : theme.palette.sidebar.inactiveText,
                    mb: 0,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive(item.path) ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
                    '&:hover': {
                      boxShadow: isActive(item.path) ? '0 6px 20px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0,0,0,0.12)',
                    }
              }}
            >
                  {item.icon}
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>

      <Divider 
        sx={{ 
          my: 3, 
          width: '60%',
          borderColor: theme.palette.sidebar.border,
          '&::before, &::after': {
            borderColor: theme.palette.sidebar.border,
          }
        }} 
      />

      <List 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          padding: 0,
          width: '100%',
          px: 1.5,
        }}
      >
        {/* Theme Toggle Button */}
        <Tooltip 
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.tooltip.background,
                color: theme.palette.tooltip.text,
                fontSize: '0.75rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }
            }
          }}
        >
          <Box 
            onClick={toggleTheme}
            sx={{ 
              textDecoration: 'none', 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              color: 'inherit',
              cursor: 'pointer',
              p: 1,
              borderRadius: 3,
              position: 'relative',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: theme.palette.sidebar.hoverBackground,
                transform: 'translateY(-1px)',
                '& .themeIcon': {
                  color: theme.palette.text.primary,
                  transform: 'scale(1.05)',
                },
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            <Box 
              className="themeIcon"
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                color: theme.palette.sidebar.inactiveText,
                mb: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: theme.palette.sidebar.inactiveBackground,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }
              }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Box>
          </Box>
        </Tooltip>

        <Tooltip 
          title="Help & Support"
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.tooltip.background,
                color: theme.palette.tooltip.text,
                fontSize: '0.75rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }
            }
          }}
        >
              <Box
          component={Link} 
          to="/help"
          sx={{ 
            textDecoration: 'none', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
            width: '100%',
            color: 'inherit',
              p: 1.5,
              borderRadius: 3,
              position: 'relative',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                backgroundColor: theme.palette.sidebar.hoverBackground,
                transform: 'translateY(-1px)',
                '& .icon': {
                  color: isActive('/help') ? theme.palette.sidebar.activeText : theme.palette.text.primary,
                  transform: 'scale(1.05)',
                },
              },
              '&:active': {
                transform: 'translateY(0)',
            }
          }}
        >
          <Box 
            className="icon"
            sx={{
                width: 44,
                height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                borderRadius: 3,
                backgroundColor: isActive('/help') ? theme.palette.sidebar.activeBackground : theme.palette.sidebar.inactiveBackground,
                color: isActive('/help') ? theme.palette.sidebar.activeText : theme.palette.sidebar.inactiveText,
                mb: 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive('/help') ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
                '&:hover': {
                  boxShadow: isActive('/help') ? '0 6px 20px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0,0,0,0.12)',
                }
            }}
          >
            <Question size={20} />
                </Box>
              </Box>
        </Tooltip>


        <Tooltip 
          title={currentUser?.email || "User Menu"}
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.tooltip.background,
                color: theme.palette.tooltip.text,
                fontSize: '0.75rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }
            }
          }}
        >
        <Box 
          component="button" 
          onClick={handleUserMenuOpen}
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            width: '100%',
            color: 'inherit',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
              p: 1.5,
              borderRadius: 3,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
                backgroundColor: theme.palette.sidebar.hoverBackground,
                transform: 'translateY(-1px)',
                '& .icon': {
                  color: theme.palette.text.primary,
                  transform: 'scale(1.05)',
                },
              },
              '&:active': {
                transform: 'translateY(0)',
            }
          }}
        >
          <Box 
            className="icon"
            sx={{
                width: 44,
                height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                borderRadius: 3,
                color: theme.palette.sidebar.inactiveText,
                mb: 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: theme.palette.sidebar.inactiveBackground,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }
            }}
          >
            <User size={20} />
          </Box>
        </Box>
        </Tooltip>
        
        <Menu
          anchorEl={userMenuAnchorEl}
          open={Boolean(userMenuAnchorEl)}
          onClose={handleUserMenuClose}
          onClick={(e) => e.stopPropagation()}
          slotProps={{
            paper: {
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.12))',
                mt: 1.5,
                borderRadius: 3,
                minWidth: 180,
                border: `1px solid ${theme.palette.divider}`,
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: 12,
                  height: 12,
                  bgcolor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRight: 'none',
                  borderBottom: 'none',
                  transform: 'translateY(-50%) translateX(-50%) rotate(45deg)',
                  zIndex: 0,
                },
                fontFamily: "'Inter', sans-serif",
                backgroundColor: theme.palette.menu.background,
              },
            }
          }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem 
            onClick={() => {
              navigate('/settings');
              handleUserMenuClose();
            }}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': { 
                backgroundColor: theme.palette.menu.hover,
                '& .MuiListItemIcon-root': { color: theme.palette.menu.icon },
                '& .MuiTypography-root': { color: theme.palette.menu.text }
              }
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.menu.icon, minWidth: 36 }}>
              <Gear size={18} />
            </ListItemIcon>
            <ListItemText 
              primary="Settings"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '0.875rem',
                color: theme.palette.menu.text
              }}
            />
          </MenuItem>
          
          <MenuItem 
            onClick={handleLogout}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': { 
                backgroundColor: theme.palette.menu.hover,
                '& .MuiListItemIcon-root': { color: theme.palette.menu.icon },
                '& .MuiTypography-root': { color: theme.palette.menu.text }
              }
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.menu.icon, minWidth: 36 }}>
              <SignOut size={18} />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '0.875rem',
                color: theme.palette.menu.text
              }}
            />
          </MenuItem>
        </Menu>
      </List>
    </Box>
  );
};

export default Sidebar;