import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    useTheme,
    alpha
} from '@mui/material';
import {
    CloudArrowUp,
    ChatCircle,
    FileText
} from '@phosphor-icons/react';
import FileTable from '../../components/ui/FileTable';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useFiles } from '../../contexts/FileContext';

const FileManagementPage = ({ 
    onFileClick, 
    onFileDelete, 
    onChatClick, 
    onDocsClick, 
    onDiagnosticsClick,
    onUploadNew 
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { files, loading, error } = useFiles();

    return (
        <Box 
            sx={{
                flexGrow: 1,
                pt: 1,
                pb: 4,
                px: 4,
                bgcolor: theme.palette.background.chat,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {loading ? (
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
                        <CloudArrowUp size={64} />
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
                        Upload a Power BI (.pbix) file to get started. Choose between interactive chat or comprehensive documentation generation.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<ChatCircle size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                            onClick={() => navigate('/powerbi-chat')}
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
                            Start Chatting
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<FileText size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                            onClick={() => navigate('/powerbi-docs')}
                            sx={{ 
                                borderRadius: 3, 
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                                height: 48,
                                bgcolor: theme.palette.secondary.main,
                                color: theme.palette.secondary.contrastText,
                                '&:hover': { 
                                    bgcolor: theme.palette.secondary.dark,
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Generate Docs
                        </Button>
                    </Box>
                </Box>
            ) : (
                <FileTable 
                    files={files} 
                    onFileClick={onFileClick}
                    onFileDelete={onFileDelete}
                    actionType="both"
                    onChatClick={onChatClick}
                    onDocsClick={onDocsClick}
                    onDiagnosticsClick={onDiagnosticsClick}
                    showUploadButton={false}
                />
            )}
        </Box>
    );
};

export default FileManagementPage;

