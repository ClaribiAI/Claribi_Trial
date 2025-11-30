import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    useTheme
} from '@mui/material';

const SectionTabs = ({
    sections,
    activeTab,
    onTabChange,
    sectionTabsRef
}) => {
    const theme = useTheme();

    return (
        <Paper 
            ref={sectionTabsRef}
            sx={{ 
                mb: 4, 
                borderRadius: 2,
                boxShadow: theme.shadows[1],
                overflow: 'hidden',
                bgcolor: theme.palette.background.paper,
                position: 'relative',
                zIndex: 1
            }}
        >
            <Tabs
                value={activeTab}
                onChange={onTabChange}
                variant="fullWidth"
                sx={{
                    '& .MuiTabs-indicator': {
                        height: 2,
                        borderRadius: '2px 2px 0 0'
                    },
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 500,
                        minHeight: 56,
                        px: 1.5,
                        fontSize: '0.875rem',
                        color: 'inherit',
                        minWidth: 0,
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        '&:hover': {
                            backgroundColor: theme.palette.background.hover
                        },
                        '&.Mui-selected': {
                            fontWeight: 600,
                            color: 'inherit'
                        }
                    }
                }}
            >
                {sections.map((section) => (
                    <Tab
                        key={section.id}
                        label={
                            <Box 
                                display="flex" 
                                alignItems="center" 
                                gap={0.5} 
                                sx={{ 
                                    minWidth: 0,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    textAlign: 'center'
                                }}
                            >
                                <Box sx={{ fontSize: '1rem' }}>
                                    {section.icon}
                                </Box>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: 'inherit',
                                        fontSize: 'inherit',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'center'
                                    }}
                                >
                                    {section.title}
                                </Typography>
                            </Box>
                        }
                    />
                ))}
            </Tabs>
        </Paper>
    );
};

export default SectionTabs;

