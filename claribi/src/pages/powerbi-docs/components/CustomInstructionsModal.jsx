import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    useTheme,
    Tooltip,
    alpha,
    Divider
} from '@mui/material';
import {
    ArrowClockwiseIcon,
    SparkleIcon,
    FilePdf,
    Question,
    X
} from '@phosphor-icons/react';

// Enhanced Custom Instructions Modal
const CustomInstructionsModal = ({ 
    showModal, 
    onClose, 
    currentSection, 
    customInstructions, 
    setCustomInstructions, 
    onRegenerate, 
    isLoading,
    formattingPDF,
    onPDFInputChange,
    onPDFRemove,
    pdfInputRef
}) => {
    const theme = useTheme();
    
    return (
        <Dialog 
            open={showModal} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[20]
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <ArrowClockwiseIcon size={20} color={theme.palette.primary.main} />
                    <Typography variant="h6" component="span">
                        Regenerate {currentSection?.title}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Provide specific instructions on how you'd like to modify this section. For example: 
                    "Focus more on security best practices" or "Include specific metrics and KPIs".
                </Typography>
                <TextField
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter your custom instructions here... (optional)"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
                
                <Divider sx={{ my: 3 }} />
                
                {/* PDF Style Reference Section */}
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Style Reference (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload a PDF to match the style, tone, and formatting of your generated documentation.
                </Typography>
                
                {/* PDF Status Display */}
                {formattingPDF && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1,
                            mb: 1.5,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button
                        fullWidth
                        variant={formattingPDF ? "outlined" : "outlined"}
                        onClick={() => pdfInputRef.current?.click()}
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
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Documentation will match the style of: {formattingPDF.filename}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button 
                    onClick={onClose} 
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
                    sx={{ 
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        borderRadius: 2, 
                        minWidth: 120,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            color: theme.palette.primary.contrastText
                        },
                        '&:disabled': {
                            bgcolor: theme.palette.action.disabledBackground
                        }
                    }}
                >
                    {isLoading ? 'Generating...' : 'Regenerate'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomInstructionsModal;
