import React from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    useTheme,
    alpha
} from '@mui/material';
import {
    CloudArrowUpIcon,
    ChartBarIcon
} from '@phosphor-icons/react';
import FileTable from '../../components/ui/FileTable';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useFiles } from '../../contexts/FileContext';

const FileManagementPage = ({ onFileSelect, onUploadNew }) => {
    const theme = useTheme();
    const { files, loading: filesLoading, error, loadFiles, removeFile } = useFiles();

    const handleFileClick = (file) => {
        onFileSelect(file);
    };

    const handleFileDelete = (deletedFile) => {
        removeFile(deletedFile);
    };

    return (
        <>
            {/* Header */}
            <Box 
                sx={{ 
                    bgcolor: theme.palette.sidebar.background,
                    py: 3,
                    px: 4,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
            >
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box>
                        <Typography variant="h4" sx={{ 
                            fontWeight: 700, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                            mb: 0.5
                        }}>
                            Instant Documentation - with a Single Click
                        </Typography>
                        <Typography variant="h6" sx={{ 
                            color: theme.palette.text.secondary, 
                            fontWeight: 400
                        }}>
                            Expert data model analysis and comprehensive documentation generation
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* File Table */}
            <Box 
                sx={{ 
                    flexGrow: 1, 
                    py: 4,
                    px: 4,
                    bgcolor: theme.palette.background.chat,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {filesLoading ? (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            py: 8,
                            px: 4
                        }}
                    >
                        <LoadingSpinner size={48} />
                    </Box>
                ) : error ? (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            textAlign: 'center',
                            py: 8,
                            px: 4
                        }}
                    >
                        <Alert 
                            severity="error" 
                            sx={{ mb: 3, maxWidth: 500 }}
                        >
                            {error}
                        </Alert>
                        <Button
                            variant="contained"
                            onClick={loadFiles}
                            sx={{
                                borderRadius: 3,
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                            }}
                        >
                            Try Again
                        </Button>
                    </Box>
                ) : files.length === 0 ? (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            textAlign: 'center',
                            py: 8,
                            px: 4
                        }}
                    >
                        <Box 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                                mb: 4,
                                border: `2px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.15)}`,
                                boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                        >
                            <ChartBarIcon size={64} />
                        </Box>
                        <Typography variant="h3" sx={{ 
                            fontWeight: 700, 
                            mb: 2, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                        }}>
                            No files uploaded yet
                        </Typography>
                        <Typography variant="h6" sx={{ 
                            color: theme.palette.text.secondary, 
                            mb: 6, 
                            maxWidth: 600,
                            lineHeight: 1.6,
                            fontWeight: 400
                        }}>
                            Upload a Power BI (.pbix) file to get started. I'll analyze your data model and provide comprehensive documentation.
                        </Typography>
                        
                        <Button
                            variant="contained"
                            startIcon={<CloudArrowUpIcon size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                            onClick={onUploadNew}
                            sx={{
                                borderRadius: 3,
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                                height: 48,
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                '&:hover': { 
                                    bgcolor: theme.palette.primary.dark,
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Upload Your First File
                        </Button>
                    </Box>
                ) : (
                    <FileTable 
                        files={files} 
                        onFileClick={handleFileClick}
                        onUploadNew={onUploadNew}
                        onFileDelete={handleFileDelete}
                        actionType="docs"
                    />
                )}
            </Box>
        </>
    );
};

export default FileManagementPage;
