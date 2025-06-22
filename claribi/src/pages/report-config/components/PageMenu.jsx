import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

const PageMenu = ({ anchorEl, open, onClose, onEdit, onDelete }) => (
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
    <MenuItem onClick={onEdit}>
      <ListItemIcon>
        <EditRoundedIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit</ListItemText>
    </MenuItem>
    <MenuItem onClick={onDelete}>
      <ListItemIcon>
        <DeleteRoundedIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete</ListItemText>
    </MenuItem>
  </Menu>
);

export default PageMenu; 