import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

const UnsavedChangesModal = ({ open, onSaveAndProceed, onProceedWithoutSaving, onCancel, saving }) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: { xs: '95%', sm: '80%', md: 'auto' },
          maxWidth: { xs: '95%', sm: '500px' },
          m: { xs: 1, sm: 'auto' },
          borderRadius: '16px'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
          pr: 6,
          fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
          fontWeight: 'normal'
        }}
      >
        <WarningIcon sx={{ color: '#f44336' }} />
        Unsaved Changes
        <IconButton
          aria-label="close"
          onClick={onCancel}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
            width: 32,
            height: 32
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ fontFamily: "'Nunito Sans', sans-serif", p: 3 }}>
        <Typography
          sx={{
            fontFamily: "'Nunito Sans', sans-serif",
            color: '#555555',
            mb: 2
          }}
        >
          You have unsaved changes. What would you like to do?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            color: '#555555',
            borderColor: 'rgba(0,0,0,0.2)',
            textTransform: 'none',
            fontFamily: "'Nunito Sans', sans-serif",
            '&:hover': {
              borderColor: 'rgba(0,0,0,0.4)',
              backgroundColor: 'rgba(0,0,0,0.02)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onProceedWithoutSaving}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            color: '#d32f2f',
            borderColor: 'rgba(211, 47, 47, 0.5)',
            textTransform: 'none',
            fontFamily: "'Nunito Sans', sans-serif",
            '&:hover': {
              borderColor: '#d32f2f',
              backgroundColor: 'rgba(211, 47, 47, 0.04)',
            },
          }}
        >
          Proceed without Saving
        </Button>
        <Button
          onClick={onSaveAndProceed}
          variant="contained"
          disabled={saving}
          sx={{
            borderRadius: '8px',
            backgroundColor: '#4caf50',
            textTransform: 'none',
            fontFamily: "'Nunito Sans', sans-serif",
            '&:hover': {
              backgroundColor: '#388e3c',
            },
          }}
        >
          {saving ? 'Saving...' : 'Save & Proceed'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

UnsavedChangesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onSaveAndProceed: PropTypes.func.isRequired,
  onProceedWithoutSaving: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

UnsavedChangesModal.defaultProps = {
  saving: false,
};

export default UnsavedChangesModal; 