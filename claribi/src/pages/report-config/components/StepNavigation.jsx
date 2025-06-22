import React from 'react';
import PropTypes from 'prop-types';
import { Box, Stepper, Step, StepLabel, Button, Tooltip } from '@mui/material';

const steps = [
  'Field Selection',
  'Synonym Management',
  'Report URL',
  'Query Assistant',
];

const StepNavigation = ({ activeStep, onStepChange, onPreviousStep, onNextStep, hasData, hasSelectedFields }) => {
  const isStepDisabled = (step) => {
    if (step === 0) return false; // Field Selection is always enabled
    if (!hasData) return true; // If no data, all subsequent steps are disabled
    if (!hasSelectedFields) return true; // If no fields selected, all subsequent steps are disabled
    return false;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Tooltip 
            key={label}
            title={
              isStepDisabled(index) 
                ? "Please upload data and select fields in the Field Selection step first" 
                : ""
            }
            placement="top"
          >
            <Step
              onClick={() => !isStepDisabled(index) && onStepChange(index)}
              sx={{
                cursor: isStepDisabled(index) ? 'not-allowed' : 'pointer',
                '& .MuiStepLabel-root': {
                  fontFamily: '"Nunito Sans", sans-serif',
                },
                '& .MuiStepIcon-root': {
                  color: isStepDisabled(index) ? '#e0e0e0' : '#e0e0e0',
                  '&.Mui-active': {
                    color: isStepDisabled(index) ? '#e0e0e0' : '#555555',
                  },
                  '&.Mui-completed': {
                    color: isStepDisabled(index) ? '#e0e0e0' : '#555555',
                  },
                },
                '& .MuiStepLabel-label': {
                  fontFamily: '"Nunito Sans", sans-serif',
                  color: isStepDisabled(index) ? '#e0e0e0' : 'inherit',
                  '&.Mui-active': {
                    color: isStepDisabled(index) ? '#e0e0e0' : '#555555',
                  },
                },
              }}
            >
              <StepLabel>{label}</StepLabel>
            </Step>
          </Tooltip>
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
          disabled={activeStep === steps.length - 1 || isStepDisabled(activeStep + 1)}
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
  hasData: PropTypes.bool.isRequired,
  hasSelectedFields: PropTypes.bool.isRequired,
};

export default StepNavigation; 