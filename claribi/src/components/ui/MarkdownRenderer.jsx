import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin for tables, footnotes, etc.
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // A good, popular theme
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Light theme

import { Typography, Box, Paper, useTheme, alpha } from '@mui/material';
import { Lightbulb, Warning, Info, CheckCircle } from '@phosphor-icons/react';

// Custom Power BI DAX code component that applies proper syntax highlighting
const PowerBIDAXCode = ({ code }) => {
    // DAX keywords and functions
    const keywords = [
        'DEFINE', 'MEASURE', 'EVALUATE', 'VAR', 'RETURN', 'IF', 'SWITCH', 'SUM', 'DIVIDE', 'CALCULATE',
        'FILTER', 'ALL', 'VALUES', 'DISTINCT', 'COUNT', 'COUNTROWS', 'MAX', 'MIN', 'AVERAGE', 'AVERAGEX',
        'SUMX', 'MAXX', 'MINX', 'COUNTX', 'DISTINCTCOUNT', 'BLANK', 'TRUE', 'FALSE', 'AND', 'OR', 'NOT',
        'ISBLANK', 'HASONEVALUE', 'HASONEFILTER', 'SELECTEDVALUE', 'EARLIER', 'EARLIEST', 'RANKX',
        'TOPN', 'BOTTOM', 'SAMPLE', 'GENERATE', 'ADDCOLUMNS', 'SUMMARIZE', 'SUMMARIZECOLUMNS',
        'GROUPBY', 'NATURALINNERJOIN', 'NATURALLEFTOUTERJOIN', 'CROSSJOIN', 'UNION', 'INTERSECT',
        'EXCEPT', 'DISTINCT', 'ROW', 'DATATABLE', 'GENERATESERIES', 'GENERATEALL', 'SELECTCOLUMNS',
        'REMOVEFILTERS', 'KEEPFILTERS', 'USERELATIONSHIP', 'CROSSFILTER', 'ALLSELECTED', 'ALLEXCEPT',
        'ALLNOBLANKROW', 'ISFILTERED', 'ISCROSSFILTERED', 'HASONEVALUE', 'HASONEFILTER'
    ];
    
    // Parse and create React elements
    const parseCode = (text) => {
        let elements = [];
        let currentIndex = 0;
        
        // Split by lines to handle multiline code
        const lines = text.split('\n');
        
        return lines.map((line, lineIndex) => {
            let lineElements = [];
            let lineIndex_current = 0;
            
            // Process each line
            while (lineIndex_current < line.length) {
                let found = false;
                
                // Check for keywords
                for (const keyword of keywords) {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    const match = line.substring(lineIndex_current).match(regex);
                    if (match && line.indexOf(match[0], lineIndex_current) === lineIndex_current) {
                        // Add text before keyword
                        if (lineIndex_current > 0) {
                            lineElements.push(
                                <span key={`${lineIndex}-${lineIndex_current}`} style={{ color: '#000000' }}>
                                    {line.substring(lineIndex_current, line.indexOf(match[0], lineIndex_current))}
                                </span>
                            );
                        }
                        // Add keyword
                        lineElements.push(
                            <span key={`${lineIndex}-${lineIndex_current}-keyword`} style={{ color: '#0000ff', fontWeight: 'bold' }}>
                                {match[0]}
                            </span>
                        );
                        lineIndex_current = line.indexOf(match[0], lineIndex_current) + match[0].length;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    // Check for strings
                    const stringMatch = line.substring(lineIndex_current).match(/(['"])((?:\\.|(?!\1)[^\\])*?)\1/);
                    if (stringMatch) {
                        const startPos = line.indexOf(stringMatch[0], lineIndex_current);
                        // Add text before string
                        if (startPos > lineIndex_current) {
                            lineElements.push(
                                <span key={`${lineIndex}-${lineIndex_current}-before`} style={{ color: '#000000' }}>
                                    {line.substring(lineIndex_current, startPos)}
                                </span>
                            );
                        }
                        // Add string
                        lineElements.push(
                            <span key={`${lineIndex}-${lineIndex_current}-string`} style={{ color: '#a31515' }}>
                                {stringMatch[0]}
                            </span>
                        );
                        lineIndex_current = startPos + stringMatch[0].length;
                        found = true;
                    }
                }
                
                if (!found) {
                    // Check for comments
                    const commentMatch = line.substring(lineIndex_current).match(/(\/\/.*$)/);
                    if (commentMatch) {
                        const startPos = line.indexOf(commentMatch[0], lineIndex_current);
                        // Add text before comment
                        if (startPos > lineIndex_current) {
                            lineElements.push(
                                <span key={`${lineIndex}-${lineIndex_current}-before-comment`} style={{ color: '#000000' }}>
                                    {line.substring(lineIndex_current, startPos)}
                                </span>
                            );
                        }
                        // Add comment
                        lineElements.push(
                            <span key={`${lineIndex}-${lineIndex_current}-comment`} style={{ color: '#008000', fontStyle: 'italic' }}>
                                {commentMatch[0]}
                            </span>
                        );
                        lineIndex_current = line.length;
                        found = true;
                    }
                }
                
                if (!found) {
                    // Check for square brackets
                    const bracketMatch = line.substring(lineIndex_current).match(/(\[[^\]]+\])/);
                    if (bracketMatch) {
                        const startPos = line.indexOf(bracketMatch[0], lineIndex_current);
                        // Add text before brackets
                        if (startPos > lineIndex_current) {
                            lineElements.push(
                                <span key={`${lineIndex}-${lineIndex_current}-before-bracket`} style={{ color: '#000000' }}>
                                    {line.substring(lineIndex_current, startPos)}
                                </span>
                            );
                        }
                        // Add brackets
                        lineElements.push(
                            <span key={`${lineIndex}-${lineIndex_current}-bracket`} style={{ color: '#000000' }}>
                                {bracketMatch[0]}
                            </span>
                        );
                        lineIndex_current = startPos + bracketMatch[0].length;
                        found = true;
                    }
                }
                
                if (!found) {
                    // Add remaining text as black
                    lineElements.push(
                        <span key={`${lineIndex}-${lineIndex_current}-remaining`} style={{ color: '#000000' }}>
                            {line.substring(lineIndex_current)}
                        </span>
                    );
                    lineIndex_current = line.length;
                }
            }
            
            return (
                <div key={lineIndex}>
                    {lineElements}
                </div>
            );
        });
    };
    
    return (
        <Box
            sx={{
                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'normal',
                wordWrap: 'normal'
            }}
        >
            {parseCode(code)}
        </Box>
    );
};

// Power BI DAX light theme (matches Power BI's native editor)
const powerBIThemeLight = {
    'pre[class*="language-"]': {
        color: '#000000',
        background: '#ffffff',
        textShadow: 'none',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none',
        padding: '1em',
        margin: '.5em 0',
        overflow: 'auto',
        borderRadius: '4px',
        border: '1px solid #e1e4e8'
    },
    'code[class*="language-"]': {
        color: '#000000',
        background: '#ffffff',
        textShadow: 'none',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        lineHeight: '1.5',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none'
    },
    // Power BI DAX exact color scheme - using !important to override
    '.token.comment': { color: '#008000 !important', fontStyle: 'italic' }, // Green comments
    '.token.keyword': { color: '#0000ff !important', fontWeight: 'bold' }, // Dark blue keywords
    '.token.string': { color: '#a31515 !important' }, // Red strings
    '.token.number': { color: '#000000 !important' }, // Black numbers
    '.token.operator': { color: '#000000 !important' }, // Black operators
    '.token.punctuation': { color: '#000000 !important' }, // Black punctuation
    '.token.function': { color: '#0000ff !important', fontWeight: 'bold' }, // Dark blue functions
    '.token.variable': { color: '#000000 !important' }, // Black variables
    '.token.property': { color: '#000000 !important' }, // Black properties
    '.token.boolean': { color: '#0000ff !important' }, // Dark blue booleans
    '.token.constant': { color: '#000000 !important' }, // Black constants
    '.token.class-name': { color: '#000000 !important' }, // Black class names
    '.token.tag': { color: '#000000 !important' }, // Black tags
    '.token.attr-name': { color: '#000000 !important' }, // Black attribute names
    '.token.attr-value': { color: '#a31515 !important' }, // Red attribute values
    '.token.selector': { color: '#000000 !important' }, // Black selectors
    '.token.symbol': { color: '#000000 !important' }, // Black symbols
    '.token.deleted': { color: '#ff0000 !important' }, // Red deleted
    '.token.inserted': { color: '#008000 !important' }, // Green inserted
    '.token.important': { color: '#ff0000 !important', fontWeight: 'bold' }, // Red important
    '.token.bold': { color: '#000000 !important', fontWeight: 'bold' }, // Black bold
    '.token.italic': { color: '#000000 !important', fontStyle: 'italic' }, // Black italic
    // Additional tokens for better DAX support
    '.token.parameter': { color: '#000000 !important' }, // Black parameters
    '.token.builtin': { color: '#0000ff !important', fontWeight: 'bold' }, // Dark blue built-in functions
    '.token.attr': { color: '#000000 !important' }, // Black attributes
};

// Power BI DAX dark theme (VS Code inspired)
const powerBIThemeDark = {
    'pre[class*="language-"]': {
        color: '#D4D4D4',
        background: '#1E1E1E',
        textShadow: 'none',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none',
        padding: '1em',
        margin: '.5em 0',
        overflow: 'auto',
        borderRadius: '4px',
        border: '1px solid #3C3C3C'
    },
    'code[class*="language-"]': {
        color: '#D4D4D4',
        background: '#1E1E1E',
        textShadow: 'none',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre',
        wordSpacing: 'normal',
        wordBreak: 'normal',
        wordWrap: 'normal',
        lineHeight: '1.5',
        MozTabSize: '4',
        OTabSize: '4',
        tabSize: '4',
        WebkitHyphens: 'none',
        MozHyphens: 'none',
        msHyphens: 'none',
        hyphens: 'none'
    },
    // Dark theme color scheme - VS Code inspired
    '.token.comment': { color: '#6A9955 !important', fontStyle: 'italic' }, // Green comments
    '.token.keyword': { color: '#569CD6 !important', fontWeight: 'bold' }, // Blue keywords
    '.token.string': { color: '#CE9178 !important' }, // Orange strings
    '.token.number': { color: '#B5CEA8 !important' }, // Light green numbers
    '.token.operator': { color: '#D4D4D4 !important' }, // Light gray operators
    '.token.punctuation': { color: '#D4D4D4 !important' }, // Light gray punctuation
    '.token.function': { color: '#DCDCAA !important', fontWeight: 'bold' }, // Yellow functions
    '.token.variable': { color: '#9CDCFE !important' }, // Light blue variables
    '.token.property': { color: '#D4D4D4 !important' }, // Light gray properties
    '.token.boolean': { color: '#569CD6 !important' }, // Blue booleans
    '.token.constant': { color: '#4FC1FF !important' }, // Light blue constants
    '.token.class-name': { color: '#4EC9B0 !important' }, // Teal class names
    '.token.tag': { color: '#569CD6 !important' }, // Blue tags
    '.token.attr-name': { color: '#92C5F !important' }, // Light blue attribute names
    '.token.attr-value': { color: '#CE9178 !important' }, // Orange attribute values
    '.token.selector': { color: '#D7BA7D !important' }, // Yellow selectors
    '.token.symbol': { color: '#D4D4D4 !important' }, // Light gray symbols
    '.token.deleted': { color: '#F44747 !important' }, // Red deleted
    '.token.inserted': { color: '#6A9955 !important' }, // Green inserted
    '.token.important': { color: '#F44747 !important', fontWeight: 'bold' }, // Red important
    '.token.bold': { color: '#D4D4D4 !important', fontWeight: 'bold' }, // Light gray bold
    '.token.italic': { color: '#D4D4D4 !important', fontStyle: 'italic' }, // Light gray italic
    // Additional tokens for better DAX support
    '.token.parameter': { color: '#9CDCFE !important' }, // Light blue parameters
    '.token.builtin': { color: '#DCDCAA !important', fontWeight: 'bold' }, // Yellow built-in functions
    '.token.attr': { color: '#D4D4D4 !important' }, // Light gray attributes
    '.token.char': { color: '#a31515 !important' }, // Red characters
    '.token.decorator': { color: '#0000ff !important' }, // Dark blue decorators
    '.token.namespace': { color: '#000000 !important' }, // Black namespaces
    '.token.regex': { color: '#a31515 !important' }, // Red regex
    '.token.script': { color: '#000000 !important' }, // Black script
    '.token.url': { color: '#a31515 !important' } // Red URLs
};

/**
 * Pre-processes the raw markdown string from the language model to fix common formatting issues
 * before passing it to the markdown renderer.
 * @param {string} text - The raw markdown string.
 * @returns {string} - The cleaned markdown string.
 */
const preprocessMarkdown = (text) => {
    if (!text || typeof text !== 'string') return '';

    let processed = text;
    
    // 1. Fix inline DAX fences into proper multi-line blocks.
    processed = processed.replace(
        /([^\n])?```\s*dax\s+([^\n`]+)```/gi,
        (match, prefix, content) => `${prefix || ''}\n\n\`\`\`dax\n${content.trim()}\n\`\`\`\n`
    );

    // 2. Ensure paragraphs starting with special emojis are separated.
    processed = processed.replace(/\n(⚠️|💡|ℹ️|✅)/g, '\n\n$1');


    // 3. ✨ THE KEY FIX: Aggressively merge inline code blocks back into paragraphs. ✨
    // This finds `code` blocks on their own lines and removes the surrounding newlines,
    // effectively joining them with the preceding or succeeding text.
    processed = processed.replace(/\s*\n\s*(`[^`]+`)\s*\n\s*/g, ' $1 ');

    return processed;
};


// A map to connect emojis to their corresponding icon and color.
const specialSectionsMap = {
    '⚠️': { Icon: Warning, color: 'warning' },
    '💡': { Icon: Lightbulb, color: 'info' },
    'ℹ️': { Icon: Info, color: 'primary' },
    '✅': { Icon: CheckCircle, color: 'success' },
};


const MarkdownRenderer = ({ content, sx = {} }) => {
    const theme = useTheme();
    const processedContent = preprocessMarkdown(content);

    const components = {
        h1: ({...props}) => <Typography variant="h4" component="h1" gutterBottom sx={{ color: theme.palette.text.primary }} {...props} />,
        h2: ({...props}) => <Typography variant="h5" component="h2" gutterBottom sx={{ color: theme.palette.text.primary }} {...props} />,
        h3: ({...props}) => <Typography variant="h6" component="h3" gutterBottom sx={{ color: theme.palette.text.primary }} {...props} />,

        p: ({ node, ...props }) => {
            const text = node?.children[0]?.value || '';
            const emoji = Object.keys(specialSectionsMap).find(e => text.startsWith(e));

            if (emoji) {
                const { Icon, color } = specialSectionsMap[emoji];
                const content = text.substring(emoji.length).trim();
                
                return (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            my: 1.5,
                            bgcolor: alpha(theme.palette[color].main, 0.08),
                            border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                        }}
                    >
                        <Icon size={20} color={theme.palette[color].main} style={{ marginTop: '3px' }}/>
                        <Typography variant="body2" component="div" sx={{ flex: 1, lineHeight: 1.7 }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                                {content}
                            </ReactMarkdown>
                        </Typography>
                    </Paper>
                );
            }
            return <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.7, color: 'inherit' }} {...props} />;
        },
        
        ul: ({...props}) => <Box component="ul" sx={{ pl: 3, my: 1.5 }} {...props} />,
        ol: ({...props}) => <Box component="ol" sx={{ pl: 3, my: 1.5 }} {...props} />,
        li: ({...props}) => <Typography component="li" variant="body1" sx={{ mb: 0.5, color: 'inherit' }} {...props} />,

        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (!inline) {
                // For DAX code, use custom Power BI styling
                if (language === 'dax') {
                    return (
                        <Box
                            component="pre"
                            sx={{
                                color: theme.palette.mode === 'dark' ? '#D4D4D4' : '#000000',
                                background: theme.palette.mode === 'dark' ? '#1E1E1E' : '#ffffff',
                                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                padding: '1em',
                                margin: '.5em 0',
                                overflow: 'auto',
                                borderRadius: '4px',
                                border: theme.palette.mode === 'dark' ? '1px solid #3C3C3C' : '1px solid #e1e4e8',
                                whiteSpace: 'pre',
                                wordBreak: 'normal',
                                wordWrap: 'normal'
                            }}
                        >
                            <PowerBIDAXCode code={String(children).replace(/\n$/, '')} />
                        </Box>
                    );
                }
                
                return (
                    <SyntaxHighlighter
                        style={theme.palette.mode === 'dark' ? powerBIThemeDark : powerBIThemeLight}
                        language="text"
                        PreTag="div"
                        {...props}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                );
            }
            
            return (
                <Box
                    component="code"
                    sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.875em',
                        bgcolor: theme.palette.code.background,
                        color: theme.palette.code.text,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    }}
                    {...props}
                >
                    {children}
                </Box>
            );
        }
    };

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
};

export default MarkdownRenderer;