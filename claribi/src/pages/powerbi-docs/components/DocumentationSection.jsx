import React, { useMemo, memo, useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Card,
    CardContent,
    CardHeader,
    CardActions,
    IconButton,
    Tooltip,
    Fade,
    LinearProgress,
    Alert,
    AlertTitle,
    Paper,
    TextField,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    useTheme,
    alpha
} from '@mui/material';
import {
    PencilSimpleIcon,
    ArrowClockwiseIcon,
    DownloadIcon,
    SparkleIcon,
    FloppyDiskIcon,
    XIcon
} from '@phosphor-icons/react';
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';
import LoadingOverlay from './LoadingOverlay';
import RewriteMenu from './RewriteMenu';
// Editing functionality commented out
// import RichTextEditor from './RichTextEditor';

// Helper function to extract text from selection, stripping HTML/markdown
const extractTextFromSelection = (selection) => {
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText || selectedText.length === 0) return null;
    
    return selectedText;
};

// Create a position map that tracks every character in raw content
// and maps it to a "rendered" version (without markdown syntax)
const createPositionMap = (rawContent) => {
    if (!rawContent) return { cleanText: '', positionMap: [] };
    
    const lines = rawContent.split('\n');
    const positionMap = []; // Maps cleanText index to rawContent index
    let cleanText = '';
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let lineStartRaw = 0;
        
        // Calculate line start position in raw content
        for (let i = 0; i < lineIdx; i++) {
            lineStartRaw += lines[i].length + 1; // +1 for newline
        }
        
        // Remove markdown list markers and headers at the start of line
        let lineContent = line;
        let skipChars = 0;
        
        // Check for list markers: - , * , + , or numbered list (1. , 2. , etc.)
        const listMarkerMatch = line.match(/^([-*+]|\d+\.)\s+/);
        if (listMarkerMatch) {
            skipChars = listMarkerMatch[0].length;
            lineContent = line.substring(skipChars);
        }
        
        // Check for markdown headers (# ## ### etc.)
        const headerMatch = line.match(/^(#{1,6})\s+/);
        if (headerMatch && !listMarkerMatch) {
            skipChars = headerMatch[0].length;
            lineContent = line.substring(skipChars);
        }
        
        // Check for blockquote
        const blockquoteMatch = line.match(/^>\s+/);
        if (blockquoteMatch && !listMarkerMatch && !headerMatch) {
            skipChars = blockquoteMatch[0].length;
            lineContent = line.substring(skipChars);
        }
        
        // Track if we just added whitespace (to normalize multiple spaces)
        let lastWasWhitespace = cleanText.length > 0 && cleanText[cleanText.length - 1].match(/\s/);
        
        // Process the line content character by character
        for (let i = 0; i < lineContent.length; i++) {
            const char = lineContent[i];
            const actualRawIndex = lineStartRaw + skipChars + i;
            
            // Skip markdown formatting characters that don't appear in rendered text
            if (char === '`') {
                // Skip backticks (code markers)
                continue;
            }
            
            if (char === '*' || char === '_') {
                // Check if it's bold/italic markdown (**, __, *, _)
                const nextChar = i + 1 < lineContent.length ? lineContent[i + 1] : '';
                if ((char === '*' && nextChar === '*') || (char === '_' && nextChar === '_')) {
                    // Bold marker - skip both characters
                    i++; // Skip next char too
                    continue;
                } else if (char === '*' || char === '_') {
                    // Italic marker - skip
                    continue;
                }
            }
            
            // Normalize whitespace: multiple spaces/tabs become single space
            if (char.match(/\s/)) {
                // Only add one space for multiple whitespace
                if (!lastWasWhitespace) {
                    cleanText += ' ';
                    positionMap.push(actualRawIndex);
                    lastWasWhitespace = true;
                }
                // If already have whitespace, skip this one (don't add to cleanText or positionMap)
            } else {
                // Regular character - add to clean text
                cleanText += char;
                positionMap.push(actualRawIndex);
                lastWasWhitespace = false;
            }
        }
        
        // Add newline between lines (but not after last line)
        if (lineIdx < lines.length - 1) {
            cleanText += '\n';
            positionMap.push(lineStartRaw + line.length); // Newline position in raw content
        }
    }
    
    return { cleanText: cleanText.trim(), positionMap };
};

// Robust position finder using position map
const findTextPositionRobust = (rawContent, selectedText) => {
    if (!rawContent || !selectedText) return null;
    
    // Create position map
    const { cleanText, positionMap } = createPositionMap(rawContent);
    
    // Normalize selected text (same normalization as cleanText)
    const normalizedSelected = selectedText
        .replace(/\s+/g, ' ')
        .trim();
    
    // Find in clean text
    const cleanIndex = cleanText.indexOf(normalizedSelected);
    
    if (cleanIndex === -1) {
        // Try case-insensitive search
        const lowerClean = cleanText.toLowerCase();
        const lowerSelected = normalizedSelected.toLowerCase();
        const lowerIndex = lowerClean.indexOf(lowerSelected);
        
        if (lowerIndex === -1) {
            // Try word-by-word matching as last resort
            const selectedWords = normalizedSelected.split(/\s+/).filter(w => w.length > 0);
            if (selectedWords.length === 0) return null;
            
            // Find first word
            const firstWord = selectedWords[0];
            const firstWordIndex = cleanText.toLowerCase().indexOf(firstWord.toLowerCase());
            
            if (firstWordIndex === -1) return null;
            
            // Try to find a match starting from first word
            let matchStart = firstWordIndex;
            let matchEnd = firstWordIndex + firstWord.length;
            let wordIdx = 1;
            
            // Try to match remaining words
            for (let i = matchEnd; i < cleanText.length && wordIdx < selectedWords.length; i++) {
                const remainingText = cleanText.substring(i).toLowerCase();
                const nextWord = selectedWords[wordIdx].toLowerCase();
                const nextWordIndex = remainingText.indexOf(nextWord);
                
                if (nextWordIndex === 0 || remainingText.substring(0, 50).includes(nextWord)) {
                    // Found next word nearby
                    matchEnd = i + nextWordIndex + nextWord.length;
                    wordIdx++;
                }
            }
            
            if (wordIdx === selectedWords.length) {
                // Found all words, use this match
                const startPos = positionMap[Math.min(matchStart, positionMap.length - 1)] || 0;
                const endPos = positionMap[Math.min(matchEnd, positionMap.length - 1)] || rawContent.length;
                return { start: startPos, end: endPos };
            }
            
            return null;
        }
        
        // Found case-insensitive match, map back
        const startPos = positionMap[Math.min(lowerIndex, positionMap.length - 1)] || 0;
        const endPos = positionMap[Math.min(lowerIndex + normalizedSelected.length, positionMap.length - 1)] || rawContent.length;
        return { start: startPos, end: endPos };
    }
    
    // Found exact match, map back to raw positions
    const startPos = positionMap[Math.min(cleanIndex, positionMap.length - 1)] || 0;
    const endPos = positionMap[Math.min(cleanIndex + normalizedSelected.length, positionMap.length - 1)] || rawContent.length;
    
    return { start: startPos, end: endPos };
};

// Helper function to render a documentation section
const DocumentationSection = memo(({ 
    section, 
    content, 
    sectionLoading, 
    // Editing functionality commented out
    // sectionSaving,
    // editingSection, 
    // editedContent, 
    // onEdit, 
    // onSave, 
    // onCancel, 
    // onChange, 
    onRegenerate, 
    onExport, 
    onGenerate,
    onRewrite,
    rewriteLoading,
    theme 
}) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedTextData, setSelectedTextData] = useState(null);
    const contentRef = useRef(null);
    // Ref to track latest content to ensure position calculations use fresh data
    const latestContentRef = useRef(content);
    
    // Update ref whenever content changes
    useEffect(() => {
        latestContentRef.current = content;
    }, [content]);
    
    // Helper to check if a node is within our content area (handles nested elements)
    const isNodeInContentArea = useCallback((node) => {
        if (!contentRef.current || !node) return false;
        
        // Check if node is directly contained
        if (contentRef.current.contains(node)) return true;
        
        // Check parent nodes (for deeply nested elements like list items)
        let currentNode = node;
        while (currentNode && currentNode !== document.body) {
            if (contentRef.current.contains(currentNode)) {
                return true;
            }
            currentNode = currentNode.parentNode;
        }
        
        return false;
    }, []);

    const handleMouseUp = useCallback((e) => {
        // Only handle if content exists and not loading
        if (!content || sectionLoading[section.id] || rewriteLoading) {
            return;
        }
        
        // Small delay to ensure selection is complete
        setTimeout(() => {
            const selection = window.getSelection();
            
            if (!selection || selection.rangeCount === 0) {
                return;
            }
            
            const selectedText = extractTextFromSelection(selection);
            
            if (!selectedText || selectedText.length < 3) {
                // Minimum 3 characters for selection
                setMenuAnchor(null);
                setSelectedTextData(null);
                return;
            }
            
            // Check if selection is within our content area (improved check for nested elements)
            const anchorNode = selection.anchorNode;
            const focusNode = selection.focusNode;
            
            if (!isNodeInContentArea(anchorNode) && !isNodeInContentArea(focusNode)) {
                return;
            }
            
            // IMPORTANT: Always use the latest content from ref to ensure we have the most recent version
            // This is critical after rewrites when content has been updated
            // Get raw content (the stored text, not the rendered version)
            const currentContent = latestContentRef.current || content;
            const rawContent = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2);
            
            // Find position in raw content using robust position finder
            const position = findTextPositionRobust(rawContent, selectedText);
            
            if (!position) {
                // Couldn't find position, don't show menu
                setMenuAnchor(null);
                setSelectedTextData(null);
                return;
            }
            
            // Get selection position for menu placement
            const range = selection.getRangeAt(0);
            
            // Get a more precise end position by creating a collapsed range at the end
            const endRange = range.cloneRange();
            endRange.collapse(false); // Collapse to the end of the selection (false = end)
            const endRect = endRange.getBoundingClientRect();
            
            // For better accuracy, try to get the actual text node's end position
            // If the end container is a text node, use its position
            let menuX = endRect.left;
            let menuY = endRect.bottom;
            
            // If we have a text node, try to get more precise positioning
            if (endRange.endContainer && endRange.endContainer.nodeType === Node.TEXT_NODE) {
                const textNode = endRange.endContainer;
                const textNodeRange = document.createRange();
                textNodeRange.selectNodeContents(textNode);
                textNodeRange.setStart(textNode, Math.max(0, endRange.endOffset - 1));
                textNodeRange.setEnd(textNode, endRange.endOffset);
                const textRect = textNodeRange.getBoundingClientRect();
                if (textRect.width > 0) {
                    menuX = textRect.right;
                    menuY = textRect.bottom;
                }
            }
            
            setSelectedTextData({
                text: selectedText,
                startPosition: position.start,
                endPosition: position.end
            });
            
            // Set anchor at the bottom-right corner of the selection
            // Menu's right edge will align with this point
            setMenuAnchor({
                x: menuX,
                y: menuY
            });
        }, 10);
    }, [content, section.id, sectionLoading, rewriteLoading, isNodeInContentArea]);
    
    const handleMenuClose = useCallback(() => {
        setMenuAnchor(null);
        setSelectedTextData(null);
        // Clear selection
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }, []);

    // Clear selection and menu when content changes (e.g., after rewrite)
    useEffect(() => {
        // Clear any existing selection and menu when content updates
        // This ensures we're always working with the latest content
        if (window.getSelection) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                // Only clear if we're not in the middle of a rewrite
                if (!rewriteLoading) {
                    selection.removeAllRanges();
                }
            }
        }
        // Clear menu when content changes (unless rewrite is in progress)
        if (!rewriteLoading) {
            setMenuAnchor(null);
            setSelectedTextData(null);
        }
    }, [content, rewriteLoading]);

    // Close menu when clicking outside (but not when loading)
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Don't close menu if rewrite is in progress
            if (rewriteLoading) return;
            
            if (menuAnchor && contentRef.current && !contentRef.current.contains(e.target)) {
                // Check if click is not on the menu itself
                const menuElement = document.querySelector('[role="menu"]');
                if (menuElement && !menuElement.contains(e.target)) {
                    handleMenuClose();
                }
            }
        };

        if (menuAnchor) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [menuAnchor, handleMenuClose, rewriteLoading]);
    
    const handleStyleSelect = useCallback((style) => {
        if (!selectedTextData || !onRewrite || rewriteLoading) return;
        
        // Don't close menu immediately - wait for backend response
        // Pass callback to close menu after rewrite completes
        onRewrite(
            section.id,
            selectedTextData.text,
            selectedTextData.startPosition,
            selectedTextData.endPosition,
            style,
            handleMenuClose
        );
    }, [selectedTextData, section.id, onRewrite, rewriteLoading]);
    return (
        <Fade in={true} timeout={600}>
            <Card 
                elevation={0}
                sx={{ 
                    borderRadius: 3,
                    boxShadow: theme.shadows[3],
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: theme.palette.background.paper
                }}
            >
                <CardHeader
                    avatar={
                        <Box 
                            sx={{ 
                                p: 1, 
                                borderRadius: 2, 
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {section.icon}
                        </Box>
                    }
                    title={
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, color: 'inherit' }}>
                            {section.title}
                        </Typography>
                    }
                    subheader={
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {section.description}
                        </Typography>
                    }
                    action={
                        <Box display="flex" gap={1}>
                            {content && (
                                <>
                                    {/* Editing functionality commented out */}
                                    {/* Edit button - hidden for improvement recommendations */}
                                    {/* {section.id !== 'improvement_recommendations' && (
                                        <Tooltip title="Edit content">
                                            <IconButton 
                                                onClick={() => onEdit(section.id)}
                                                size="small"
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.background.hover
                                                    }
                                                }}
                                            >
                                                <PencilSimpleIcon size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )} */}
                                    
                                    {/* Regenerate button - always visible when content exists */}
                                    <Tooltip title="Regenerate section">
                                        <IconButton 
                                            onClick={() => onRegenerate(section.id)}
                                            disabled={sectionLoading[section.id]}
                                            size="small"
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: theme.palette.background.hover
                                                }
                                            }}
                                        >
                                            <ArrowClockwiseIcon size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    
                                    {/* Export button - always visible when content exists */}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <Select
                                            displayEmpty
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    onExport(section.id, content, e.target.value);
                                                }
                                            }}
                                            renderValue={() => (
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <DownloadIcon size={16} />
                                                    <span>Export</span>
                                                </Box>
                                            )}
                                        >
                                            <MenuItem value="html">📝 HTML Document</MenuItem>
                                            <MenuItem value="word">📄 Word Document (.docx)</MenuItem>
                                            <MenuItem value="pdf">📋 PDF Document</MenuItem>
                                        </Select>
                                    </FormControl>
                                </>
                            )}
                            {/* Editing functionality commented out */}
                            {/* {content && editingSection === section.id && (
                                <>
                                    <Tooltip title={sectionSaving?.[section.id] ? "Saving..." : "Save changes"}>
                                        <span>
                                            <IconButton 
                                                onClick={() => onSave(section.id)}
                                                disabled={sectionSaving?.[section.id]}
                                                size="small"
                                                color="primary"
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.background.hover
                                                    },
                                                    '&:disabled': {
                                                        opacity: 0.6
                                                    }
                                                }}
                                            >
                                                {sectionSaving?.[section.id] ? (
                                                    <CircularProgress size={16} />
                                                ) : (
                                                    <FloppyDiskIcon size={16} />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Cancel editing">
                                        <span>
                                            <IconButton 
                                                onClick={onCancel}
                                                disabled={sectionSaving?.[section.id]}
                                                size="small"
                                                color="secondary"
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.background.hover
                                                    },
                                                    '&:disabled': {
                                                        opacity: 0.6
                                                    }
                                                }}
                                            >
                                                <XIcon size={16} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </>
                            )} */}
                            {!content && (
                                <Button
                                    onClick={() => onGenerate(section.id)}
                                    disabled={sectionLoading[section.id]}
                                    variant="contained"
                                    size="small"
                                    startIcon={sectionLoading[section.id] ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
                                    sx={{ 
                                        bgcolor: theme.palette.primary.main,
                                        color: theme.palette.primary.contrastText,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        '&:hover': {
                                            bgcolor: theme.palette.primary.dark,
                                            color: theme.palette.primary.contrastText
                                        },
                                        '&:disabled': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.3)
                                        }
                                    }}
                                >
                                    {sectionLoading[section.id] ? 'Generating...' : 'Generate'}
                                </Button>
                            )}
                        </Box>
                    }
                    sx={{ pb: 1 }}
                />
                
                <CardContent sx={{ pt: 0, position: 'relative', bgcolor: 'transparent' }}>
                    <LoadingOverlay open={sectionLoading[section.id]} theme={theme} />
                    
                    {content ? (
                                    <Box 
                                            ref={contentRef}
                                            onMouseUp={handleMouseUp}
                                            sx={{
                                                userSelect: 'text',
                                                cursor: 'text',
                                                '&::selection': {
                                                    backgroundColor: alpha('#FCC000', 0.3),
                                                    color: 'inherit'
                                                },
                                                '&::-moz-selection': {
                                                    backgroundColor: alpha('#FCC000', 0.3),
                                                    color: 'inherit'
                                                },
                                                '& h1': { 
                                                    fontSize: '1.5rem', 
                                                    fontWeight: 600, 
                                                    color: theme.palette.text.primary,
                                                    mt: 3,
                                                    mb: 2,
                                                    '&:first-of-type': { mt: 0 }
                                                },
                                                '& h2': { 
                                                    fontSize: '1.25rem', 
                                                    fontWeight: 600, 
                                                    color: theme.palette.text.primary,
                                                    mt: 3,
                                                    mb: 2
                                                },
                                                '& h3': { 
                                                    fontSize: '1.125rem', 
                                                    fontWeight: 500, 
                                                    color: theme.palette.text.primary,
                                                    mt: 2,
                                                    mb: 1
                                                },
                                                '& p': { 
                                                    mb: 2, 
                                                    lineHeight: 1.7,
                                                    color: 'text.secondary'
                                                },
                                                '& ul, & ol': { 
                                                    mb: 2, 
                                                    pl: 3,
                                                    '& li': { 
                                                        mb: 0.5, 
                                                        lineHeight: 1.6,
                                                        color: theme.palette.text.primary
                                                    }
                                                },
                                                '& strong': { 
                                                    fontWeight: 600, 
                                                    color: theme.palette.text.primary
                                                },
                                                '& code': { 
                                                    bgcolor: theme.palette.code.background,
                                                    color: theme.palette.code.text,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    fontSize: '0.875rem',
                                                    fontFamily: 'monospace'
                                                },
                                                '& pre': { 
                                                    bgcolor: alpha(theme.palette.grey[900], 0.05),
                                                    p: 2, 
                                                    borderRadius: 2, 
                                                    overflow: 'auto',
                                                    mb: 2,
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                                    color: 'inherit'
                                                },
                                                '& blockquote': { 
                                                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                                                    pl: 2, 
                                                    fontStyle: 'italic', 
                                                    color: theme.palette.text.secondary,
                                                    mb: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                                                    py: 1,
                                                    borderRadius: '0 4px 4px 0'
                                                },
                                                '& .markdown-content': {
                                                    overflow: 'hidden',
                                                    '& table': {
                                                        maxWidth: '100%',
                                                        width: '100%'
                                                    }
                                                }
                                            }}
                                        >
                                            {(() => {
                                                const contentToDisplay = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                                                
                                                // Check if content is HTML (contains HTML tags)
                                                const isHTML = typeof contentToDisplay === 'string' && 
                                                    /<[a-z][\s\S]*>/i.test(contentToDisplay);
                                                
                                                if (isHTML) {
                                                    // Render HTML directly
                                                    return (
                                                        <Box 
                                                            dangerouslySetInnerHTML={{ __html: contentToDisplay }}
                                                        />
                                                    );
                                                } else {
                                                    // Render markdown
                                                    return (
                                                        <MarkdownRenderer 
                                                            content={contentToDisplay}
                                                        />
                                                    );
                                                }
                                            })()}
                                        </Box>
                    ) : (
                        <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center" 
                            justifyContent="center"
                            py={6}
                            sx={{ 
                                bgcolor: theme.palette.background.hover,
                                borderRadius: 2,
                                border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`
                            }}
                        >
                            <Box 
                                sx={{ 
                                    color: theme.palette.text.disabled, 
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {section.icon}
                            </Box>
                            <Typography variant="body1" align="center" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                                Click "Generate" to create the {section.title.toLowerCase()} section
                            </Typography>
                            <Typography variant="body2" align="center" sx={{ color: theme.palette.text.disabled }}>
                                {section.description}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
                
                {/* Rewrite Menu */}
                <RewriteMenu
                    open={Boolean(menuAnchor)}
                    anchorPosition={menuAnchor}
                    onClose={handleMenuClose}
                    onSelectStyle={handleStyleSelect}
                    isLoading={rewriteLoading}
                />
            </Card>
        </Fade>
    );
});

DocumentationSection.displayName = 'DocumentationSection';

export default DocumentationSection;