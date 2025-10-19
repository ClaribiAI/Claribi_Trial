// src/components/MarkdownRenderer.jsx

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import Prism from 'prismjs';

// --- Custom Language Registration ---
import { dax } from '../../config/dax_lang';
dax(Prism);

// --- Syntax Highlighting Themes ---
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- UI Components ---
import { Typography, Box, Paper, useTheme, alpha } from '@mui/material';
import { Lightbulb, Warning, Info, CheckCircle } from '@phosphor-icons/react';

const preprocessMarkdown = (text) => {
    if (!text || typeof text !== 'string') return '';
    let processed = text;
    processed = processed.replace(/([^\n])?```\s*dax\s+([^\n`]+)```/gi, (match, prefix, content) => `${prefix || ''}\n\n\`\`\`dax\n${content.trim()}\n\`\`\`\n`);
    processed = processed.replace(/\n(⚠️|💡|ℹ️|✅)/g, '\n\n$1');
    return processed;
};

const specialSectionsMap = {
    '⚠️': { Icon: Warning, color: 'warning' },
    '💡': { Icon: Lightbulb, color: 'info' },
    'ℹ️': { Icon: Info, color: 'primary' },
    '✅': { Icon: CheckCircle, color: 'success' },
};

/**
 * Merges our custom DAX token styles with a base theme to ensure correct coloring.
 * @param {object} theme - The MUI theme object.
 * @returns {object} A style object for react-syntax-highlighter.
 */
const getDaxSyntaxTheme = (theme) => {
    const baseTheme = theme.palette.mode === 'dark' ? vscDarkPlus : oneLight;

    const customStyles = {
        // ✅ DEFINITE FIX FOR FUNCTION COLOR:
        // This rule explicitly targets the 'keyword' token (which includes all DAX functions)
        // and forces its color to be blue, overriding the theme's default.
        'keyword': {
            color: theme.palette.mode === 'dark' ? '#569CD6' : '#0000FF' // VSCode-like blue for dark, standard blue for light
        },

        // This rule correctly styles 'Table'[Column] identifiers
        'table-column': {
            color: theme.palette.mode === 'dark' ? '#4EC9B0' : '#2B91AF' // A teal/cyan color
        },

        // This rule correctly styles [Measure] identifiers
        'measure': {
            color: theme.palette.mode === 'dark' ? '#9CDCFE' : '#0451A5' // Light Blue / Dark Blue
        }
    };
    
    // Merge the base theme with our overrides
    return { ...baseTheme, ...customStyles };
};


const MarkdownRenderer = ({ content, sx = {} }) => {
    const theme = useTheme();
    const processedContent = preprocessMarkdown(content);
    const syntaxTheme = getDaxSyntaxTheme(theme);

    const components = {
        h1: (props) => <Typography variant="h4" component="h1" gutterBottom {...props} />,
        h2: (props) => <Typography variant="h5" component="h2" gutterBottom {...props} />,
        h3: (props) => <Typography variant="h6" component="h3" gutterBottom {...props} />,
        p: ({ node, ...props }) => {
            const text = node?.children[0]?.value || '';
            const emoji = Object.keys(specialSectionsMap).find(e => text.startsWith(e));
            if (emoji) {
                const { Icon, color } = specialSectionsMap[emoji];
                const content = text.substring(emoji.length).trim();
                return (
                    <Paper elevation={0} sx={{ p: 2, my: 1.5, bgcolor: alpha(theme.palette[color].main, 0.08), border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`, borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Icon size={20} color={theme.palette[color].main} style={{ marginTop: '3px' }}/>
                        <Typography variant="body2" component="div" sx={{ flex: 1, lineHeight: 1.7 }}><ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown></Typography>
                    </Paper>
                );
            }
            return <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.7 }} {...props} />;
        },
        ul: (props) => <Box component="ul" sx={{ pl: 3, my: 1.5 }} {...props} />,
        ol: (props) => <Box component="ol" sx={{ pl: 3, my: 1.5 }} {...props} />,
        li: (props) => <Typography component="li" variant="body1" sx={{ mb: 0.5 }} {...props} />,

        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // For code blocks (not inline), use SyntaxHighlighter
            if (!inline && language) {
                return (
                    <SyntaxHighlighter
                        style={syntaxTheme}
                        language={language}
                        PreTag="div"
                        {...props}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                );
            }
            
            // For inline code, use simple styling without background/border
            if (inline) {
                return (
                    <code
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.875em',
                            backgroundColor: 'transparent',
                            color: theme.palette.primary.main,
                            padding: '0',
                            fontWeight: 'bold'
                        }}
                        {...props}
                    >
                        {children}
                    </code>
                );
            }
            
            // Fallback for other code (shouldn't happen normally)
            return (
                <code
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '0.875em',
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        color: theme.palette.text.secondary,
                        padding: '0.25em 0.75em',
                        borderRadius: '4px',
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'inline',
                        whiteSpace: 'nowrap'
                    }}
                    {...props}
                >
                    {children}
                </code>
            );
        }
    };

    return (
        <Box sx={sx} className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {processedContent}
            </ReactMarkdown>
        </Box>
    );
};

export default MarkdownRenderer;