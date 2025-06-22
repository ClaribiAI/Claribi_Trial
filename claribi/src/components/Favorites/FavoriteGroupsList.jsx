import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  fetchFavoriteGroups,
  createFavoriteGroup,
  updateFavoriteGroup,
  deleteFavoriteGroup,
  setSelectedGroup
} from '../../store/slices/favoritesSlice';

const FavoriteGroupsList = () => {
  const dispatch = useDispatch();
  const { groups, selectedGroup, loading } = useSelector(state => state.favorites);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    dispatch(fetchFavoriteGroups());
  }, [dispatch]);

  const handleCreateGroup = async () => {
    if (groupName.trim()) {
      await dispatch(createFavoriteGroup(groupName.trim()));
      setGroupName('');
      setIsCreateModalOpen(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (groupName.trim() && editingGroup) {
      await dispatch(updateFavoriteGroup({
        groupId: editingGroup.id,
        name: groupName.trim()
      }));
      setGroupName('');
      setEditingGroup(null);
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      await dispatch(deleteFavoriteGroup(groupId));
    }
  };

  const handleEditClick = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setIsEditModalOpen(true);
  };

  const handleGroupSelect = (groupId) => {
    dispatch(setSelectedGroup(groupId));
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Favorite Groups</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
          variant="outlined"
          size="small"
        >
          New Group
        </Button>
      </Box>

      <List>
        {groups.map((group) => (
          <ListItem
            key={group.id}
            button
            selected={selectedGroup === group.id}
            onClick={() => handleGroupSelect(group.id)}
          >
            <ListItemText
              primary={group.name}
              secondary={`${group.urls_count || 0} URLs`}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="edit"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(group);
                }}
                size="small"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group.id);
                }}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Create Group Modal */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Modal */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateGroup} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FavoriteGroupsList; 