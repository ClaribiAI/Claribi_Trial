import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const ConflictModal = ({ open, conflictInfo, onConfirm, onCancel }) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxWidth: 500,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Nunito Sans", sans-serif',
          color: '#555555',
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <WarningIcon sx={{ color: '#ff9800' }} />
        File Upload Conflicts
      </DialogTitle>
      <DialogContent>
        <Typography
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            color: '#555555',
            mb: 2,
          }}
        >
          The following tables already exist in the configuration:
        </Typography>
        <List>
          {conflictInfo?.conflicting_tables?.map((table) => (
            <ListItem key={table} sx={{ py: 0.5 }}>
              <ListItemText
                primary={table}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontFamily: '"Nunito Sans", sans-serif',
                    color: '#555555',
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
        <Typography
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            color: '#555555',
            mt: 2,
          }}
        >
          Do you want to overwrite the existing tables with the new data?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={onCancel}
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            color: '#555555',
            '&:hover': {
              backgroundColor: 'rgba(85, 85, 85, 0.04)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            backgroundColor: '#d32f2f',
            '&:hover': {
              backgroundColor: '#b71c1c',
            },
          }}
        >
          Overwrite
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ConflictModal.propTypes = {
  open: PropTypes.bool.isRequired,
  conflictInfo: PropTypes.shape({
    conflicting_tables: PropTypes.arrayOf(PropTypes.string),
  }),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

ConflictModal.defaultProps = {
  conflictInfo: {
    conflicting_tables: [],
  },
};

export default ConflictModal; 