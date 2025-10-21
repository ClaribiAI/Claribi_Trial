import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import MDEditor from '@uiw/react-md-editor';

const RichTextEditor = ({ 
    value, 
    onChange, 
    placeholder = "Edit your content here...",
    minHeight = 300 
}) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                '& .w-md-editor': {
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                },
                '& .w-md-editor-toolbar': {
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    '& button': {
                        color: theme.palette.text.primary,
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                        },
                        '&.active': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            color: theme.palette.primary.main,
                        }
                    }
                },
                '& .w-md-editor-text': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    color: theme.palette.text.primary,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    minHeight: minHeight,
                    '& .w-md-editor-text-input': {
                        color: 'inherit',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        '&::placeholder': {
                            color: theme.palette.text.disabled,
                        }
                    }
                },
                '& .w-md-editor-preview': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.6),
                    color: theme.palette.text.primary,
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                    },
                    '& p': {
                        color: theme.palette.text.secondary,
                        lineHeight: 1.7,
                    },
                    '& strong': {
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                    },
                    '& em': {
                        fontStyle: 'italic',
                    },
                    '& u': {
                        textDecoration: 'underline',
                    },
                    '& mark': {
                        backgroundColor: theme.palette.warning.light,
                        color: theme.palette.warning.contrastText,
                        padding: '2px 4px',
                        borderRadius: 2,
                    },
                    '& code': {
                        backgroundColor: alpha(theme.palette.grey[900], 0.05),
                        color: theme.palette.text.primary,
                        padding: '2px 4px',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                    },
                    '& pre': {
                        backgroundColor: alpha(theme.palette.grey[900], 0.05),
                        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        borderRadius: 4,
                        padding: 12,
                        overflow: 'auto',
                    },
                    '& blockquote': {
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                        paddingLeft: 16,
                        fontStyle: 'italic',
                        color: theme.palette.text.secondary,
                        backgroundColor: theme.palette.mode === 'dark' ? alpha('#FCC000', 0.05) : alpha(theme.palette.primary.main, 0.02),
                        padding: '8px 16px',
                        borderRadius: '0 4px 4px 0',
                        margin: '16px 0',
                    }
                }
            }}
        >
            <MDEditor
                value={value || ''}
                onChange={(val) => onChange(val || '')}
                data-color-mode={theme.palette.mode}
                height={minHeight}
                visibleDragBar={false}
                hideToolbar={false}
                textareaProps={{
                    placeholder: placeholder,
                    style: {
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                    }
                }}
                preview="edit"
            />
        </Box>
    );
};

export default RichTextEditor;
