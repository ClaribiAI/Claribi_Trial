import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Link,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { fetchGroupUrls, deleteUrl } from '../../store/slices/favoritesSlice';

const FavoriteUrlsList = () => {
  const dispatch = useDispatch();
  const { selectedGroup, urls, groups } = useSelector(state => state.favorites);
  const selectedGroupUrls = selectedGroup ? urls[selectedGroup] || [] : [];
  const selectedGroupName = selectedGroup
    ? groups.find(g => g.id === selectedGroup)?.name
    : '';

  useEffect(() => {
    if (selectedGroup) {
      dispatch(fetchGroupUrls(selectedGroup));
    }
  }, [dispatch, selectedGroup]);

  const handleDeleteUrl = async (urlId) => {
    if (window.confirm('Are you sure you want to delete this URL?')) {
      await dispatch(deleteUrl({ groupId: selectedGroup, urlId }));
    }
  };

  if (!selectedGroup) {
    return (
      <Typography variant="body1" color="textSecondary" sx={{ p: 2 }}>
        Select a group to view saved URLs
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {selectedGroupName} - URLs
      </Typography>

      <List>
        {selectedGroupUrls.map((url) => (
          <ListItem key={url.id}>
            <ListItemText
              primary={url.title}
              secondary={
                <Link
                  href={url.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  {url.url.substring(0, 50)}...
                  <OpenInNewIcon fontSize="small" />
                </Link>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDeleteUrl(url.id)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {selectedGroupUrls.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
            No URLs saved in this group yet
          </Typography>
        )}
      </List>
    </Box>
  );
};

export default FavoriteUrlsList; 