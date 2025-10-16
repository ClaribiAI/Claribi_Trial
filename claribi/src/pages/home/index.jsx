import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    useTheme,
    alpha
} from '@mui/material';
import {
    ChatCircle,
    FileText
} from '@phosphor-icons/react';

const Home = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const handleNavigateToChat = () => {
        navigate('/powerbi-chat');
    };

    const handleNavigateToDocs = () => {
        navigate('/powerbi-docs');
    };

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Main Content */}
            <Box 
                sx={{
                    width: '100%',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: 8,
                    px: 4
                }}
            >
                {/* Welcome Header */}
                <Box 
                    sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 6
                    }}
                >
                    <Box
                        component="img"
                        src={theme.palette.mode === 'dark' ? '/claribi_icon_logo_dark.png' : '/claribi_icon_logo_light.png'}
                        alt="Claribi Logo"
                        sx={{ 
                            width: 80, 
                            height: 80,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                                transform: 'scale(1.05)'
                            }
                        }}
                    />
                </Box>
                
                <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    mb: 2, 
                    color: theme.palette.text.primary,
                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                }}>
                    Welcome to Claribi
                </Typography>
                
                <Typography variant="h6" sx={{ 
                    color: theme.palette.text.secondary, 
                    mb: 8, 
                    maxWidth: 600,
                    lineHeight: 1.6,
                    fontWeight: 400
                }}>
                    Choose your Power BI experience. Chat with your data or generate comprehensive documentation.
                </Typography>

                {/* Options Cards */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        gap: 4, 
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        maxWidth: 800
                    }}
                >
                    {/* Chat Option */}
                    <Card
                        onClick={handleNavigateToChat}
                        sx={{
                            flex: '1 1 300px',
                            minWidth: 300,
                            maxWidth: 400,
                            cursor: 'pointer',
                            borderRadius: 4,
                            bgcolor: theme.palette.background.paper,
                            border: `2px solid ${alpha(theme.palette.divider, 0.12)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: theme.palette.mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.15)',
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                '& .option-icon': {
                                    transform: 'scale(1.1)',
                                    color: theme.palette.primary.main
                                }
                            }
                        }}
                    >
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Box 
                                sx={{ 
                                    p: 3, 
                                    borderRadius: 3, 
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: theme.palette.primary.main,
                                    mb: 3,
                                    display: 'inline-flex',
                                    transition: 'all 0.3s ease'
                                }}
                                className="option-icon"
                            >
                                <ChatCircle size={48} />
                            </Box>
                            
                            <Typography variant="h5" sx={{ 
                                fontWeight: 600, 
                                mb: 2, 
                                color: theme.palette.text.primary,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                            }}>
                                Power BI Chat
                            </Typography>
                            
                            <Typography variant="body1" sx={{ 
                                color: theme.palette.text.secondary, 
                                lineHeight: 1.6,
                                mb: 3
                            }}>
                                Upload your Power BI file and have interactive conversations with your data. Get instant answers, insights, and recommendations.
                            </Typography>
                            
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: 1,
                                    color: theme.palette.primary.main,
                                    fontWeight: 500,
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Typography variant="body2" sx={{ color: 'inherit' }}>
                                    Start Chatting
                                </Typography>
                                <Box sx={{ 
                                    width: 0, 
                                    height: 0, 
                                    borderLeft: `6px solid ${theme.palette.primary.main}`,
                                    borderTop: '4px solid transparent',
                                    borderBottom: '4px solid transparent'
                                }} />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Docs Option */}
                    <Card
                        onClick={handleNavigateToDocs}
                        sx={{
                            flex: '1 1 300px',
                            minWidth: 300,
                            maxWidth: 400,
                            cursor: 'pointer',
                            borderRadius: 4,
                            bgcolor: theme.palette.background.paper,
                            border: `2px solid ${alpha(theme.palette.divider, 0.12)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: theme.palette.mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.15)',
                                borderColor: alpha(theme.palette.secondary.main, 0.3),
                                '& .option-icon': {
                                    transform: 'scale(1.1)',
                                    color: theme.palette.secondary.main
                                }
                            }
                        }}
                    >
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Box 
                                sx={{ 
                                    p: 3, 
                                    borderRadius: 3, 
                                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                                    color: theme.palette.secondary.main,
                                    mb: 3,
                                    display: 'inline-flex',
                                    transition: 'all 0.3s ease'
                                }}
                                className="option-icon"
                            >
                                <FileText size={48} />
                            </Box>
                            
                            <Typography variant="h5" sx={{ 
                                fontWeight: 600, 
                                mb: 2, 
                                color: theme.palette.text.primary,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                            }}>
                                Power BI Docs
                            </Typography>
                            
                            <Typography variant="body1" sx={{ 
                                color: theme.palette.text.secondary, 
                                lineHeight: 1.6,
                                mb: 3
                            }}>
                                Generate comprehensive documentation and analysis reports for your Power BI files. Get detailed insights on data models, security, and recommendations.
                            </Typography>
                            
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: 1,
                                    color: theme.palette.secondary.main,
                                    fontWeight: 500,
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Typography variant="body2" sx={{ color: 'inherit' }}>
                                    Generate Docs
                                </Typography>
                                <Box sx={{ 
                                    width: 0, 
                                    height: 0, 
                                    borderLeft: `6px solid ${theme.palette.secondary.main}`,
                                    borderTop: '4px solid transparent',
                                    borderBottom: '4px solid transparent'
                                }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default Home;
