import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, IconButton, Skeleton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Header = ({ project, report, loading, onBackClick }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <IconButton
        onClick={onBackClick}
        sx={{
          color: '#555555',
          '&:hover': {
            backgroundColor: 'rgba(85, 85, 85, 0.04)',
          },
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Box>
        {loading ? (
          <>
            <Skeleton width={200} height={32} />
            <Skeleton width={150} height={24} />
          </>
        ) : (
          <>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Nunito Sans", sans-serif',
                fontWeight: 600,
                color: '#555555',
              }}
            >
              {project?.name || 'Project'}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: '"Nunito Sans", sans-serif',
                color: '#6a1b9a',
              }}
            >
              {report?.name || 'Report Configuration'}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

Header.propTypes = {
  project: PropTypes.shape({
    name: PropTypes.string,
  }),
  report: PropTypes.shape({
    name: PropTypes.string,
  }),
  loading: PropTypes.bool,
  onBackClick: PropTypes.func.isRequired,
};

Header.defaultProps = {
  project: null,
  report: null,
  loading: false,
};

export default Header; 