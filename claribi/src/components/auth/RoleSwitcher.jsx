import React from 'react';
import { IconButton, Tooltip, Badge } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserGear } from '@fortawesome/free-solid-svg-icons';
import { useAuth, ROLES } from '../../contexts/AuthContext';

const RoleSwitcher = () => {
  const { currentUser, toggleRole } = useAuth();
  
  return (
    <Tooltip title={`Switch to ${currentUser.role === ROLES.DATA_ANALYST ? 'User' : 'Data Analyst'} View`}>
      <IconButton
        size="large"
        onClick={toggleRole}
        sx={{
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'white',
            color: '#FCC000'
          },
          borderRadius: '50%',
          width: 42,
          height: 42,
          color: '#333',
          transition: 'all 0.2s'
        }}
      >
        <Badge
          badgeContent={currentUser.role === ROLES.DATA_ANALYST ? 'DA' : 'U'}
          color={currentUser.role === ROLES.DATA_ANALYST ? 'primary' : 'secondary'}
          sx={{
            '& .MuiBadge-badge': {
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.6rem'
            }
          }}
        >
          <FontAwesomeIcon icon={faUserGear} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default RoleSwitcher; 