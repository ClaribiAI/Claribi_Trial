import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SettingsIcon from '@mui/icons-material/Settings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faCheckSquare, faSquare, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';

const FieldSelection = ({
  tableData,
  setTableData,
  setHasUnsavedChanges,
  loading,
  hasData,
  onUploadClick,
  uploading,
  onDeleteTable,
  onSaveSelection,
  saving,
  onFileUpload,
  fileInputRef,
}) => {
  const [expandedTables, setExpandedTables] = useState({});
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeTableMenu, setActiveTableMenu] = useState({ section: '', tableName: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);

  // Group data by table and type (dimensions/measures)
  const groupedData = tableData.reduce((acc, row) => {
    if (!acc[row.measure ? 'measures' : 'dimensions']) {
      acc[row.measure ? 'measures' : 'dimensions'] = {};
    }
    if (!acc[row.measure ? 'measures' : 'dimensions'][row.table]) {
      acc[row.measure ? 'measures' : 'dimensions'][row.table] = [];
    }
    acc[row.measure ? 'measures' : 'dimensions'][row.table].push(row);
    return acc;
  }, { dimensions: {}, measures: {} });

  const handleToggleSelect = (id) => {
    setTableData(prevData => {
      const newData = prevData.map(row => 
        row.id === id ? { ...row, selected: !row.selected } : row
      );
      setHasUnsavedChanges(true);
      return newData;
    });
  };

  const handleTableMenuOpen = (event, section, tableName) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveTableMenu({ section, tableName });
  };

  const handleTableMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleSelectAll = () => {
    const { section, tableName } = activeTableMenu;
    setTableData(prevData => {
      const newData = prevData.map(row => 
        row.table === tableName && (section === 'dimensions' ? !row.measure : row.measure)
          ? { ...row, selected: true }
          : row
      );
      setHasUnsavedChanges(true);
      return newData;
    });
    handleTableMenuClose();
  };

  const handleDeselectAll = () => {
    const { section, tableName } = activeTableMenu;
    setTableData(prevData => {
      const newData = prevData.map(row => 
        row.table === tableName && (section === 'dimensions' ? !row.measure : row.measure)
          ? { ...row, selected: false }
          : row
      );
      setHasUnsavedChanges(true);
      return newData;
    });
    handleTableMenuClose();
  };

  const handleDeleteTable = () => {
    const { tableName } = activeTableMenu;
    setTableToDelete(tableName);
    setDeleteConfirmOpen(true);
    handleTableMenuClose();
  };

  const handleConfirmDelete = async () => {
    try {
      await onDeleteTable(tableToDelete);
      setDeleteConfirmOpen(false);
      setTableToDelete(null);
    } catch (err) {
      console.error('Error deleting table:', err);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setTableToDelete(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#6a1b9a' }} />
      </Box>
    );
  }

  if (!hasData) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          p: 4,
        }}
      >
        
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            color: '#555555',
            textAlign: 'center',
            maxWidth: '600px',
            mb: 1
          }}
        >
          No tables uploaded yet
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            color: 'text.secondary',
            textAlign: 'center',
            maxWidth: '600px',
            mb: 3
          }}
        >
          You need to upload TMDL files to configure this report. These files contain the metadata about your data model.
        </Typography>
        <input
          type="file"
          multiple
          accept=".tmdl"
          onChange={onFileUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
          onClick={onUploadClick}
          disabled={uploading}
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            backgroundColor: '#555555',
            '&:hover': {
              backgroundColor: '#333333',
            },
            borderRadius: '8px',
            px: 4,
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </Box>
    );
  }

  const renderTableSection = (title, data, section) => (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        bgcolor: 'rgba(0, 0, 0, 0.02)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <Table>
            <TableBody>
              {Object.entries(data).map(([tableName, fields]) => (
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
                      bgcolor: fields.some(field => field.selected) ? 'rgba(252, 192, 0, 0.1)' : 'inherit',
                      '&:hover': {
                        bgcolor: fields.some(field => field.selected) ? 'rgba(252, 192, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)'
                      },
                      position: 'relative'
                    }}
                  >
                    <TableCell sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                        <IconButton
                          size="small"
                          onClick={(e) => handleTableMenuOpen(e, section, tableName)}
                          sx={{
                            color: '#555555',
                            '&:hover': {
                              color: '#FCC000',
                              backgroundColor: 'rgba(252, 192, 0, 0.1)'
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} size="sm" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {expandedTables[tableName] && fields.map((field) => (
                    <TableRow 
                      key={field.id}
                      hover
                      onClick={() => handleToggleSelect(field.id)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: field.selected ? 'rgba(252, 192, 0, 0.1)' : 'inherit',
                        '&:hover': {
                          bgcolor: field.selected ? 'rgba(252, 192, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell sx={{ pl: 10 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox 
                            checked={field.selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(field.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ 
                              color: '#555555',
                              '&.Mui-checked': {
                                color: '#555555',
                              },
                            }}
                          />
                          <Typography sx={{ 
                            fontFamily: "'Nunito Sans', sans-serif",
                            fontSize: '0.875rem'
                          }}>
                            {field.columnName}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <input
          type="file"
          multiple
          accept=".tmdl"
          onChange={onFileUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
          onClick={onUploadClick}
          disabled={uploading}
          sx={{
            fontFamily: '"Nunito Sans", sans-serif',
            backgroundColor: '#555555',
            '&:hover': {
              backgroundColor: '#333333',
            },
            borderRadius: '8px',
            textTransform: 'none'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload More Files'}
        </Button>

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <FontAwesomeIcon icon={faSave} />}
          onClick={onSaveSelection}
          disabled={saving}
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
          {saving ? 'Saving...' : 'Save Selection'}
        </Button>
      </Box>

      {renderTableSection('Dimensions', groupedData.dimensions, 'dimensions')}
      {renderTableSection('Measures', groupedData.measures, 'measures')}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleTableMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
            fontFamily: "'Nunito Sans', sans-serif"
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Show Select All only if not all fields are selected */}
        {activeTableMenu.section && activeTableMenu.tableName && (
          (activeTableMenu.section === 'dimensions' && 
            tableData.filter(row => row.table === activeTableMenu.tableName && !row.measure)
              .some(row => !row.selected)) || 
          (activeTableMenu.section === 'measures' && 
            tableData.filter(row => row.table === activeTableMenu.tableName && row.measure)
              .some(row => !row.selected))
        ) && (
          <MenuItem 
            onClick={handleSelectAll}
            sx={{
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#FCC000' },
                '& .MuiTypography-root': { color: '#FCC000' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <FontAwesomeIcon icon={faCheckSquare} size="sm" />
            </ListItemIcon>
            <ListItemText 
              primary="Select All Fields"
              primaryTypographyProps={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 500
              }}  
            />
          </MenuItem>
        )}
        
        {/* Show Deselect All only if any field is selected */}
        {activeTableMenu.section && activeTableMenu.tableName && (
          (activeTableMenu.section === 'dimensions' && 
            tableData.filter(row => row.table === activeTableMenu.tableName && !row.measure)
              .some(row => row.selected)) || 
          (activeTableMenu.section === 'measures' && 
            tableData.filter(row => row.table === activeTableMenu.tableName && row.measure)
              .some(row => row.selected))
        ) && (
          <MenuItem 
            onClick={handleDeselectAll}
            sx={{
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#FCC000' },
                '& .MuiTypography-root': { color: '#FCC000' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <FontAwesomeIcon icon={faSquare} size="sm" />
            </ListItemIcon>
            <ListItemText 
              primary="Deselect All Fields"
              primaryTypographyProps={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 500
              }}  
            />
          </MenuItem>
        )}

        {/* Add Delete Table option */}
        {activeTableMenu.section && activeTableMenu.tableName && (
          <MenuItem 
            onClick={handleDeleteTable}
            sx={{
              color: '#f44336',
              '&:hover': { 
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
                '& .MuiListItemIcon-root': { color: '#f44336' },
                '& .MuiTypography-root': { color: '#f44336' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <FontAwesomeIcon icon={faTrash} size="sm" />
            </ListItemIcon>
            <ListItemText 
              primary="Delete Table"
              primaryTypographyProps={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 500
              }}  
            />
          </MenuItem>
        )}
      </Menu>

      {/* Delete Table Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-table-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3,
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle 
          id="delete-table-dialog-title"
          sx={{ 
            color: '#f44336',
            fontFamily: "'Nunito Sans', sans-serif",
            fontWeight: 600,
            p: 0,
            mb: 2
          }}
        >
          Delete Table
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Typography
            sx={{
              fontFamily: "'Nunito Sans', sans-serif",
              color: '#555555',
              mb: 2
            }}
          >
            Are you sure you want to delete the table "{tableToDelete}"? This action cannot be undone and will remove all related data including field selections and synonyms.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: 2 }}>
          <Button
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif",
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif",
              px: 3
            }}
          >
            Delete Table
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

FieldSelection.propTypes = {
  tableData: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    table: PropTypes.string.isRequired,
    columnName: PropTypes.string.isRequired,
    dataType: PropTypes.string.isRequired,
    measure: PropTypes.bool.isRequired,
    selected: PropTypes.bool.isRequired,
  })).isRequired,
  setTableData: PropTypes.func.isRequired,
  setHasUnsavedChanges: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  hasData: PropTypes.bool.isRequired,
  onUploadClick: PropTypes.func.isRequired,
  uploading: PropTypes.bool.isRequired,
  onDeleteTable: PropTypes.func.isRequired,
  onSaveSelection: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  fileInputRef: PropTypes.object.isRequired,
};

export default FieldSelection; 