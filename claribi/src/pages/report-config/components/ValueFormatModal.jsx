import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  FormHelperText,
  Switch,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Alert,
  Collapse,
  LinearProgress,
  CircularProgress,
  Input
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import InfoIcon from '@mui/icons-material/Info';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import valueValidationService from '../../../services/valueValidationService';

const ValueFormatModal = ({ 
  open, 
  onClose, 
  field, 
  tableName, 
  currentRules, 
  onSave,
  projectId,
  reportId 
}) => {
  const [ruleType, setRuleType] = useState('exact_match');
  const [validValues, setValidValues] = useState([]);
  const [newValue, setNewValue] = useState('');
  const [pattern, setPattern] = useState('');
  const [patternError, setPatternError] = useState('');
  const [replacement, setReplacement] = useState('');
  const [transformationType, setTransformationType] = useState('trim');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [inputFormats, setInputFormats] = useState(['%Y-%m-%d']);
  const [outputFormat, setOutputFormat] = useState('%Y-%m-%d');
  const [newInputFormat, setNewInputFormat] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [rules, setRules] = useState([]);

  // AI Generation state
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState('');
  const [aiResult, setAIResult] = useState(null);

  // Add new state for file upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Constants for validation
  const MAX_RULES = 5;
  const NUMERIC_TYPES = ['decimal', 'int64', 'integer', 'double', 'number', 'float', 'numeric', 'bigint', 'smallint', 'tinyint', 'real'];
  
  useEffect(() => {
    if (open && field && currentRules) {
      try {
        const fieldKey = `${tableName}.${field.columnName}`;
        const fieldRules = currentRules[fieldKey] || { rules: [] };
        
        // Debug logging
        console.log('ValueFormatModal opened with field:', field);
        console.log('Field dataType:', field.dataType);
        console.log('Field measure:', field.measure);
        console.log('Field key:', fieldKey);
        console.log('All current rules:', currentRules);
        console.log('Field-specific rules:', fieldRules);
        console.log('Is numeric field:', isNumericField);
        
        setRules(fieldRules.rules || []);
        setDefaultValue(fieldRules.default_value || '');
        
        // Reset form when opening
        resetForm();
        // Reset AI generation state
        resetAIGeneration();
        setShowAIGeneration(false);
      } catch (error) {
        console.error('Error initializing ValueFormatModal:', error);
        // Reset to safe defaults
        setRules([]);
        setDefaultValue('');
        resetForm();
        resetAIGeneration();
        setShowAIGeneration(false);
      }
    }
  }, [open, field, tableName, currentRules]);

  const resetForm = () => {
    setRuleType('exact_match');
    setValidValues([]);
    setNewValue('');
    setPattern('');
    setPatternError('');
    setReplacement('');
    setTransformationType('trim');
    setMinValue('');
    setMaxValue('');
    setInputFormats(['%Y-%m-%d']);
    setOutputFormat('%Y-%m-%d');
    setNewInputFormat('');
    setCaseSensitive(false);
  };

  // Reset AI generation state
  const resetAIGeneration = () => {
    setAIPrompt('');
    setAIError('');
    setAIResult(null);
    setAILoading(false);
  };

  // Handle AI generation
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setAIError('Please enter a description or examples');
      return;
    }

    if (!projectId || !reportId) {
      setAIError('Project and report information is required');
      return;
    }

    setAILoading(true);
    setAIError('');
    setAIResult(null);

    try {
      const result = await valueValidationService.generateValueRules(
        projectId,
        reportId,
        aiPrompt.trim(),
        field.columnName,
        field.dataType,
        tableName
      );

      if (result.success) {
        setAIResult(result);
      } else {
        setAIError(result.error || 'Failed to generate validation rules');
      }
    } catch (error) {
      console.error('Error generating AI rules:', error);
      setAIError('Failed to generate validation rules. Please try again.');
    } finally {
      setAILoading(false);
    }
  };

  // Apply AI generated rules
  const handleApplyAIRules = () => {
    if (!aiResult || !aiResult.rules) return;

    // Add AI generated rules to existing rules
    const newRules = [...rules, ...aiResult.rules];
    setRules(newRules);

    // Set default value if provided
    if (aiResult.default_value && !defaultValue) {
      setDefaultValue(aiResult.default_value);
    }

    // Reset AI state
    resetAIGeneration();
    setShowAIGeneration(false);
  };

  // Check if field is numeric - memoize result to avoid recalculating
  const isNumericField = useMemo(() => {
    if (!field) {
      console.log('isNumericField: no field provided');
      return false;
    }
    
    const dataType = field.dataType?.toLowerCase() || '';
    const isMeasure = field.measure === true;
    const isNumericType = NUMERIC_TYPES.includes(dataType);
    
    console.log('Checking numeric field - dataType:', dataType, 'isMeasure:', isMeasure, 'isNumericType:', isNumericType);
    
    return isNumericType || isMeasure;
  }, [field]);

  // Get existing rule types
  const getExistingRuleTypes = () => {
    return rules.map(rule => rule.type);
  };

  // Check if exact match rule exists
  const hasExactMatchRule = () => {
    return rules.some(rule => rule.type === 'exact_match');
  };

  const hasRegexPatternRule = () => {
    return rules.some(rule => rule.type === 'pattern');
  };

  // Check for conflicting rules
  const getConflictingRules = () => {
    const existingTypes = getExistingRuleTypes();
    const conflicts = {};

    // Transformation conflicts - uppercase vs lowercase vs titlecase
    if (existingTypes.includes('transformation')) {
      const transformationRules = rules.filter(r => r.type === 'transformation');
      const caseTransforms = ['uppercase', 'lowercase', 'titlecase'];
      const hasCaseTransform = transformationRules.some(r => caseTransforms.includes(r.transformation_type));
      
      if (hasCaseTransform && caseTransforms.includes(transformationType)) {
        conflicts.transformation = {
          conflictsWith: caseTransforms,
          message: 'Cannot add conflicting case transformations (uppercase, lowercase, titlecase)'
        };
      }
    }

    // Exact match conflicts with everything
    if (existingTypes.includes('exact_match')) {
      conflicts.pattern = { message: 'Exact match rule overrides pattern validation' };
      conflicts.transformation = { message: 'Exact match rule overrides transformations' };
      conflicts.range = { message: 'Exact match rule overrides range validation' };
      conflicts.date_format = { message: 'Exact match rule overrides date formatting' };
    }

    // Regex pattern conflicts with everything except itself (but only 1 allowed)
    if (existingTypes.includes('pattern')) {
      conflicts.pattern = { message: 'Only one regex pattern rule allowed per field' };
      conflicts.exact_match = { message: 'Regex pattern rule overrides exact match validation' };
      conflicts.transformation = { message: 'Regex pattern rule overrides transformations' };
      conflicts.range = { message: 'Regex pattern rule overrides range validation' };
      conflicts.date_format = { message: 'Regex pattern rule overrides date formatting' };
    }

    return conflicts;
  };

  // Check if rule type is disabled
  const isRuleTypeDisabled = (type) => {
    const conflicts = getConflictingRules();
    
    // Max rules reached
    if (rules.length >= MAX_RULES) {
      return true;
    }

    // Type-specific conflicts
    if (conflicts[type]) {
      return true;
    }

    // Numeric field check for range
    if (type === 'range' && !isNumericField) {
      return true;
    }

    return false;
  };

  // Get tooltip for disabled rule type
  const getDisabledTooltip = (type) => {
    const conflicts = getConflictingRules();
    
    // Max rules reached
    if (rules.length >= MAX_RULES) {
      return `Maximum ${MAX_RULES} rules allowed per field`;
    }

    // Specific conflict messages
    if (conflicts[type]) {
      return conflicts[type].message;
    }

    // Type-specific messages
    switch (type) {
      case 'range':
        if (!isNumericField) {
          return 'Range validation only available for numeric fields and measures';
        }
        break;
      case 'date_format':
        return 'Date format validation for date/time fields';
      default:
        return 'This option is currently unavailable';
    }
  };

  // Ensure at least one rule type is always available
  const getAvailableRuleTypes = () => {
    try {
      const ruleTypes = ['exact_match', 'pattern', 'transformation', 'range', 'date_format'];
      const available = ruleTypes.filter(type => !isRuleTypeDisabled(type));
      
      // If all are disabled (which shouldn't happen), at least allow exact_match
      if (available.length === 0) {
        console.warn('All rule types disabled, forcing exact_match to be available');
        return ['exact_match'];
      }
      
      console.log('Available rule types:', available);
      return available;
    } catch (error) {
      console.error('Error getting available rule types:', error);
      return ['exact_match']; // Safe fallback
    }
  };

  // Update ruleType if current selection is disabled
  useEffect(() => {
    // If the current rule type becomes disabled, switch to the first available one
    if (isRuleTypeDisabled(ruleType)) {
      const availableTypes = getAvailableRuleTypes();
      if (availableTypes.length > 0) {
        console.log(`Current ruleType ${ruleType} is disabled, switching to ${availableTypes[0]}`);
        setRuleType(availableTypes[0]);
      }
    }
  }, [rules, field]);

  // Get safe value for Select component
  const getSafeSelectValue = () => {
    // All rule types are always available as MenuItems, just disabled when not applicable
    const validRuleTypes = ['exact_match', 'pattern', 'transformation', 'range', 'date_format'];
    return validRuleTypes.includes(ruleType) ? ruleType : 'exact_match';
  };

  // Enhanced regex validation with examples
  const getRegexExamples = () => {
    return [
      { pattern: '^[A-Z][a-z]+$', description: 'Capitalized words (e.g., "John", "Smith")' },
      { pattern: '^\\d{3}-\\d{2}-\\d{4}$', description: 'SSN format (e.g., "123-45-6789")' },
      { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', description: 'Email format' },
      { pattern: '^\\d{5}(-\\d{4})?$', description: 'US ZIP code (e.g., "12345" or "12345-6789")' },
      { pattern: '^[A-Z]{2,3}\\d{2,4}$', description: 'Custom ID format (e.g., "ABC123", "XY4567")' }
    ];
  };

  const validateRegexPattern = (patternStr) => {
    if (!patternStr.trim()) {
      setPatternError('Pattern cannot be empty');
      return false;
    }

    try {
      // Test if the pattern is valid by creating a RegExp object
      new RegExp(patternStr);
      setPatternError('');
      return true;
    } catch (e) {
      setPatternError(`Invalid regex pattern: ${e.message}`);
      return false;
    }
  };

  const handlePatternChange = (e) => {
    const newPattern = e.target.value;
    setPattern(newPattern);
    validateRegexPattern(newPattern);
  };

  const handleAddValue = () => {
    if (newValue.trim() && !validValues.includes(newValue.trim())) {
      setValidValues([...validValues, newValue.trim()]);
      setNewValue('');
    }
  };

  const handleRemoveValue = (valueToRemove) => {
    setValidValues(validValues.filter(v => v !== valueToRemove));
  };

  const handleAddInputFormat = () => {
    if (newInputFormat.trim() && !inputFormats.includes(newInputFormat.trim())) {
      setInputFormats([...inputFormats, newInputFormat.trim()]);
      setNewInputFormat('');
    }
  };

  const handleRemoveInputFormat = (formatToRemove) => {
    setInputFormats(inputFormats.filter(f => f !== formatToRemove));
  };

  const handleAddRule = () => {
    if (rules.length >= MAX_RULES) {
      return;
    }

    let newRule = { type: ruleType };

    switch (ruleType) {
      case 'exact_match':
        if (validValues.length === 0) return;
        newRule.valid_values = validValues;
        newRule.case_sensitive = caseSensitive;
        break;
      case 'pattern':
        if (!pattern.trim() || !validateRegexPattern(pattern)) {
          return;
        }
        newRule.pattern = pattern;
        break;
      case 'transformation':
        const conflicts = getConflictingRules();
        if (conflicts.transformation) return;
        newRule.transformation_type = transformationType;
        break;
      case 'range':
        if (!isNumericField || (!minValue && !maxValue)) return;
        if (minValue) newRule.min_value = parseFloat(minValue);
        if (maxValue) newRule.max_value = parseFloat(maxValue);
        break;
      case 'date_format':
        if (inputFormats.length === 0) return;
        newRule.input_formats = inputFormats;
        newRule.output_format = outputFormat;
        break;
      default:
        return;
    }

    setRules([...rules, newRule]);
    resetForm();
  };

  const handleRemoveRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const fieldKey = `${tableName}.${field.columnName}`;
    const fieldRules = {
      rules: rules,
      ...(defaultValue.trim() && { default_value: defaultValue.trim() })
    };

    console.log('Saving rules for field key:', fieldKey);
    console.log('Rules being saved:', fieldRules);

    onSave(fieldRules);
    onClose();
  };

  const getRuleDescription = (rule) => {
    switch (rule.type) {
      case 'exact_match': {
        const values = rule.valid_values;
        const displayValues = values.slice(0, 20);
        const remainingCount = values.length - 20;
        const displayText = displayValues.join(', ') + (remainingCount > 0 ? ` (+${remainingCount} more)` : '');
        return `Exact match: ${displayText} (${rule.case_sensitive ? 'case-sensitive' : 'case-insensitive'})`;
      }
      case 'pattern':
        return `Pattern: ${rule.pattern}`;
      case 'transformation':
        return `Transform: ${rule.transformation_type}`;
      case 'range':
        const min = rule.min_value !== undefined ? rule.min_value : '';
        const max = rule.max_value !== undefined ? rule.max_value : '';
        return `Range: ${min} - ${max}`;
      case 'date_format':
        return `Date format: ${rule.input_formats.join(', ')} → ${rule.output_format}`;
      default:
        return 'Unknown rule';
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a CSV file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        
        // Get unique, non-empty values
        const newValues = [...new Set(lines
          .map(line => line.trim())
          .filter(line => line && !validValues.includes(line))
        )];

        if (newValues.length === 0) {
          setUploadError('No new valid values found in the CSV file');
        } else {
          setValidValues([...validValues, ...newValues]);
        }
        setIsUploading(false);
      };

      reader.onerror = () => {
        setUploadError('Error reading the file');
        setIsUploading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      setUploadError('Error processing the file');
      setIsUploading(false);
    }
  };

  if (!field) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        borderRadius: '16px',
        boxShadow: 24,
        p: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Configure Format Rules
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            Field: <strong>{tableName}.{field.columnName}</strong> 
            {field.measure && <Chip label="Measure" size="small" sx={{ ml: 1 }} />}
            {field.dataType && <Chip label={field.dataType} size="small" sx={{ ml: 1 }} />}
          </Typography>

          {/* Max rules warning */}
          {rules.length >= MAX_RULES && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Maximum {MAX_RULES} rules allowed per field. Remove a rule to add another.
            </Alert>
          )}

          {/* Exact match priority warning */}
          {hasExactMatchRule() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Exact match rule is active. Other validation types are disabled as exact match takes precedence.
            </Alert>
          )}

          {/* Regex pattern priority warning */}
          {hasRegexPatternRule() && !hasExactMatchRule() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Regex pattern rule is active. Other validation types are disabled as regex pattern takes precedence.
            </Alert>
          )}

          {/* Existing Rules */}
          {rules.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Current Rules
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {rules.length} of {MAX_RULES} rules added
                </Typography>
              </Box>
              <List dense>
                {rules.map((rule, index) => {
                  // Check if this rule is inactive due to regex pattern
                  const isInactiveByRegex = hasRegexPatternRule() && rule.type !== 'pattern';
                  // Check if this rule is inactive due to exact match
                  const isInactiveByExactMatch = hasExactMatchRule() && rule.type !== 'exact_match';
                  const isInactive = isInactiveByRegex || isInactiveByExactMatch;
                  
                  return (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Box>
                            {rule.type === 'exact_match' && rule.valid_values.length > 20 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                      All Valid Values ({rule.valid_values.length}):
                                    </Typography>
                                    <Box sx={{ 
                                      maxHeight: '200px', 
                                      overflowY: 'auto',
                                      '&::-webkit-scrollbar': {
                                        width: '8px',
                                      },
                                      '&::-webkit-scrollbar-track': {
                                        background: 'rgba(0,0,0,0.1)',
                                        borderRadius: '4px',
                                      },
                                      '&::-webkit-scrollbar-thumb': {
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '4px',
                                        '&:hover': {
                                          background: 'rgba(0,0,0,0.3)',
                                        },
                                      },
                                    }}>
                                      {rule.valid_values.map((value, idx) => (
                                        <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                          • {value}
                                        </Typography>
                                      ))}
                                    </Box>
                                  </Box>
                                }
                                arrow
                                placement="top"
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: 'background.paper',
                                      color: 'text.primary',
                                      '& .MuiTooltip-arrow': {
                                        color: 'background.paper',
                                      },
                                      boxShadow: 2,
                                      maxWidth: 'none',
                                    }
                                  }
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: isInactive ? 'text.disabled' : 'text.primary',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      textDecoration: 'underline'
                                    }
                                  }}
                                >
                                  {getRuleDescription(rule)}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: isInactive ? 'text.disabled' : 'text.primary',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {getRuleDescription(rule)}
                              </Typography>
                            )}
                            {isInactiveByRegex && (
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'text.disabled', fontSize: '0.75rem', ml: 1 }}
                              >
                                (Inactive, regex being used)
                              </Typography>
                            )}
                            {isInactiveByExactMatch && (
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'text.disabled', fontSize: '0.75rem', ml: 1 }}
                              >
                                (Inactive, exact match being used)
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRemoveRule(index)}
                          size="small"
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {/* AI Generation Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                AI Rule Generation
              </Typography>
              <Button
                variant="outlined"
                startIcon={showAIGeneration ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAIGeneration(!showAIGeneration)}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                {showAIGeneration ? 'Hide' : 'Generate with AI'}
              </Button>
            </Box>

            <Collapse in={showAIGeneration}>
              <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Describe how this field should be formatted or provide examples of acceptable values. 
                  AI will analyze your input and suggest appropriate validation rules.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Describe the validation requirements"
                    value={aiPrompt}
                    onChange={(e) => setAIPrompt(e.target.value)}
                    placeholder="Examples:
• 'Only allow values: Red, Green, Blue, Yellow'
• 'Format should be ABC123 (3 letters followed by 3 numbers)'
• 'Convert all text to uppercase'
• 'Numbers between 0 and 100 only'
• 'Dates in YYYY-MM-DD format'"
                    disabled={aiLoading}
                  />
                </Box>

                {aiError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {aiError}
                  </Alert>
                )}

                {aiResult && (
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        AI Generated Rules:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {aiResult.explanation}
                      </Typography>
                      <List dense>
                        {aiResult.rules.map((rule, index) => (
                          <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                            <ListItemText 
                              primary={getRuleDescription(rule)}
                              sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {aiResult.default_value && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Default value: {aiResult.default_value}
                        </Typography>
                      )}
                    </Alert>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleApplyAIRules}
                        startIcon={<AutoAwesomeIcon />}
                        disabled={rules.length + aiResult.rules.length > MAX_RULES}
                      >
                        Apply Rules
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={resetAIGeneration}
                      >
                        Discard
                      </Button>
                    </Box>
                    {rules.length + aiResult.rules.length > MAX_RULES && (
                      <Typography variant="caption" sx={{ color: 'warning.main', mt: 1, display: 'block' }}>
                        Cannot apply all rules - would exceed maximum of {MAX_RULES} rules per field
                      </Typography>
                    )}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleGenerateWithAI}
                    startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                    disabled={aiLoading || !aiPrompt.trim()}
                  >
                    {aiLoading ? 'Generating...' : 'Generate Rules'}
                  </Button>
                  {showAIGeneration && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowAIGeneration(false);
                        resetAIGeneration();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              </Paper>
            </Collapse>
          </Box>

          {/* Add New Rule Section */}
          {rules.length < MAX_RULES && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Add New Rule
                <Typography variant="body2" component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.875rem' }}>
                  ({MAX_RULES - rules.length} remaining)
                </Typography>
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={getSafeSelectValue()}
                  label="Rule Type"
                  onChange={(e) => setRuleType(e.target.value)}
                >
                  <MenuItem value="exact_match" disabled={isRuleTypeDisabled('exact_match')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>Exact Match</Typography>
                      {isRuleTypeDisabled('exact_match') && (
                        <Tooltip title={getDisabledTooltip('exact_match')} placement="right">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </MenuItem>
                  <MenuItem value="pattern" disabled={isRuleTypeDisabled('pattern')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>Regex Pattern</Typography>
                      {isRuleTypeDisabled('pattern') && (
                        <Tooltip title={getDisabledTooltip('pattern')} placement="right">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </MenuItem>
                  <MenuItem value="transformation" disabled={isRuleTypeDisabled('transformation')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>Text Transformation</Typography>
                      {isRuleTypeDisabled('transformation') && (
                        <Tooltip title={getDisabledTooltip('transformation')} placement="right">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </MenuItem>
                  <MenuItem value="range" disabled={isRuleTypeDisabled('range')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>Range (Numeric)</Typography>
                      {isRuleTypeDisabled('range') && (
                        <Tooltip title={getDisabledTooltip('range')} placement="right">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </MenuItem>
                  <MenuItem value="date_format" disabled={isRuleTypeDisabled('date_format')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>Date Format</Typography>
                      {isRuleTypeDisabled('date_format') && (
                        <Tooltip title={getDisabledTooltip('date_format')} placement="right">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </MenuItem>
                </Select>
                {/* Show helper text for disabled options */}
                {isRuleTypeDisabled(ruleType) && (
                  <FormHelperText sx={{ color: 'warning.main' }}>
                    {getDisabledTooltip(ruleType)}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Rule-specific inputs */}
              {ruleType === 'exact_match' && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Add Valid Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddValue()}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={handleAddValue}
                      startIcon={<AddRoundedIcon />}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Add CSV Upload section */}
                  <Box sx={{ mb: 2 }}>
                    <input
                      accept=".csv"
                      style={{ display: 'none' }}
                      id="csv-file-upload"
                      type="file"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="csv-file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadFileIcon />}
                        disabled={isUploading}
                        sx={{ mb: 1 }}
                      >
                        Upload CSV
                      </Button>
                    </label>
                    {isUploading && (
                      <LinearProgress sx={{ mt: 1 }} />
                    )}
                    {uploadError && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {uploadError}
                      </Alert>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {validValues.slice(0, 20).map((value, index) => (
                      <Chip
                        key={index}
                        label={value}
                        onDelete={() => handleRemoveValue(value)}
                        size="small"
                      />
                    ))}
                    {validValues.length > 20 && (
                      <Tooltip 
                        title={
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Additional Values ({validValues.length - 20}):
                            </Typography>
                            <Box sx={{ 
                              maxHeight: '200px', 
                              overflowY: 'auto',
                              '&::-webkit-scrollbar': {
                                width: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '4px',
                                '&:hover': {
                                  background: 'rgba(0,0,0,0.3)',
                                },
                              },
                            }}>
                              {validValues.slice(20).map((value, index) => (
                                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                  • {value}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        }
                        arrow
                        placement="top"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: 'background.paper',
                              color: 'text.primary',
                              '& .MuiTooltip-arrow': {
                                color: 'background.paper',
                              },
                              boxShadow: 2,
                              maxWidth: 'none',
                            }
                          }
                        }}
                      >
                        <Chip
                          label={`+${validValues.length - 20} more`}
                          size="small"
                          sx={{ 
                            backgroundColor: 'primary.light',
                            '&:hover': {
                              backgroundColor: 'primary.main',
                              color: 'white'
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                      />
                    }
                    label="Case Sensitive"
                  />
                </Box>
              )}

              {ruleType === 'pattern' && (
                <Box>
                  <TextField
                    fullWidth
                    label="Regex Pattern"
                    value={pattern}
                    onChange={handlePatternChange}
                    sx={{ mb: 2 }}
                    error={!!patternError}
                    helperText={patternError || "Enter a regular expression pattern"}
                    placeholder="e.g., ^[A-Z][a-z]+$ (Capitalized words)"
                  />
                  
                  {/* Regex Examples */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
                      Common Patterns:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {getRegexExamples().slice(0, 3).map((example, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={example.pattern}
                            size="small"
                            variant="outlined"
                            onClick={() => setPattern(example.pattern)}
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            {example.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {ruleType === 'transformation' && (
                <Box>
                  {/* Show conflict warning if applicable */}
                  {getConflictingRules().transformation && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {getConflictingRules().transformation.message}
                    </Alert>
                  )}
                  
                  <FormControl fullWidth>
                    <InputLabel>Transformation Type</InputLabel>
                    <Select
                      value={transformationType}
                      label="Transformation Type"
                      onChange={(e) => setTransformationType(e.target.value)}
                    >
                      <MenuItem value="uppercase">Uppercase</MenuItem>
                      <MenuItem value="lowercase">Lowercase</MenuItem>
                      <MenuItem value="titlecase">Title Case</MenuItem>
                      <MenuItem value="trim">Trim Whitespace</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {ruleType === 'range' && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Min Value"
                    type="number"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Max Value"
                    type="number"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    fullWidth
                  />
                </Box>
              )}

              {ruleType === 'date_format' && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Add Input Format"
                      value={newInputFormat}
                      onChange={(e) => setNewInputFormat(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddInputFormat()}
                      helperText="e.g., %Y-%m-%d, %d/%m/%Y"
                    />
                    <Button 
                      variant="outlined" 
                      onClick={handleAddInputFormat}
                      startIcon={<AddRoundedIcon />}
                    >
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {inputFormats.map((format, index) => (
                      <Chip
                        key={index}
                        label={format}
                        onDelete={() => handleRemoveInputFormat(format)}
                        size="small"
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    label="Output Format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    helperText="Format for the output date"
                  />
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleAddRule}
                  startIcon={<AddRoundedIcon />}
                  disabled={
                    isRuleTypeDisabled(ruleType) ||
                    (ruleType === 'exact_match' && validValues.length === 0) ||
                    (ruleType === 'pattern' && (!pattern.trim() || !!patternError)) ||
                    (ruleType === 'range' && !minValue && !maxValue) ||
                    (ruleType === 'date_format' && inputFormats.length === 0)
                  }
                >
                  Add Rule
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />
            </>
          )}

          {/* Default Value */}
          <TextField
            fullWidth
            label="Default Value (Optional)"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            helperText="Value to use when validation fails"
          />
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 3, 
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end'
        }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Save Rules
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ValueFormatModal; 