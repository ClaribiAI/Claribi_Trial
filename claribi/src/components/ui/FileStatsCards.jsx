import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    useTheme,
    alpha
} from '@mui/material';
import {
    Clock,
    CheckCircle
} from '@phosphor-icons/react';

const FileStatsCards = ({ files = [] }) => {
    const theme = useTheme();

    // Calculate stats based on files
    const totalFiles = files.length;
    const totalHoursSaved = totalFiles * 2; // Estimate 2 hours saved per file
    const totalTasksCompleted = totalFiles * 5; // Estimate 5 tasks per file

    return (
        <Box display="flex" gap={3} mt={2}>
            {/* Hours Saved Card */}
            <Card
                sx={{
                    flex: 1,
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 20px rgba(0,0,0,0.3)' 
                        : '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark' 
                            ? '0 8px 32px rgba(0,0,0,0.4)' 
                            : '0 8px 32px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box 
                            sx={{ 
                                p: 1.5, 
                                borderRadius: 2, 
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Clock size={24} />
                        </Box>
                        <Box>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    fontWeight: 700, 
                                    color: theme.palette.text.primary,
                                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                    mb: 0.5
                                }}
                            >
                                {totalHoursSaved}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 500
                                }}
                            >
                                Hours saved
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Tasks Completed Card */}
            <Card
                sx={{
                    flex: 1,
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 20px rgba(0,0,0,0.3)' 
                        : '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark' 
                            ? '0 8px 32px rgba(0,0,0,0.4)' 
                            : '0 8px 32px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box 
                            sx={{ 
                                p: 1.5, 
                                borderRadius: 2, 
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <CheckCircle size={24} />
                        </Box>
                        <Box>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    fontWeight: 700, 
                                    color: theme.palette.text.primary,
                                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                    mb: 0.5
                                }}
                            >
                                {totalTasksCompleted}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 500
                                }}
                            >
                                Tasks completed
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default FileStatsCards;
