import React from 'react';
import {
    Box,
    Typography,
    Button,
    Menu,
    MenuItem,
    Checkbox,
    Divider,
    CircularProgress,
    Tooltip,
    useTheme,
    alpha,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    SparkleIcon,
    FilePdf,
    X,
    Question
} from '@phosphor-icons/react';

const SectionSelectionMenu = ({
    anchorEl,
    open,
    onClose,
    sections,
    selectedSections,
    onSectionToggle,
    onGenerateSelected,
    sectionLoading,
    formattingPDF,
    onPDFInputChange,
    onPDFRemove,
    pdfInputRef,
    selectedFile,
    theme
}) => {
    const isGenerating = Object.values(sectionLoading || {}).some(isLoading => isLoading);

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    minWidth: 300,
                    maxHeight: formattingPDF ? 600 : 500,
                    borderRadius: 2,
                    boxShadow: theme.shadows[8],
                    mt: 1
                }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
            {/* Header */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Select Sections to Generate
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Choose which documentation sections you'd like to generate
                </Typography>
            </Box>

            {/* Section List */}
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {sections.map((section) => (
                    <MenuItem
                        key={section.id}
                        onClick={() => onSectionToggle(section.id)}
                        sx={{
                            py: 1,
                            px: 2,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.04)
                            }
                        }}
                    >
                        <Checkbox
                            checked={selectedSections.includes(section.id)}
                            sx={{
                                p: 0.5,
                                '&.Mui-checked': {
                                    color: theme.palette.primary.main
                                }
                            }}
                        />
                        <ListItemIcon sx={{ minWidth: 32, color: selectedSections.includes(section.id) ? theme.palette.primary.main : theme.palette.text.secondary }}>
                            {section.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={section.title}
                            secondary={section.description}
                            primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: selectedSections.includes(section.id) ? 500 : 400
                            }}
                            secondaryTypographyProps={{
                                variant: 'caption',
                                color: 'text.secondary'
                            }}
                        />
                    </MenuItem>
                ))}
            </Box>

            <Divider />

            {/* Generate Button */}
            <Box sx={{ p: 2 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onGenerateSelected}
                    disabled={selectedSections.length === 0 || isGenerating}
                    startIcon={isGenerating ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
                    sx={{
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        borderRadius: 2,
                        mb: 1.5,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            color: theme.palette.primary.contrastText
                        },
                        '&:disabled': {
                            bgcolor: theme.palette.action.disabledBackground
                        }
                    }}
                >
                    {isGenerating ? 'Generating...' : `Generate ${selectedSections.length} Section${selectedSections.length !== 1 ? 's' : ''}`}
                </Button>

                {/* PDF Upload Option */}
                <Divider sx={{ my: 1.5 }} />
                
                {/* PDF Status Display */}
                {formattingPDF && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1,
                            mb: 1,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <FilePdf size={18} color={theme.palette.primary.main} />
                            <Typography
                                variant="body2"
                                sx={{
                                    color: theme.palette.primary.main,
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {formattingPDF.filename}
                            </Typography>
                        </Box>
                        <Tooltip title="Remove PDF template">
                            <Button
                                onClick={onPDFRemove}
                                size="small"
                                sx={{
                                    minWidth: 'auto',
                                    width: 24,
                                    height: 24,
                                    p: 0,
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                        color: theme.palette.error.main
                                    }
                                }}
                            >
                                <X size={14} />
                            </Button>
                        </Tooltip>
                    </Box>
                )}

                {/* PDF Upload Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: formattingPDF ? 0.5 : 0 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => pdfInputRef.current?.click()}
                        disabled={!selectedFile}
                        startIcon={<FilePdf size={16} />}
                        sx={{
                            borderColor: formattingPDF ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.text.secondary, 0.3),
                            color: formattingPDF ? theme.palette.primary.main : theme.palette.text.secondary,
                            borderRadius: 2,
                            textTransform: 'none',
                            flex: 1,
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                color: theme.palette.primary.main
                            },
                            '&:disabled': {
                                borderColor: theme.palette.action.disabledBackground,
                                color: theme.palette.action.disabled
                            }
                        }}
                    >
                        {formattingPDF 
                            ? 'Replace Style Reference' 
                            : 'Use PDF as Style Reference'}
                    </Button>
                    <Tooltip 
                        title={
                            <Box sx={{ p: 0.5 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Upload a PDF document to use as a formatting template. The generated documentation will match the style, tone, language, and structure of your PDF example.
                                </Typography>
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                    The PDF is only used during generation and is not stored permanently.
                                </Typography>
                            </Box>
                        }
                        arrow
                        placement="top"
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                color: theme.palette.text.secondary,
                                cursor: 'help',
                                flexShrink: 0,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main
                                }
                            }}
                        >
                            <Question size={14} weight="fill" />
                        </Box>
                    </Tooltip>
                </Box>
                <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={onPDFInputChange}
                    style={{ display: 'none' }}
                />
                {formattingPDF && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                        Documentation will match the style of: {formattingPDF.filename}
                    </Typography>
                )}
            </Box>
        </Menu>
    );
};

export default SectionSelectionMenu;

