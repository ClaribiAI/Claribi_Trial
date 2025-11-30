import React from 'react';
import {
    Box,
    Typography,
    Button,
    Tooltip,
    Menu,
    MenuItem,
    CircularProgress,
    useTheme,
    alpha,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    ArrowLeft,
    CaretDownIcon,
    DotsThreeVertical,
    CloudArrowUp,
    Question
} from '@phosphor-icons/react';

const DocumentationHeader = ({
    selectedFile,
    onBack,
    onGenerateAllClick,
    onRetriggerOnboarding,
    onMenuOpen,
    onReuploadFile,
    sectionLoading,
    reuploadingFile,
    generateAllButtonRef,
    menuButtonRef,
    menuAnchorEl,
    menuOpen,
    onMenuClose
}) => {
    const theme = useTheme();
    const isGenerating = Object.values(sectionLoading || {}).some(isLoading => isLoading);

    return (
        <Box 
            sx={{ 
                bgcolor: theme.palette.sidebar.background,
                py: 1.5,
                px: 3
            }}
        >
            <Box display="flex" alignItems="center" gap={2}>
                {/* Back Button */}
                <Tooltip title="Back to file management">
                    <Button
                        onClick={onBack}
                        sx={{
                            minWidth: 'auto',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'transparent',
                            color: theme.palette.text.secondary,
                            p: 0,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </Button>
                </Tooltip>
                
                {/* File Name */}
                <Typography variant="h6" component="h1" sx={{ 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {selectedFile?.filename}
                </Typography>

                {/* Action Button with Dropdown */}
                <Button
                    ref={generateAllButtonRef}
                    onClick={onGenerateAllClick}
                    disabled={isGenerating}
                    variant="contained"
                    size="small"
                    endIcon={isGenerating ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <CaretDownIcon size={16} color={theme.palette.primary.contrastText} />}
                    sx={{ 
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        fontFamily: "'Nunito Sans', sans-serif",
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            color: theme.palette.primary.contrastText
                        },
                        '&:disabled': {
                            bgcolor: alpha(theme.palette.primary.main, 0.3)
                        }
                    }}
                >
                    {isGenerating ? 'Generating...' : 'Generate All'}
                </Button>

                {/* Help/Onboarding Button */}
                <Tooltip title="Need help?">
                    <Button
                        onClick={onRetriggerOnboarding}
                        sx={{
                            minWidth: 'auto',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'transparent',
                            color: theme.palette.text.secondary,
                            p: 0,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Question size={20} />
                    </Button>
                </Tooltip>

                {/* 3 Dots Menu Button */}
                <Tooltip title="More options">
                    <Button
                        ref={menuButtonRef}
                        onClick={onMenuOpen}
                        sx={{
                            minWidth: 'auto',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'transparent',
                            color: theme.palette.text.secondary,
                            p: 0,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <DotsThreeVertical size={20} />
                    </Button>
                </Tooltip>

                {/* 3 Dots Menu */}
                <Menu
                    anchorEl={menuAnchorEl}
                    open={menuOpen}
                    onClose={onMenuClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    PaperProps={{
                        sx: {
                            mt: 1,
                            minWidth: 200,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }
                    }}
                >
                    <MenuItem 
                        onClick={onReuploadFile}
                        disabled={reuploadingFile || !selectedFile}
                    >
                        <ListItemIcon>
                            {reuploadingFile ? (
                                <CircularProgress size={20} />
                            ) : (
                                <CloudArrowUp size={20} />
                            )}
                        </ListItemIcon>
                        <ListItemText>
                            {reuploadingFile ? 'Reuploading...' : 'Reupload file'}
                        </ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default DocumentationHeader;

