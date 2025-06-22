import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Button,
  CircularProgress,
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNotification } from '../../../../contexts/NotificationContext';
import reportConfigService from '../../../../services/reportConfigService';
import valueValidationService from '../../../../services/valueValidationService';
import ValueFormatModal from '../../components/ValueFormatModal';

const SynonymManagement = ({ projectId, reportId, setHasUnsavedChanges }) => {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [synonymsData, setSynonymsData] = useState([]);
  const { showNotification } = useNotification();
  const [expandedTables, setExpandedTables] = useState({});
  const [valueRules, setValueRules] = useState({});
  const [isValueFormatModalOpen, setIsValueFormatModalOpen] = useState(false);
  const [selectedFieldForFormat, setSelectedFieldForFormat] = useState(null);
  const [selectedTableForFormat, setSelectedTableForFormat] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchValueRules();
  }, [projectId, reportId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await reportConfigService.getReportConfig(projectId, reportId);
      
      if (response?.data?.success) {
        const config = response.data.config;
        
        // Process tables and fields data
        if (config.tables_info) {
          // Transform tables_info into tableData format
          const tables = [];
          
          // Process regular columns (dimensions)
          Object.entries(config.tables_info).forEach(([tableName, tableInfo]) => {
            // Process regular columns
            Object.entries(tableInfo.columns || {}).forEach(([columnName, dataType]) => {
              tables.push({
                id: `${tableName}-${columnName}`,
                table: tableName,
                columnName: columnName,
                dataType: typeof dataType === 'string' ? dataType : 'string',
                type: 'dimension',
                selected: config.selected_fields?.[tableName]?.includes(columnName) || false
              });
            });
            
            // Process measures array if it exists
            if (tableInfo.measures && Array.isArray(tableInfo.measures)) {
              tableInfo.measures.forEach((measureName) => {
                tables.push({
                  id: `${tableName}-${measureName}-measure`,
                  table: tableName,
                  columnName: measureName,
                  dataType: 'number',
                  type: 'measure',
                  selected: config.selected_fields?.[tableName]?.includes(measureName) || false
                });
              });
            }
          });
          
          setTableData(tables);
        } else {
          setTableData([]);
        }
        
        // Process synonyms data
        if (config.synonyms) {
          const synonyms = [];
          let id = 1;
          Object.entries(config.synonyms).forEach(([tableName, tableData]) => {
            Object.entries(tableData).forEach(([columnName, synonymsStr]) => {
              synonyms.push({
                id: id++,
                table: tableName,
                column: columnName,
                synonyms: synonymsStr
              });
            });
          });
          setSynonymsData(synonyms);
        }
      } else {
        setTableData([]);
        showNotification('Failed to fetch configuration data', 'error');
      }
    } catch (err) {
      showNotification(`Error fetching data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchValueRules = async () => {
    try {
      const response = await valueValidationService.getValueRules(projectId, reportId);
      if (response?.success) {
        setValueRules(response.value_rules || {});
      }
    } catch (err) {
      console.error('Error fetching value rules:', err);
    }
  };

  const handleOpenFormatModal = (field, tableName) => {
    setSelectedFieldForFormat(field);
    setSelectedTableForFormat(tableName);
    setIsValueFormatModalOpen(true);
  };

  const handleCloseFormatModal = () => {
    setIsValueFormatModalOpen(false);
    setSelectedFieldForFormat(null);
    setSelectedTableForFormat(null);
  };

  const handleSaveValueRules = async (fieldKey, fieldRules) => {
    try {
      let updatedRules = { ...valueRules };
      
      // If rules array is empty, remove the field key entirely
      if (!fieldRules.rules || fieldRules.rules.length === 0) {
        delete updatedRules[fieldKey];
      } else {
        // Otherwise update with new rules
        updatedRules[fieldKey] = fieldRules;
      }
      
      const response = await valueValidationService.saveValueRules(projectId, reportId, updatedRules);
      if (response?.success) {
        setValueRules(updatedRules);
        showNotification('Value validation rules saved successfully', 'success');
      } else {
        showNotification('Failed to save value validation rules', 'error');
      }
    } catch (err) {
      showNotification(`Error saving value rules: ${err.message}`, 'error');
    }
  };

  const handleAddSynonym = (field, value) => {
    if (!value.trim()) return;
    
    // Find existing synonym for this field
    const existingSynonym = synonymsData.find(
      item => item.table === field.table && item.column === field.columnName
    );
    
    // Current synonyms as array
    const currentSynonyms = existingSynonym?.synonyms 
      ? existingSynonym.synonyms.split(',').map(s => s.trim()).filter(s => s)
      : [];
    
    // Add new synonym if it doesn't already exist
    if (!currentSynonyms.includes(value.trim())) {
      const newSynonyms = [...currentSynonyms, value.trim()].join(', ');
      
      if (existingSynonym) {
        // Update existing
        setSynonymsData(synonymsData.map(item => 
          (item.table === field.table && item.column === field.columnName) 
            ? { ...item, synonyms: newSynonyms } 
            : item
        ));
      } else {
        // Add new
        setSynonymsData([
          ...synonymsData,
          {
            id: Date.now(),
            table: field.table,
            column: field.columnName,
            synonyms: value.trim()
          }
        ]);
      }
    setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSynonym = (field, synonymToRemove) => {
    // Find existing synonym for this field
    const existingSynonym = synonymsData.find(
      item => item.table === field.table && item.column === field.columnName
    );
    
    if (existingSynonym) {
      // Current synonyms as array
      const currentSynonyms = existingSynonym.synonyms
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== synonymToRemove);
      
      // Update with removed synonym
      setSynonymsData(synonymsData.map(item => 
        (item.table === field.table && item.column === field.columnName) 
          ? { ...item, synonyms: currentSynonyms.join(', ') } 
          : item
      ));
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveSynonyms = async () => {
    try {
      setLoading(true);
      
      // Transform synonymsData into the format expected by the API
      const synonyms = {};
      synonymsData.forEach(item => {
        if (!synonyms[item.table]) {
          synonyms[item.table] = {};
        }
        synonyms[item.table][item.column] = item.synonyms;
      });
      
      const response = await reportConfigService.saveSynonyms(projectId, reportId, synonyms);
      
      if (response?.data?.success) {
        showNotification('Synonyms saved successfully', 'success');
        setHasUnsavedChanges(false);
      } else {
        showNotification(response?.data?.error || 'Failed to save synonyms', 'error');
      }
    } catch (err) {
      showNotification(`Error saving synonyms: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Group fields by table and type
  const groupedFields = tableData.reduce((acc, field) => {
    // Only include selected fields
    if (!field.selected) return acc;

    if (!acc[field.table]) {
      acc[field.table] = {
        dimensions: [],
        measures: []
      };
    }
    
    if (field.type === 'measure') {
      acc[field.table].measures.push(field);
    } else {
      acc[field.table].dimensions.push(field);
    }
    
    return acc;
  }, {});

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 1 }}>
            Manage Synonyms
          </Typography>
          <Tooltip 
            title="Add synonyms to help AI reference the correct dimension/measure names in user queries" 
            placement="right"
          >
            <IconButton 
              size="small"
        sx={{
                color: '#555555',
                '&:hover': { color: '#FCC000' }
              }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          onClick={handleSaveSynonyms}
          disabled={loading}
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            backgroundColor: '#FCC000',
            color: '#000000',
            '&:hover': {
              backgroundColor: '#E5AD00',
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(252, 192, 0, 0.5)',
              color: 'rgba(0, 0, 0, 0.5)',
            },
            borderRadius: '8px',
            textTransform: 'none'
          }}
        >
          Save Synonyms
          </Button>
        </Box>

      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        gap: 2, 
        overflow: 'auto',
      }}>
        {/* Dimensions Section */}
        <Paper sx={{ flex: 1, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Dimensions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <Table>
                <TableBody>
                  {Object.entries(groupedFields).map(([tableName, { dimensions }]) => (
                    dimensions.length > 0 && (
                      <React.Fragment key={tableName}>
                        <TableRow 
                          hover
                          onClick={() => {
                            setExpandedTables(prev => ({
                              ...prev,
                              [tableName]: !prev[tableName]
                            }));
                          }}
                sx={{
                            cursor: 'pointer',
                            bgcolor: 'inherit',
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.04)'
                            },
                            position: 'relative'
                          }}
                        >
                          <TableCell sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton 
                                size="small" 
                sx={{
                                  mr: 1,
                                  transform: expandedTables[tableName] ? 'rotate(90deg)' : 'none',
                                  transition: 'transform 0.2s'
                                }}
                              >
                                <ArrowForwardRoundedIcon fontSize="small" />
                              </IconButton>
                              {tableName}
                            </Box>
              </TableCell>
            </TableRow>
                        {expandedTables[tableName] && dimensions.map((field) => {
                          const synonymItem = synonymsData.find(
                            s => s.table === field.table && s.column === field.columnName
                          );
                          const synonymsArray = synonymItem?.synonyms 
                            ? synonymItem.synonyms.split(',').map(s => s.trim()).filter(s => s) 
                            : [];
                          
                          // Check if field has validation rules
                          const fieldKey = `${tableName}.${field.columnName}`;
                          const hasValidationRules = valueRules[fieldKey] && valueRules[fieldKey].rules && valueRules[fieldKey].rules.length > 0;

                          return (
              <TableRow
                              key={field.id}
                sx={{
                                bgcolor: 'inherit',
                  '&:hover': {
                                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <TableCell sx={{ pl: 10 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography sx={{ 
                                      fontFamily: "'Nunito Sans', sans-serif",
                                      fontSize: '0.875rem',
                                      color: '#666666',
                                      fontWeight: 500,
                                    }}>
                                      {field.columnName}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenFormatModal(field, tableName)}
                  sx={{
                                        ml: 1,
                                        color: hasValidationRules ? '#FCC000' : '#555555',
                                        '&:hover': {
                                          color: '#FCC000',
                                          bgcolor: 'rgba(252, 192, 0, 0.1)'
                                        }
                                      }}
                                      title="Configure field format"
                                    >
                                      <SettingsIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                  
                    <TextField
                      size="small"
                                    placeholder="Type a synonym and press Enter"
                      sx={{
                                      '& .MuiInputBase-input': {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontSize: '0.8125rem',
                                      },
                                      '& .MuiInputBase-input::placeholder': {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontSize: '0.8125rem',
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        handleAddSynonym(field, e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <IconButton
                                            edge="end"
                                            onClick={(e) => {
                                              const input = e.currentTarget.closest('.MuiTextField-root').querySelector('input');
                                              if (input && input.value.trim()) {
                                                handleAddSynonym(field, input.value);
                                                input.value = '';
                                              }
                                            }}
                                            size="small"
                                          >
                                            <ArrowForwardRoundedIcon fontSize="small" />
                                          </IconButton>
                                        </InputAdornment>
                                      ),
                                      sx: {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        borderRadius: '8px',
                                      }
                                    }}
                                  />
                                  
                                  {synonymsArray.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                      {synonymsArray.map((synonym, index) => (
                        <Chip
                          key={index}
                                          label={synonym}
                                          onDelete={() => handleRemoveSynonym(field, synonym)}
                          sx={{
                                            bgcolor: 'rgba(0, 0, 0, 0.06)',
                                            borderRadius: '16px',
                                            fontFamily: "'Nunito Sans', sans-serif",
                                            fontSize: '0.8125rem',
                                            height: 28,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                                </Box>
                </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    )
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>

        {/* Measures Section */}
        <Paper sx={{ flex: 1, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Measures
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
              <Table>
                <TableBody>
                  {Object.entries(groupedFields).map(([tableName, { measures }]) => (
                    measures.length > 0 && (
                      <React.Fragment key={tableName}>
                        <TableRow 
                          hover
                          onClick={() => {
                            setExpandedTables(prev => ({
                              ...prev,
                              [tableName]: !prev[tableName]
                            }));
                          }}
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: 'inherit',
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.04)'
                            },
                            position: 'relative'
                          }}
                        >
                          <TableCell sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton
                        size="small"
                                sx={{ 
                                  mr: 1,
                                  transform: expandedTables[tableName] ? 'rotate(90deg)' : 'none',
                                  transition: 'transform 0.2s'
                                }}
                              >
                                <ArrowForwardRoundedIcon fontSize="small" />
                      </IconButton>
                              {tableName}
                            </Box>
                          </TableCell>
                        </TableRow>
                        {expandedTables[tableName] && measures.map((field) => {
                          const synonymItem = synonymsData.find(
                            s => s.table === field.table && s.column === field.columnName
                          );
                          const synonymsArray = synonymItem?.synonyms 
                            ? synonymItem.synonyms.split(',').map(s => s.trim()).filter(s => s) 
                            : [];
                          
                          // Check if field has validation rules
                          const fieldKey = `${tableName}.${field.columnName}`;
                          const hasValidationRules = valueRules[fieldKey] && valueRules[fieldKey].rules && valueRules[fieldKey].rules.length > 0;

                          return (
                            <TableRow 
                              key={field.id}
                              sx={{ 
                                bgcolor: 'inherit',
                                '&:hover': {
                                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <TableCell sx={{ pl: 10 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography sx={{ 
                                      fontFamily: "'Nunito Sans', sans-serif",
                                      fontSize: '0.875rem',
                                      color: '#666666',
                                      fontWeight: 500,
                                    }}>
                                      {field.columnName}
                                    </Typography>
                      <IconButton
                        size="small"
                                      onClick={() => handleOpenFormatModal(field, tableName)}
                                      sx={{
                                        ml: 1,
                                        color: hasValidationRules ? '#FCC000' : '#555555',
                                        '&:hover': {
                                          color: '#FCC000',
                                          bgcolor: 'rgba(252, 192, 0, 0.1)'
                                        }
                                      }}
                                      title="Configure field format"
                                    >
                                      <SettingsIcon fontSize="small" />
                      </IconButton>
                                  </Box>
                                  
                                  <TextField
                        size="small"
                                    placeholder="Type a synonym and press Enter"
                                    sx={{ 
                                      '& .MuiInputBase-input': {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontSize: '0.8125rem',
                                      },
                                      '& .MuiInputBase-input::placeholder': {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontSize: '0.8125rem',
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        handleAddSynonym(field, e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                      <IconButton
                                            edge="end"
                                            onClick={(e) => {
                                              const input = e.currentTarget.closest('.MuiTextField-root').querySelector('input');
                                              if (input && input.value.trim()) {
                                                handleAddSynonym(field, input.value);
                                                input.value = '';
                                              }
                                            }}
                        size="small"
                      >
                                            <ArrowForwardRoundedIcon fontSize="small" />
                      </IconButton>
                                        </InputAdornment>
                                      ),
                                      sx: {
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        borderRadius: '8px',
                                      }
                                    }}
                                  />
                                  
                                  {synonymsArray.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                      {synonymsArray.map((synonym, index) => (
                                        <Chip
                                          key={index}
                                          label={synonym}
                                          onDelete={() => handleRemoveSynonym(field, synonym)}
                                          sx={{ 
                                            bgcolor: 'rgba(0, 0, 0, 0.06)',
                                            borderRadius: '16px',
                                            fontFamily: "'Nunito Sans', sans-serif",
                                            fontSize: '0.8125rem',
                                            height: 28,
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                </TableCell>
              </TableRow>
                          );
                        })}
                      </React.Fragment>
                    )
            ))}
          </TableBody>
        </Table>
      </TableContainer>
          </Box>
        </Paper>
      </Box>

      {/* Value Format Modal */}
      <ValueFormatModal
        open={isValueFormatModalOpen}
        onClose={handleCloseFormatModal}
        field={selectedFieldForFormat}
        tableName={selectedTableForFormat}
        currentRules={valueRules}
        projectId={projectId}
        reportId={reportId}
        onSave={(fieldRules) => {
          if (selectedFieldForFormat && selectedTableForFormat) {
            const fieldKey = `${selectedTableForFormat}.${selectedFieldForFormat.columnName}`;
            handleSaveValueRules(fieldKey, fieldRules);
            handleCloseFormatModal();
          }
        }}
      />
    </Box>
  );
};

SynonymManagement.propTypes = {
  projectId: PropTypes.string.isRequired,
  reportId: PropTypes.string.isRequired,
  setHasUnsavedChanges: PropTypes.func.isRequired,
};

export default SynonymManagement; 