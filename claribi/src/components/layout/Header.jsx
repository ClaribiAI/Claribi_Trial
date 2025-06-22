import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, IconButton, Badge, Box, 
  useMediaQuery, useTheme, Tooltip, 
  Menu, MenuItem, Typography, Avatar
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faGear, faBars, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import RoleSwitcher from '../auth/RoleSwitcher';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ toggleSidebar }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [activeButton, setActiveButton] = useState(null);
  const { currentUser, logout } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleSettingsClick = () => {
    navigate('/settings');
    setActiveButton(null);
  };

  const handleBellClick = () => {
    setActiveButton(activeButton === 'bell' ? null : 'bell');
  };

  const handleSettingsHover = () => {
    setActiveButton('settings');
  };

  const handleBellHover = () => {
    setActiveButton('bell');
  };

  const handleMouseLeave = () => {
    setActiveButton(null);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/settings');
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center',
        padding: '4px 0'
      }}
    >
      {isMobile && (
        <IconButton 
          edge="start" 
          color="inherit" 
          aria-label="menu"
          onClick={toggleSidebar}
          sx={{ mr: 'auto' }}
        >
          <FontAwesomeIcon icon={faBars} size="lg" />
        </IconButton>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          size="large" 
          onClick={handleBellClick}
          onMouseEnter={handleBellHover}
          onMouseLeave={handleMouseLeave}
          sx={{ 
            backgroundColor: activeButton === 'bell' ? 'white' : 'transparent',
            '&:hover': { 
              backgroundColor: 'white',
              color: '#FCC000'
            },
            borderRadius: '50%',
            width: 42,
            height: 42,
            color: activeButton === 'bell' ? '#555555' : '#333',
            transition: 'all 0.2s'
          }}
        >
          <Badge 
            badgeContent={4} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                boxShadow: '0 0 0 2px ' + (activeButton === 'bell' ? 'white' : '#f0f0f0'),
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600
              }
            }}
          >
            <FontAwesomeIcon icon={faBell} />
          </Badge>
        </IconButton>
        
        {/* Role Switcher */}
        <RoleSwitcher />
        
        <Tooltip title="Settings">
          <IconButton 
            size="large" 
            onClick={handleSettingsClick}
            onMouseEnter={handleSettingsHover}
            onMouseLeave={handleMouseLeave}
            sx={{ 
              backgroundColor: activeButton === 'settings' ? 'white' : 'transparent',
              '&:hover': { 
                backgroundColor: 'white',
                color: '#FCC000'
              },
              borderRadius: '50%',
              width: 42,
              height: 42,
              color: activeButton === 'settings' ? '#555555' : '#333',
              transition: 'all 0.2s'
            }}
          >
            <FontAwesomeIcon icon={faGear} />
          </IconButton>
        </Tooltip>

        {/* User Avatar and Menu */}
        <Tooltip title={currentUser?.username || 'User'}>
          <IconButton
            onClick={handleUserMenuOpen}
            sx={{
              ml: 1,
              bgcolor: '#f0f0f0',
              '&:hover': { bgcolor: '#e0e0e0' },
              width: 42,
              height: 42,
            }}
          >
            <Avatar 
              alt={currentUser?.username || 'User'} 
              sx={{ width: 38, height: 38, bgcolor: theme.palette.primary.main }}
            >
              {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleProfile}>
            <FontAwesomeIcon icon={faUser} style={{ marginRight: 8 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: 8 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Header;