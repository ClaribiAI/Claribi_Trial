import React, { useMemo, memo } from 'react';
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
// Editing functionality commented out
// import RichTextEditor from './RichTextEditor';

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
    theme 
}) => {
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
                                color: theme.palette.primary.main
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
                                            sx={{
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
                            <Box sx={{ color: theme.palette.text.disabled, mb: 2 }}>
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
            </Card>
        </Fade>
    );
});

DocumentationSection.displayName = 'DocumentationSection';

export default DocumentationSection;