// src/components/MarkdownRenderer.jsx

import React, { memo, useMemo } from 'react';
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
import { Typography, Box, Paper, useTheme, alpha, Button, Tooltip } from '@mui/material';
import { Lightbulb, Warning, Info, CheckCircle, Copy } from '@phosphor-icons/react';
import { useState } from 'react';

const preprocessMarkdown = (text) => {
    if (!text || typeof text !== 'string') return '';
    let processed = text;
    
    // Ensure proper line breaks around code blocks in tables
    processed = processed.replace(/(\|[^|]*)\s*```(\w+)\s*([^`]+)```\s*(\|[^|]*\|)/g, '$1\n\n```$2\n$3\n```\n$4');
    
    // Handle emoji sections
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
 * Creates a Power BI-inspired DAX syntax theme.
 * @param {object} theme - The MUI theme object.
 * @returns {object} A style object for react-syntax-highlighter.
 */
const getDaxSyntaxTheme = (theme) => {
    const isDark = theme.palette.mode === 'dark';
    
    return {
        'pre[class*="language-"]': {
            background: 'transparent',
            color: 'inherit',
            margin: 0,
            padding: 0
        },
        'code[class*="language-"]': {
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit'
        },
        // DAX-specific token styling with Power BI colors
        '.token.keyword': {
            color: isDark ? '#569cd6' : '#0000ff',  // Blue for functions/keywords
            fontWeight: 'bold'
        },
        '.token.function': {
            color: isDark ? '#dcdcaa' : '#795e26',  // Yellow for functions
            fontWeight: 'bold'
        },
        '.token.string': {
            color: isDark ? '#ce9178' : '#a31515'   // Orange for strings
        },
        '.token.number': {
            color: isDark ? '#b5cea8' : '#098658'   // Green for numbers
        },
        '.token.operator': {
            color: isDark ? '#d4d4d4' : '#000000'   // White/black for operators
        },
        '.token.punctuation': {
            color: isDark ? '#d4d4d4' : '#000000'   // White/black for punctuation
        },
        '.token.comment': {
            color: isDark ? '#6a9955' : '#008000',  // Green for comments
            fontStyle: 'italic'
        },
        '.token.table-column': {
            color: isDark ? '#4ec9b0' : '#2b91af',  // Teal for table[column]
            fontWeight: 'bold'
        },
        '.token.measure': {
            color: isDark ? '#9cdcfe' : '#0451a5',  // Light blue for [measure]
            fontWeight: 'bold'
        },
        '.token.class-name': {
            color: isDark ? '#4ec9b0' : '#2b91af',  // Teal for table[column] (alias)
            fontWeight: 'bold'
        },
        '.token.variable': {
            color: isDark ? '#9cdcfe' : '#0451a5',  // Light blue for [measure] (alias)
            fontWeight: 'bold'
        }
    };
};


// Code block component with copy functionality
const CodeBlockWithCopy = ({ children, language, theme, isDax = false }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyButtonHovered, setCopyButtonHovered] = useState(false);
    
    const codeContent = String(children).replace(/\n$/, '');
    
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(codeContent);
            setCopySuccess(true);
            setCopyButtonHovered(false);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = codeContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setCopyButtonHovered(false);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const codeBlockStyle = {
        borderRadius: '8px',
        padding: '16px',
        margin: '16px 0',
        overflow: 'auto',
        border: theme.palette.mode === 'dark' ? '1px solid #3c3c3c' : '1px solid #e1e4e8',
        fontSize: '14px',
        lineHeight: '1.5',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        whiteSpace: 'pre',
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
        color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#000000',
        position: 'relative'
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <Box sx={codeBlockStyle}>
                {codeContent}
            </Box>
            <Tooltip title={copySuccess ? "Copied!" : `Copy ${isDax ? 'DAX' : language || 'code'}`}>
                <Button
                    size="small"
                    onClick={handleCopyCode}
                    onMouseEnter={() => setCopyButtonHovered(true)}
                    onMouseLeave={() => setCopyButtonHovered(false)}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        minWidth: 'auto',
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: 'transparent',
                        color: 'transparent',
                        p: 0,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            transform: 'scale(1.05)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Copy 
                        size={16} 
                        color={copyButtonHovered ? theme.palette.primary.main : theme.palette.text.secondary}
                    />
                </Button>
            </Tooltip>
        </Box>
    );
};

const MarkdownRenderer = memo(({ content, sx = {} }) => {
    const theme = useTheme();
    const processedContent = useMemo(() => preprocessMarkdown(content), [content]);
    const syntaxTheme = useMemo(() => getDaxSyntaxTheme(theme), [theme]);

    const components = useMemo(() => ({
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
        
        // Table components
        table: (props) => (
            <Box 
                component="table" 
                sx={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    margin: '16px 0',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '8px',
                    overflow: 'hidden'
                }} 
                {...props} 
            />
        ),
        thead: (props) => (
            <Box 
                component="thead" 
                sx={{ 
                    backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5'
                }} 
                {...props} 
            />
        ),
        tbody: (props) => <Box component="tbody" {...props} />,
        tr: (props) => (
            <Box 
                component="tr" 
                sx={{ 
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:last-child': {
                        borderBottom: 'none'
                    }
                }} 
                {...props} 
            />
        ),
        th: (props) => (
            <Box 
                component="th" 
                sx={{ 
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    color: theme.palette.text.primary,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    '&:last-child': {
                        borderRight: 'none'
                    }
                }} 
                {...props} 
            />
        ),
        td: ({ children, ...props }) => {
            // Extract text content from children
            const extractTextContent = (node) => {
                if (typeof node === 'string') return node;
                if (typeof node === 'number') return String(node);
                if (Array.isArray(node)) {
                    return node.map(extractTextContent).join('');
                }
                if (node && typeof node === 'object' && node.props) {
                    return extractTextContent(node.props.children);
                }
                return '';
            };
            
            const textContent = extractTextContent(children);
            
            // Check if this looks like DAX code (starts with "dax" followed by DAX keywords)
            const isDaxCode = /^dax\s+(VAR|CALCULATE|SUM|RETURN|IF|SWITCH|AND|OR|NOT|TRUE|FALSE|BLANK|ALL|FILTER|RELATED|EARLIER|EARLIEST|DISTINCT|VALUES|COUNT|MAX|MIN|AVERAGE|DATE|YEAR|MONTH|DAY|NOW|TODAY|FORMAT|LEFT|RIGHT|MID|LEN|UPPER|LOWER|TRIM|CONCATENATE|FIND|SEARCH|REPLACE|SUBSTITUTE|VALUE|ADDCOLUMNS|CROSSJOIN|GENERATESERIES|GROUPBY|HASONEVALUE|ISBLANK|ISCROSSFILTERED|ISFILTERED|NATURALINNERJOIN|NATURALLEFTOUTERJOIN|SELECTEDVALUE|SUMMARIZE|SUMMARIZECOLUMNS|TOPN|TREATAS|UNION|REMOVEFILTERS|KEEPFILTERS|USERELATIONSHIP|ALLEXCEPT|ALLNOBLANKROW|ALLSELECTED|DISTINCTCOUNT|COUNTROWS|COUNTA|COUNTAX|COUNTBLANK|MAXA|MAXX|MINA|MINX|RANKX|AVERAGEA|AVERAGEX|DATEDIFF|EOMONTH|STARTOFMONTH|ENDOFMONTH|DATESYTD|DATESQTD|DATESMTD|TOTALYTD|TOTALQTD|TOTALMTD|SAMEPERIODLASTYEAR|PARALLELPERIOD|NEXTDAY|NEXTMONTH|NEXTQUARTER|NEXTYEAR|PREVIOUSDAY|PREVIOUSMONTH|PREVIOUSQUARTER|PREVIOUSYEAR|DATESBETWEEN|DATESINPERIOD|CONCATENATEX|EXACT|FIXED|REPT|HOUR|MINUTE|SECOND)/i.test(textContent.trim());
            
            if (isDaxCode) {
                // Remove the "dax" prefix and wrap in proper code block syntax
                const cleanDaxCode = textContent.replace(/^dax\s+/, '');
                
                return (
                    <Box 
                        component="td" 
                        sx={{ 
                            padding: '12px 16px',
                            fontSize: '0.875rem',
                            color: theme.palette.text.primary,
                            borderRight: `1px solid ${theme.palette.divider}`,
                            '&:last-child': {
                                borderRight: 'none'
                            },
                            '& p': {
                                margin: 0
                            },
                            '& pre': {
                                margin: '8px 0',
                                '& code': {
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    lineHeight: '1.4'
                                }
                            }
                        }} 
                        {...props}
                    >
                        <CodeBlockWithCopy 
                            language="dax" 
                            theme={theme} 
                            isDax={true}
                        >
                            {cleanDaxCode}
                        </CodeBlockWithCopy>
                    </Box>
                );
            }
            
            // Check for regular code blocks
            const hasCodeBlocks = textContent.includes('```');
            
            if (hasCodeBlocks) {
                return (
                    <Box 
                        component="td" 
                        sx={{ 
                            padding: '12px 16px',
                            fontSize: '0.875rem',
                            color: theme.palette.text.primary,
                            borderRight: `1px solid ${theme.palette.divider}`,
                            '&:last-child': {
                                borderRight: 'none'
                            },
                            '& p': {
                                margin: 0
                            },
                            '& pre': {
                                margin: '8px 0',
                                '& code': {
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    lineHeight: '1.4'
                                }
                            }
                        }} 
                        {...props}
                    >
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            components={components}
                        >
                            {textContent}
                        </ReactMarkdown>
                    </Box>
                );
            }
            
            return (
                <Box 
                    component="td" 
                    sx={{ 
                        padding: '12px 16px',
                        fontSize: '0.875rem',
                        color: theme.palette.text.primary,
                        borderRight: `1px solid ${theme.palette.divider}`,
                        '&:last-child': {
                            borderRight: 'none'
                        },
                        '& p': {
                            margin: 0
                        },
                        '& pre': {
                            margin: '8px 0',
                            '& code': {
                                padding: '8px 12px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                lineHeight: '1.4'
                            }
                        }
                    }} 
                    {...props}
                >
                    {children}
                </Box>
            );
        },

        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // For DAX code blocks, use CodeBlockWithCopy component
            if (!inline && language === 'dax') {
                return (
                    <CodeBlockWithCopy 
                        language={language} 
                        theme={theme} 
                        isDax={true}
                        {...props}
                    >
                        {children}
                    </CodeBlockWithCopy>
                );
            }

            // For other code blocks, use CodeBlockWithCopy component
            if (!inline && language) {
                return (
                    <CodeBlockWithCopy 
                        language={language} 
                        theme={theme} 
                        isDax={false}
                        {...props}
                    >
                        {children}
                    </CodeBlockWithCopy>
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
    }), [theme, syntaxTheme]);

    return (
        <Box sx={sx} className="markdown-content">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={components}
            >
                {processedContent}
            </ReactMarkdown>
        </Box>
    );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;