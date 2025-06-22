import React from 'react';
import PropTypes from 'prop-types';
import { Box, Stepper, Step, StepLabel, Button } from '@mui/material';

const steps = [
  'Field Selection',
  'Synonym Management',
  'Report URL',
  'Query Assistant',
];

const StepNavigation = ({ activeStep, onStepChange, onPreviousStep, onNextStep }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step
            key={label}
            onClick={() => onStepChange(index)}
            sx={{
              cursor: 'pointer',
              '& .MuiStepLabel-root': {
                fontFamily: '"Nunito Sans", sans-serif',
              },
              '& .MuiStepIcon-root': {
                color: '#e0e0e0',
                '&.Mui-active': {
                  color: '#555555',
                },
                '&.Mui-completed': {
                  color: '#555555',
                },
              },
              '& .MuiStepLabel-label': {
                fontFamily: '"Nunito Sans", sans-serif',
                '&.Mui-active': {
                  color: '#555555',
                },
              },
            }}
          >
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          onClick={onPreviousStep}
          disabled={activeStep === 0}
          sx={{
            color: '#555555',
            '&:hover': {
              backgroundColor: 'rgba(85, 85, 85, 0.04)',
            },
            fontFamily: '"Nunito Sans", sans-serif',
            textTransform: 'none',
          }}
        >
          Back
        </Button>
        <Button
          onClick={onNextStep}
          disabled={activeStep === steps.length - 1}
          sx={{
            color: '#555555',
            '&:hover': {
              backgroundColor: 'rgba(85, 85, 85, 0.04)',
            },
            fontFamily: '"Nunito Sans", sans-serif',
            textTransform: 'none',
          }}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

StepNavigation.propTypes = {
  activeStep: PropTypes.number.isRequired,
  onStepChange: PropTypes.func.isRequired,
  onPreviousStep: PropTypes.func.isRequired,
  onNextStep: PropTypes.func.isRequired,
};

export default StepNavigation; 