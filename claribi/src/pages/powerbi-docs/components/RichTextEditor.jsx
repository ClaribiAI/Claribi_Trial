import React, { useRef, useEffect } from 'react';
import { Box, useTheme, alpha } from '@mui/material';

const RichTextEditor = ({ 
    value, 
    onChange, 
    placeholder = "Edit your content here...",
    minHeight = 300 
}) => {
    const theme = useTheme();
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && value !== undefined) {
            // Only update if the content is actually different to avoid cursor jumping
            if (editorRef.current.innerHTML !== (value || '')) {
                editorRef.current.innerHTML = value || '';
            }
        }
    }, [value]);

    const handleInput = (e) => {
        if (onChange) {
            onChange(e.target.innerHTML);
        }
    };

    const handleFocus = () => {
        // Ensure cursor is positioned correctly when focusing
        if (editorRef.current) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    const handleKeyDown = (e) => {
        // Handle keyboard shortcuts for formatting
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline');
                    break;
                case 'k':
                    e.preventDefault();
                    const url = prompt('Enter URL:');
                    if (url) {
                        document.execCommand('createLink', false, url);
                    }
                    break;
                default:
                    break;
            }
        }
    };

    return (
        <Box
            sx={{
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    backgroundColor: theme.palette.background.paper,
                minHeight: minHeight,
                '&:focus-within': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                }
            }}
        >
            {/* Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 0.5,
                    p: 1,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    flexWrap: 'wrap'
                }}
            >
                <button
                    type="button"
                    onClick={() => document.execCommand('bold')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontWeight: 'bold',
                        fontSize: '14px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Bold (Ctrl+B)"
                >
                    B
                </button>
                <button
                    type="button"
                    onClick={() => document.execCommand('italic')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontStyle: 'italic',
                        fontSize: '14px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Italic (Ctrl+I)"
                >
                    I
                </button>
                <button
                    type="button"
                    onClick={() => document.execCommand('underline')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        textDecoration: 'underline',
                        fontSize: '14px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Underline (Ctrl+U)"
                >
                    U
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: alpha(theme.palette.divider, 0.12), margin: '4px 8px' }} />
                <button
                    type="button"
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const h1 = document.createElement('h1');
                            h1.style.margin = '0';
                            h1.style.fontSize = '1.5em';
                            h1.style.fontWeight = '600';
                            h1.style.color = theme.palette.text.primary;
                            try {
                                range.surroundContents(h1);
                            } catch (e) {
                                h1.appendChild(range.extractContents());
                                range.insertNode(h1);
                            }
                            selection.removeAllRanges();
                            selection.addRange(document.createRange());
                            selection.selectNodeContents(h1);
                            selection.collapseToEnd();
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Heading 1"
                >
                    H1
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const h2 = document.createElement('h2');
                            h2.style.margin = '0';
                            h2.style.fontSize = '1.25em';
                            h2.style.fontWeight = '600';
                            h2.style.color = theme.palette.text.primary;
                            try {
                                range.surroundContents(h2);
                            } catch (e) {
                                h2.appendChild(range.extractContents());
                                range.insertNode(h2);
                            }
                            selection.removeAllRanges();
                            selection.addRange(document.createRange());
                            selection.selectNodeContents(h2);
                            selection.collapseToEnd();
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Heading 2"
                >
                    H2
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const ul = document.createElement('ul');
                            const li = document.createElement('li');
                            li.style.margin = '0';
                            li.style.color = theme.palette.text.secondary;
                            try {
                                range.surroundContents(li);
                                ul.appendChild(li);
                                range.insertNode(ul);
                            } catch (e) {
                                li.appendChild(range.extractContents());
                                ul.appendChild(li);
                                range.insertNode(ul);
                            }
                            selection.removeAllRanges();
                            selection.addRange(document.createRange());
                            selection.selectNodeContents(li);
                            selection.collapseToEnd();
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Bullet List"
                >
                    •
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const ol = document.createElement('ol');
                            const li = document.createElement('li');
                            li.style.margin = '0';
                            li.style.color = theme.palette.text.secondary;
                            try {
                                range.surroundContents(li);
                                ol.appendChild(li);
                                range.insertNode(ol);
                            } catch (e) {
                                li.appendChild(range.extractContents());
                                ol.appendChild(li);
                                range.insertNode(ol);
                            }
                            selection.removeAllRanges();
                            selection.addRange(document.createRange());
                            selection.selectNodeContents(li);
                            selection.collapseToEnd();
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Numbered List"
                >
                    1.
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: alpha(theme.palette.divider, 0.12), margin: '4px 8px' }} />
                <button
                    type="button"
                    onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) {
                            document.execCommand('createLink', false, url);
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                    }}
                    title="Insert Link (Ctrl+K)"
                >
                    🔗
                </button>
            </Box>

            {/* Editor */}
            <Box
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                sx={{
                    minHeight: minHeight - 60,
                    p: 2,
                    outline: 'none',
                    color: theme.palette.text.primary,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                        fontFamily: 'inherit',
                    '&:empty:before': {
                        content: `"${placeholder}"`,
                            color: theme.palette.text.disabled,
                        fontStyle: 'italic',
                        pointerEvents: 'none'
                },
                    '& h1': {
                        fontSize: '1.5em',
                        fontWeight: 600,
                    color: theme.palette.text.primary,
                        margin: '0.5em 0',
                        lineHeight: 1.2
                    },
                    '& h2': {
                        fontSize: '1.25em',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        margin: '0.5em 0',
                        lineHeight: 1.3
                    },
                    '& h3': {
                        fontSize: '1.1em',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        margin: '0.5em 0',
                        lineHeight: 1.4
                    },
                    '& p': {
                        margin: '0.5em 0',
                        color: theme.palette.text.secondary,
                        lineHeight: 1.7
                    },
                    '& strong': {
                        fontWeight: 600,
                        color: theme.palette.text.primary
                    },
                    '& em': {
                        fontStyle: 'italic'
                    },
                    '& u': {
                        textDecoration: 'underline'
                    },
                    '& ul, & ol': {
                        margin: '0.5em 0',
                        paddingLeft: '1.5em'
                    },
                    '& li': {
                        margin: '0.25em 0',
                        color: theme.palette.text.secondary
                    },
                    '& a': {
                        color: theme.palette.primary.main,
                        textDecoration: 'underline',
                        '&:hover': {
                            textDecoration: 'none'
                        }
                    },
                    '& blockquote': {
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                        paddingLeft: 16,
                        fontStyle: 'italic',
                        color: theme.palette.text.secondary,
                        backgroundColor: theme.palette.mode === 'dark' ? alpha('#FCC000', 0.05) : alpha(theme.palette.primary.main, 0.02),
                        padding: '8px 16px',
                        borderRadius: '0 4px 4px 0',
                        margin: '16px 0'
                    },
                    '& code': {
                        backgroundColor: alpha(theme.palette.grey[900], 0.05),
                        color: theme.palette.text.primary,
                        padding: '2px 4px',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace'
                    },
                    '& pre': {
                        backgroundColor: alpha(theme.palette.grey[900], 0.05),
                        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        borderRadius: 4,
                        padding: 12,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                    }
                }}
            />
        </Box>
    );
};

export default RichTextEditor;
