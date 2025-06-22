import React, { useState } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faSquare } from '@fortawesome/free-solid-svg-icons';

const [menuAnchorEl, setMenuAnchorEl] = useState(null);
const [activeTableMenu, setActiveTableMenu] = useState(null);

const handleMenuOpen = (event, section, tableName) => {
  event.stopPropagation();
  setMenuAnchorEl(event.currentTarget);
  setActiveTableMenu({ section, tableName });
};

const handleMenuClose = () => {
  setMenuAnchorEl(null);
};

const handleSelectAll = () => {
  const { section, tableName } = activeTableMenu;
  
  if (section === 'dimensions') {
    setDimensionsData(prev => ({
      ...prev,
      [tableName]: prev[tableName].map(col => ({ ...col, selected: true }))
    }));
  } else if (section === 'measures') {
    setMeasuresData(prev => ({
      ...prev,
      [tableName]: prev[tableName].map(col => ({ ...col, selected: true }))
    }));
  }
  
  handleMenuClose();
};

const handleDeselectAll = () => {
  const { section, tableName } = activeTableMenu;
  
  if (section === 'dimensions') {
    setDimensionsData(prev => ({
      ...prev,
      [tableName]: prev[tableName].map(col => ({ ...col, selected: false }))
    }));
  } else if (section === 'measures') {
    setMeasuresData(prev => ({
      ...prev,
      [tableName]: prev[tableName].map(col => ({ ...col, selected: false }))
    }));
  }
  
  handleMenuClose();
};

return (
  <>
    {/* Add this Menu component somewhere appropriate in your render function */}
    <Menu
      anchorEl={menuAnchorEl}
      open={Boolean(menuAnchorEl)}
      onClose={handleMenuClose}
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
          mt: 1.5,
          '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
          fontFamily: "'Nunito Sans', sans-serif"
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {/* Show Select All only if not all fields are selected */}
      {activeTableMenu.section && activeTableMenu.tableName && (
        (activeTableMenu.section === 'dimensions' && 
         dimensionsData[activeTableMenu.tableName] && 
         !dimensionsData[activeTableMenu.tableName].every(col => col.selected)) || 
        (activeTableMenu.section === 'measures' && 
         measuresData[activeTableMenu.tableName] && 
         !measuresData[activeTableMenu.tableName].every(col => col.selected))
      ) && (
        <MenuItem 
          onClick={handleSelectAll}
          sx={{
            '&:hover': { 
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              '& .MuiListItemIcon-root': { color: '#FCC000' },
              '& .MuiTypography-root': { color: '#FCC000' }
            }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <FontAwesomeIcon icon={faCheckSquare} size="sm" />
          </ListItemIcon>
          <ListItemText 
            primary="Select All Fields"
            primaryTypographyProps={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 500
            }}  
          />
        </MenuItem>
      )}
      
      {/* Show Deselect All only if any field is selected */}
      {activeTableMenu.section && activeTableMenu.tableName && (
        (activeTableMenu.section === 'dimensions' && 
         dimensionsData[activeTableMenu.tableName] && 
         dimensionsData[activeTableMenu.tableName].some(col => col.selected)) || 
        (activeTableMenu.section === 'measures' && 
         measuresData[activeTableMenu.tableName] && 
         measuresData[activeTableMenu.tableName].some(col => col.selected))
      ) && (
        <MenuItem 
          onClick={handleDeselectAll}
          sx={{
            '&:hover': { 
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              '& .MuiListItemIcon-root': { color: '#FCC000' },
              '& .MuiTypography-root': { color: '#FCC000' }
            }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <FontAwesomeIcon icon={faSquare} size="sm" />
          </ListItemIcon>
          <ListItemText 
            primary="Deselect All Fields"
            primaryTypographyProps={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 500
            }}  
          />
        </MenuItem>
      )}
    </Menu>
  </>
); 