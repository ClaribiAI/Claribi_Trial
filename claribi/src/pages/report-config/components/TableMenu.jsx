import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

const TableMenu = ({ 
  anchorEl, 
  onClose, 
  onFormat, 
  onDelete,
  showFormat = true,
  showDelete = true 
}) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
  >
    {showFormat && (
      <MenuItem onClick={onFormat}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Format</ListItemText>
      </MenuItem>
    )}
    {showDelete && (
      <MenuItem onClick={onDelete}>
        <ListItemIcon>
          <DeleteRoundedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    )}
  </Menu>
);

export default TableMenu; 