import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const Modal = ({ open, onClose, title, children, actions, maxWidth = 'sm', contentSx = {}, ...props }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: { xs: '95%', sm: '80%', md: 'auto' },
          maxWidth: { xs: '95%', sm: maxWidth },
          m: { xs: 1, sm: 'auto' },
          borderRadius: '16px'
        }
      }}
      {...props}
    >
      <DialogTitle sx={{ fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif", fontWeight: 'normal' }}>
        {title}
        {onClose && (
          <IconButton
            aria-label="close"
            onClick={onClose}
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
            <FontAwesomeIcon icon={faXmark} size="sm" />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ fontFamily: "'Nunito Sans', sans-serif", ...contentSx }}>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
};

export default Modal;