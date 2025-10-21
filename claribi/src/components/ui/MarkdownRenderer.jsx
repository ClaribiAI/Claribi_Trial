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
        'token.keyword': {
            color: isDark ? '#569cd6' : '#0000ff',  // Blue for functions/keywords
            fontWeight: 'bold'
        },
        'token.function': {
            color: isDark ? '#dcdcaa' : '#795e26',  // Yellow for functions
            fontWeight: 'bold'
        },
        'token.string': {
            color: isDark ? '#ce9178' : '#a31515'   // Orange for strings
        },
        'token.number': {
            color: isDark ? '#b5cea8' : '#098658'   // Green for numbers
        },
        'token.operator': {
            color: isDark ? '#d4d4d4' : '#000000'   // White/black for operators
        },
        'token.punctuation': {
            color: isDark ? '#d4d4d4' : '#000000'   // White/black for punctuation
        },
        'token.comment': {
            color: isDark ? '#6a9955' : '#008000',  // Green for comments
            fontStyle: 'italic'
        },
        'token.table-column': {
            color: isDark ? '#4ec9b0' : '#2b91af',  // Teal for table[column]
            fontWeight: 'bold'
        },
        'token.measure': {
            color: isDark ? '#9cdcfe' : '#0451a5',  // Light blue for [measure]
            fontWeight: 'bold'
        },
        'token.class-name': {
            color: isDark ? '#4ec9b0' : '#2b91af',  // Teal for table[column] (alias)
            fontWeight: 'bold'
        },
        'token.variable': {
            color: isDark ? '#9cdcfe' : '#0451a5',  // Light blue for [measure] (alias)
            fontWeight: 'bold'
        }
    };
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

            // For DAX code blocks, use custom renderer
            if (!inline && language === 'dax') {
                const codeText = String(children).replace(/\n$/, '');
                
                // Simple DAX syntax highlighting
                const highlightDAX = (text) => {
                    const isDark = theme.palette.mode === 'dark';
                    const colors = {
                        keyword: isDark ? '#569cd6' : '#0000ff',
                        string: isDark ? '#ce9178' : '#a31515',
                        number: isDark ? '#b5cea8' : '#098658',
                        operator: isDark ? '#d4d4d4' : '#000000',
                        tableColumn: isDark ? '#4ec9b0' : '#2b91af',
                        measure: isDark ? '#9cdcfe' : '#0451a5'
                    };

                    // Split by common DAX patterns - more comprehensive function list
                    const parts = text.split(/(\bSUM\b|\bSUMX\b|\bAVERAGE\b|\bAVERAGEX\b|\bCOUNT\b|\bCOUNTA\b|\bCOUNTX\b|\bCOUNTAX\b|\bCOUNTROWS\b|\bDISTINCTCOUNT\b|\bMAX\b|\bMAXX\b|\bMIN\b|\bMINX\b|\bCALCULATE\b|\bCALCULATETABLE\b|\bFILTER\b|\bALL\b|\bALLEXCEPT\b|\bALLSELECTED\b|\bDISTINCT\b|\bVALUES\b|\bRELATED\b|\bRELATEDTABLE\b|\bEARLIER\b|\bEARLIEST\b|\bVAR\b|\bRETURN\b|\bIF\b|\bSWITCH\b|\bAND\b|\bOR\b|\bNOT\b|\bTRUE\b|\bFALSE\b|\bBLANK\b|\bDATE\b|\bDATEDIFF\b|\bNOW\b|\bTODAY\b|\bYEAR\b|\bMONTH\b|\bDAY\b|\bHOUR\b|\bMINUTE\b|\bSECOND\b|\bEOMONTH\b|\bSTARTOFMONTH\b|\bENDOFMONTH\b|\bDATESYTD\b|\bDATESQTD\b|\bDATESMTD\b|\bTOTALYTD\b|\bTOTALQTD\b|\bTOTALMTD\b|\bSAMEPERIODLASTYEAR\b|\bPARALLELPERIOD\b|\bNEXTDAY\b|\bNEXTMONTH\b|\bNEXTQUARTER\b|\bNEXTYEAR\b|\bPREVIOUSDAY\b|\bPREVIOUSMONTH\b|\bPREVIOUSQUARTER\b|\bPREVIOUSYEAR\b|\bDATESBETWEEN\b|\bDATESINPERIOD\b|\bCONCATENATE\b|\bCONCATENATEX\b|\bEXACT\b|\bFIND\b|\bFIXED\b|\bFORMAT\b|\bLEFT\b|\bLEN\b|\bLOWER\b|\bMID\b|\bREPLACE\b|\bREPT\b|\bRIGHT\b|\bSEARCH\b|\bSUBSTITUTE\b|\bTRIM\b|\bUPPER\b|\bVALUE\b|\bADDCOLUMNS\b|\bCROSSJOIN\b|\bGENERATESERIES\b|\bGROUPBY\b|\bHASONEVALUE\b|\bISBLANK\b|\bISCROSSFILTERED\b|\bISFILTERED\b|\bNATURALINNERJOIN\b|\bNATURALLEFTOUTERJOIN\b|\bSELECTEDVALUE\b|\bSUMMARIZE\b|\bSUMMARIZECOLUMNS\b|\bTOPN\b|\bTREATAS\b|\bUNION\b|'[^']*'\[[^\]]*\]|\[[^\]]*\]|"[^"]*"|\d+(\.\d+)?|[=+\-*/<>()])/g);
                    
                    return parts.map((part, index) => {
                        // Check for DAX functions/keywords (case insensitive)
                        if (/\b(SUM|SUMX|AVERAGE|AVERAGEX|COUNT|COUNTA|COUNTX|COUNTAX|COUNTROWS|DISTINCTCOUNT|MAX|MAXX|MIN|MINX|CALCULATE|CALCULATETABLE|FILTER|ALL|ALLEXCEPT|ALLSELECTED|DISTINCT|VALUES|RELATED|RELATEDTABLE|EARLIER|EARLIEST|VAR|RETURN|IF|SWITCH|AND|OR|NOT|TRUE|FALSE|BLANK|DATE|DATEDIFF|NOW|TODAY|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|EOMONTH|STARTOFMONTH|ENDOFMONTH|DATESYTD|DATESQTD|DATESMTD|TOTALYTD|TOTALQTD|TOTALMTD|SAMEPERIODLASTYEAR|PARALLELPERIOD|NEXTDAY|NEXTMONTH|NEXTQUARTER|NEXTYEAR|PREVIOUSDAY|PREVIOUSMONTH|PREVIOUSQUARTER|PREVIOUSYEAR|DATESBETWEEN|DATESINPERIOD|CONCATENATE|CONCATENATEX|EXACT|FIND|FIXED|FORMAT|LEFT|LEN|LOWER|MID|REPLACE|REPT|RIGHT|SEARCH|SUBSTITUTE|TRIM|UPPER|VALUE|ADDCOLUMNS|CROSSJOIN|GENERATESERIES|GROUPBY|HASONEVALUE|ISBLANK|ISCROSSFILTERED|ISFILTERED|NATURALINNERJOIN|NATURALLEFTOUTERJOIN|SELECTEDVALUE|SUMMARIZE|SUMMARIZECOLUMNS|TOPN|TREATAS|UNION)\b/i.test(part)) {
                            return <span key={index} style={{ color: colors.keyword, fontWeight: 'bold' }}>{part}</span>;
                        } else if (/'[^']*'\[[^\]]*\]/.test(part)) {
                            return <span key={index} style={{ color: colors.tableColumn, fontWeight: 'bold' }}>{part}</span>;
                        } else if (/\[[^\]]*\]/.test(part)) {
                            return <span key={index} style={{ color: colors.measure, fontWeight: 'bold' }}>{part}</span>;
                        } else if (/"[^"]*"/.test(part)) {
                            return <span key={index} style={{ color: colors.string }}>{part}</span>;
                        } else if (/\d+(\.\d+)?/.test(part)) {
                            return <span key={index} style={{ color: colors.number }}>{part}</span>;
                        } else if (/[=+\-*/<>()]/.test(part)) {
                            return <span key={index} style={{ color: colors.operator }}>{part}</span>;
                        }
                        return part;
                    });
                };

                return (
                    <Box sx={{
                        borderRadius: '8px',
                        padding: '16px',
                        margin: '16px 0',
                        overflow: 'auto',
                        border: theme.palette.mode === 'dark' ? '1px solid #3c3c3c' : '1px solid #e1e4e8',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                        whiteSpace: 'pre'
                    }}>
                        {highlightDAX(codeText)}
                    </Box>
                );
            }

            // For other code blocks, use SyntaxHighlighter
            if (!inline && language) {
                return (
                    <SyntaxHighlighter
                        style={syntaxTheme}
                        language={language}
                        PreTag="div"
                        customStyle={{
                            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                            color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#000000',
                            borderRadius: '8px',
                            padding: '16px',
                            margin: '16px 0',
                            overflow: 'auto',
                            border: theme.palette.mode === 'dark' ? '1px solid #3c3c3c' : '1px solid #e1e4e8',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
                        }}
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