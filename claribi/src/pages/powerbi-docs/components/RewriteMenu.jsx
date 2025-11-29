import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    useTheme,
    alpha,
    Box,
    Typography,
    Fade
} from '@mui/material';
import {
    TextTIcon,
    BriefcaseIcon,
    ChatCircleIcon,
    SparkleIcon
} from '@phosphor-icons/react';

const RewriteMenu = ({
    open,
    anchorPosition,
    onClose,
    onSelectStyle,
    isLoading
}) => {
    const theme = useTheme();

    const handleMenuItemClick = (style) => {
        if (!isLoading) {
            onSelectStyle(style);
        }
    };

    const handleMenuClose = (event, reason) => {
        // Don't close menu if loading
        if (isLoading) {
            return;
        }
        if (onClose) {
            onClose(event, reason);
        }
    };

    const menuItems = [
        {
            style: 'concise',
            label: 'Make Concise',
            description: 'Shorten and simplify',
            icon: <TextTIcon size={18} weight="regular" />,
            color: theme.palette.info.main
        },
        {
            style: 'professional',
            label: 'Make Professional',
            description: 'Formal business tone',
            icon: <BriefcaseIcon size={18} weight="regular" />,
            color: theme.palette.primary.main
        },
        {
            style: 'casual',
            label: 'Make Casual',
            description: 'Friendly and relaxed',
            icon: <ChatCircleIcon size={18} weight="regular" />,
            color: theme.palette.success.main
        }
    ];

    return (
        <Menu
            open={open}
            onClose={handleMenuClose}
            anchorReference="anchorPosition"
            anchorPosition={anchorPosition ? { top: anchorPosition.y, left: anchorPosition.x } : { top: 0, left: 0 }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right'
            }}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
            }}
            PaperProps={{
                sx: {
                    width: 200,
                    maxWidth: 200,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: theme.shadows[12],
                    mb: 1,
                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    mt: 0.5
                }
            }}
            MenuListProps={{
                sx: {
                        py: 0,
                        position: 'relative',
                        zIndex: 1
                }
            }}
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 200 }}
        >
                {/* Header */}
                <Box
                    sx={{
                        px: 1.5,
                        py: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`
                    }}
                >
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Box
                            sx={{
                                p: 0.5,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <SparkleIcon size={14} weight="fill" />
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                letterSpacing: '-0.01em',
                                fontSize: '0.75rem'
                            }}
                        >
                            Rewrite Style
                        </Typography>
                    </Box>
                </Box>
            
                {/* Menu Items */}
                <Box sx={{ py: 0.25 }}>
                    {menuItems.map((item) => (
                        <MenuItem
                            key={item.style}
                            onClick={() => handleMenuItemClick(item.style)}
                            disabled={isLoading}
                            sx={{
                                py: 1,
                                px: 1.5,
                                mx: 0.5,
                                my: 0.125,
                                borderRadius: 1.5,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    backgroundColor: isLoading 
                                        ? 'transparent' 
                                        : alpha(item.color, 0.08),
                                    transform: isLoading ? 'none' : 'translateX(2px)',
                                    '& .menu-item-icon': {
                                        color: item.color,
                                        transform: 'scale(1.1)'
                                    },
                                    '& .menu-item-label': {
                                        color: theme.palette.text.primary
                                    }
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed'
                                },
                                '&:not(:last-child)': {
                                    mb: 0.125
                                }
                            }}
                        >
                            <ListItemIcon 
                                sx={{ 
                                    minWidth: 32,
                                    color: isLoading 
                                        ? theme.palette.text.secondary 
                                        : alpha(item.color, 0.7),
                                    transition: 'all 0.2s ease-in-out'
                                }}
                                className="menu-item-icon"
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography
                                        variant="body2"
                                        className="menu-item-label"
                                        sx={{
                                            fontWeight: 500,
                                            color: theme.palette.text.primary,
                                            transition: 'color 0.2s ease-in-out',
                                            mb: 0.125,
                                            fontSize: '0.8125rem',
                                            lineHeight: 1.3
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                }
                                secondary={
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            fontSize: '0.6875rem',
                                            lineHeight: 1.2
                                        }}
                                    >
                                        {item.description}
                                    </Typography>
                                }
                                primaryTypographyProps={{
                                    component: 'div'
                                }}
                                secondaryTypographyProps={{
                                    component: 'div'
                                }}
                            />
                        </MenuItem>
                    ))}
                </Box>

                {/* Professional Loading Overlay */}
                {isLoading && (
                    <Fade in={isLoading} timeout={300}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 1300,
                                bgcolor: alpha(theme.palette.background.paper, 0.98),
                                backdropFilter: 'blur(8px)',
                                borderRadius: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                p: 2
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <CircularProgress
                                    size={48}
                                    thickness={3.5}
                                    sx={{
                                        color: theme.palette.primary.main,
                                        position: 'absolute',
                                        '& .MuiCircularProgress-circle': {
                                            strokeLinecap: 'round'
                                        }
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        p: 0.875,
                                        borderRadius: '50%',
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                    }}
                                >
                                    <SparkleIcon 
                                        size={20} 
                                        weight="fill" 
                                        color={theme.palette.primary.main}
                                    />
                                </Box>
                            </Box>
                            <Box sx={{ textAlign: 'center', maxWidth: 160 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: theme.palette.text.primary,
                                        mb: 0.5,
                                        letterSpacing: '-0.01em',
                                        fontSize: '0.8125rem'
                                    }}
                                >
                                    Rewriting content
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.6875rem',
                                        lineHeight: 1.4,
                                        display: 'block'
                                    }}
                                >
                                    Please wait while we enhance your text...
                                </Typography>
                            </Box>
                        </Box>
                    </Fade>
                )}
        </Menu>
    );
};

export default RewriteMenu;

