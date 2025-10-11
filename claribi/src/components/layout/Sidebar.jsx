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
  Avatar
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
  ChatCircle
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ open = false, toggleSidebar, onOpenFeedback }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  // State for user menu
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  const menuItems = [
    { text: 'Home', icon: <House size={20} />, path: '/powerbi' },
    { text: 'Power BI Chat', icon: <ChatCircle size={20} />, path: '/powerbi-chat' },
    { text: 'Settings', icon: <Gear size={20} />, path: '/settings' },
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
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      className="sidebar-container"
      sx={{
        width: { xs: '100%', sm: 60 },
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        position: { xs: 'fixed', sm: 'static' },
        zIndex: { xs: 1200, sm: 1 },
        transform: { xs: open ? 'translateX(0)' : 'translateX(-100%)', sm: 'none' },
        transition: 'transform 0.3s ease-in-out',
        color: '#333',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        boxShadow: { xs: '2px 0 10px rgba(0,0,0,0.1)', sm: 'none' },
      }}
    >
      <Box 
        component={Link} 
        to="/"
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textDecoration: 'none'
        }}
      >
        <Box
          component="img"
          src="/claribi-logo.svg"
          alt="Claribi Logo"
          sx={{ width: 26, height: 26, mb: 0.5 }}
        />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontFamily: "'Nunito Sans', sans-serif", 
            fontWeight: 600,
            fontSize: '0.65rem',
            color: '#000000'
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
        <Box sx={{ mt: 5 }} />
        <Box 
          sx={{
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 3,
            width: '100%',
          }}
        >
          {filteredMenuItems.map((item) => (
          <Box 
              key={item.text} 
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
                  '&:hover': {
                '& .menuIcon, & .menuText': {
                  color: '#FCC000'
                }
              }
            }}
          >
            <Box 
              className="menuIcon"
              sx={{
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
                color: isActive(item.path) ? '#555555' : 'inherit',
                mb: 0.5,
                transition: 'color 0.2s ease, background-color 0.2s ease'
              }}
            >
                  {item.icon}
                </Box>
                <Typography 
              className="menuText"
                  variant="caption" 
                  sx={{ 
                fontFamily: "'Nunito Sans', sans-serif", 
                fontSize: '0.75rem',
                fontWeight: isActive(item.path) ? 600 : 400,
                color: isActive(item.path) ? '#555555' : 'inherit',
                transition: 'color 0.2s ease'
                  }}
                >
                  {item.text}
                </Typography>
              </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 1, width: '60%' }} />

      <List 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
          padding: 0,
          width: '100%',
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
                  '&:hover': {
              '& .icon, & .text': {
                color: '#FCC000'
              }
            }
          }}
        >
          <Box 
            className="icon"
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: isActive('/help') ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
              color: isActive('/help') ? '#555555' : 'inherit',
              mb: 0.5,
              transition: 'color 0.2s ease, background-color 0.2s ease'
            }}
          >
            <Question size={20} />
                </Box>
                <Typography 
            className="text"
                  variant="caption" 
                  sx={{ 
              fontFamily: "'Nunito Sans', sans-serif", 
              fontSize: '0.7rem',
              fontWeight: isActive('/help') ? 600 : 400,
              color: isActive('/help') ? '#555555' : 'inherit',
              transition: 'color 0.2s ease'
                  }}
                >
            Help
                </Typography>
              </Box>

        {onOpenFeedback && (
          <Box 
            component="button" 
            onClick={(e) => {
              e.preventDefault();
              if (onOpenFeedback) {
                onOpenFeedback();
              }
            }}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%',
              color: 'inherit',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              '&:hover': {
                backgroundColor: 'transparent',
                '& .icon, & .text': {
                  color: '#FCC000'
                }
              }
            }}
          >
            <Box
              className="icon"
              sx={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                color: 'inherit',
                mb: 0.5,
                transition: 'color 0.2s ease'
              }}
            >
              <Question size={20} />
              </Box>
              <Typography 
              className="text"
                variant="caption" 
                sx={{ 
                fontFamily: "'Nunito Sans', sans-serif", 
                fontSize: '0.7rem',
                fontWeight: 400,
                color: 'inherit',
                transition: 'color 0.2s ease'
                }}
              >
              Feedback
              </Typography>
            </Box>
        )}

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
            padding: 0,
            '&:hover': {
              backgroundColor: 'transparent',
              '& .icon, & .text': {
                color: '#FCC000'
              }
            }
          }}
        >
          <Box 
            className="icon"
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: 'inherit',
              mb: 0.5,
              transition: 'color 0.2s ease'
            }}
          >
            <User size={20} />
          </Box>
          <Typography 
            className="text"
            variant="caption" 
            sx={{ 
              fontFamily: "'Nunito Sans', sans-serif", 
              fontSize: '0.7rem',
              fontWeight: 400,
              color: 'inherit',
              transition: 'color 0.2s ease'
            }}
          >
            User
          </Typography>
        </Box>
        
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
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                mt: 1.5,
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) translateX(-50%) rotate(45deg)',
                  zIndex: 0,
                },
                fontFamily: "'Inter', sans-serif"
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
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#FCC000' },
                '& .MuiTypography-root': { color: '#FCC000' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <Gear size={16} />
            </ListItemIcon>
            <ListItemText 
              primary="Settings"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500
              }}
            />
          </MenuItem>
          
          <MenuItem 
            onClick={handleLogout}
            sx={{
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#FCC000' },
                '& .MuiListItemText-root': { color: '#FCC000' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <SignOut size={16} />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500
              }}
            />
          </MenuItem>
        </Menu>
      </List>
    </Box>
  );
};

export default Sidebar;