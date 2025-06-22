import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, List, Divider, Tooltip, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faFolder, 
  faCircleQuestion, 
  faRightFromBracket, 
  faComment,
  faHeart
} from '@fortawesome/free-solid-svg-icons';
import { useAuth, ROLES } from '../../contexts/AuthContext';

const Sidebar = ({ open = false, toggleSidebar, onOpenFeedback }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const menuItems = [
    { text: 'Home', icon: <FontAwesomeIcon icon={faHome} size="lg" />, path: '/' },
    { text: 'Projects', icon: <FontAwesomeIcon icon={faFolder} size="lg" />, path: '/projects' },
    { text: 'Favorites', icon: <FontAwesomeIcon icon={faHeart} size="lg" />, path: '/favorites' },
    { text: 'Help', icon: <FontAwesomeIcon icon={faCircleQuestion} size="lg" />, path: '/help' },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return currentUser && item.roles.includes(currentUser.role);
  });

  const handleFeedbackClick = (e) => {
    e.preventDefault();
    if (onOpenFeedback) {
      onOpenFeedback();
    }
  };
  
  const handleLogout = (e) => {
    e.preventDefault();
    // In a real app, this would clear auth tokens, etc.
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 100 },
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: { xs: 'fixed', sm: 'static' },
        zIndex: { xs: 1200, sm: 1 },
        transform: { xs: open ? 'translateX(0)' : 'translateX(-100%)', sm: 'none' },
        transition: 'transform 0.3s ease-in-out',
        color: '#333',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(5px)',
        boxShadow: { xs: '2px 0 10px rgba(0,0,0,0.1)', sm: 'none' }
      }}
    >
      <Box 
        component={Link} 
        to="/"
        sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          mb: 2,
          textDecoration: 'none'
        }}
      >
        <Box
          component="img"
          src="/claribi-logo.svg"
          alt="Claribi Logo"
          sx={{ width: 32, height: 32, mb: 1 }}
        />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontFamily: "'Nunito Sans', sans-serif", 
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#000000'
          }}
        >
          claribi
        </Typography>
      </Box>

      <List 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2,
          p: 2
        }}
      >
        {filteredMenuItems.map((item) => (
          <Box 
            key={item.text} 
            component={Link} 
            to={item.path}
            sx={{ 
              textDecoration: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%',
              color: 'inherit',
              position: 'relative',
              '&:hover': {
                '& .menuIcon': {
                  color: '#FCC000'
                },
                '& .menuText': {
                  color: '#FCC000'
                }
              }
            }}
          >
            <Box 
              className="menuIcon"
              sx={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
                color: isActive(item.path) ? '#555555' : 'inherit',
                mb: 1,
                transition: 'color 0.2s ease'
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
      </List>

      <Divider sx={{ my: 2, mx: 'auto', width: '60%', bgcolor: 'rgba(0, 0, 0, 0.1)' }} />

      <List 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          p: 2,
          mb: 2
        }}
      >
        <Tooltip title="Leave Feedback" placement="right">
          <Box 
            component="a" 
            href="#" 
            onClick={handleFeedbackClick}
            sx={{ 
              textDecoration: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%',
              color: 'inherit',
              '&:hover': {
                '& .icon': {
                  color: '#FCC000'
                },
                '& .text': {
                  color: '#FCC000'
                }
              }
            }}
          >
            <Box 
              className="icon"
              sx={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                mb: 1,
                transition: 'color 0.2s ease'
              }}
            >
              <FontAwesomeIcon icon={faComment} size="lg" />
            </Box>
            <Typography 
              className="text"
              variant="caption" 
              sx={{ 
                fontFamily: "'Nunito Sans', sans-serif", 
                fontSize: '0.75rem',
                transition: 'color 0.2s ease'
              }}
            >
              Feedback
            </Typography>
          </Box>
        </Tooltip>

        <Tooltip title="Logout" placement="right">
          <Box 
            component="a" 
            href="#" 
            onClick={handleLogout}
            sx={{ 
              textDecoration: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%',
              color: 'inherit',
              '&:hover': {
                '& .icon': {
                  color: '#FCC000'
                },
                '& .text': {
                  color: '#FCC000'
                }
              }
            }}
          >
            <Box 
              className="icon"
              sx={{
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                mb: 1,
                transition: 'color 0.2s ease'
              }}
            >
              <FontAwesomeIcon icon={faRightFromBracket} size="lg" />
            </Box>
            <Typography 
              className="text"
              variant="caption" 
              sx={{ 
                fontFamily: "'Nunito Sans', sans-serif", 
                fontSize: '0.75rem',
                transition: 'color 0.2s ease'
              }}
            >
              Logout
            </Typography>
          </Box>
        </Tooltip>
      </List>
    </Box>
  );
};

export default Sidebar;