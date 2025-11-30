import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    alpha,
    IconButton,
    Portal
} from '@mui/material';
import {
    X,
    ArrowLeft,
    ArrowRight,
    SparkleIcon,
    FileTextIcon,
    ArrowClockwiseIcon,
    DownloadIcon,
    PencilSimpleIcon
} from '@phosphor-icons/react';
import { dismissDocumentationOnboarding } from '../../services/onboardingService';

const DocumentationOnboardingTour = ({ 
    open, 
    onClose, 
    steps, 
    currentStepIndex,
    onNext,
    onBack,
    onSkip,
    targetElement
}) => {
    const theme = useTheme();
    const tooltipRef = useRef(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [highlightBox, setHighlightBox] = useState(null);
    const elementCleanupRef = useRef(null);

    // Calculate tooltip position and highlight box based on target element
    useEffect(() => {
        if (!open || !steps || currentStepIndex < 0 || currentStepIndex >= steps.length) {
            return;
        }

        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 100;

        const getElement = () => {
            // Get target element - could be a ref object or a function that returns a ref
            let element = null;
            if (targetElement) {
                if (typeof targetElement === 'function') {
                    const ref = targetElement();
                    element = ref?.current || ref;
                } else if (targetElement?.current) {
                    element = targetElement.current;
                } else if (targetElement && targetElement.nodeType) {
                    // It's already a DOM element
                    element = targetElement;
                }
            }
            return element;
        };

        // Clean up previous element styles immediately when step changes
        if (elementCleanupRef.current) {
            elementCleanupRef.current();
            elementCleanupRef.current = null;
        }

        const initializePosition = () => {
            const element = getElement();
            
            // If element not found and we haven't exceeded retries, try again
            if (!element && retryCount < maxRetries) {
                retryCount++;
                setTimeout(initializePosition, retryDelay);
                return;
            }

            // Scroll element into view if needed (only once when step changes)
            // Also ensure element is above backdrop
            if (element) {
                // Set z-index on the element itself to ensure it's above the backdrop
                const originalZIndex = element.style.zIndex;
                const originalPosition = element.style.position;
                const computedPosition = window.getComputedStyle(element).position;
                
                // Ensure element has positioning context
                if (computedPosition === 'static') {
                    element.style.position = 'relative';
                }
                element.style.zIndex = '10001';
                
                // Store cleanup function in ref
                elementCleanupRef.current = () => {
                    element.style.zIndex = originalZIndex || '';
                    if (originalPosition) {
                        element.style.position = originalPosition;
                    } else if (computedPosition === 'static') {
                        element.style.position = '';
                    }
                };
                
                // Use requestAnimationFrame for smoother, faster scrolling
                requestAnimationFrame(() => {
                    element.scrollIntoView({ 
                        behavior: 'auto', // Use 'auto' for instant scroll, faster than 'smooth'
                        block: 'center',
                        inline: 'nearest'
                    });
                });
            }
        };

        // Use requestAnimationFrame to batch the initialization
        requestAnimationFrame(() => {
            initializePosition();
        });

        const updatePosition = () => {
            try {
                // Re-get element in case it changed
                let currentElement = getElement();
                const step = steps[currentStepIndex];
                const noHighlight = step.noHighlight || false;
                
                if (!currentElement || noHighlight) {
                    // If element not found or step doesn't need highlighting, center the tooltip
                    const scrollY = window.scrollY || window.pageYOffset;
                    const scrollX = window.scrollX || window.pageXOffset;
                    const tooltipWidth = 380;
                    const tooltipHeight = 280;
                    const preferredPosition = step.position || 'center';
                    
                    // For noHighlight steps with 'center' position, always center in viewport
                    if (noHighlight && preferredPosition === 'center') {
                        // Center in viewport (visible area)
                        setTooltipPosition({
                            top: scrollY + (window.innerHeight / 2) - (tooltipHeight / 2),
                            left: scrollX + (window.innerWidth / 2) - (tooltipWidth / 2)
                        });
                    } else if (noHighlight && currentElement) {
                        // Position tooltip below the element but don't highlight it
                        const rect = currentElement.getBoundingClientRect();
                        // Ensure tooltip is visible in viewport
                        let tooltipTop = rect.bottom + scrollY + 40;
                        let tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                        
                        // Check if tooltip would be outside viewport and adjust
                        const viewportTop = scrollY;
                        const viewportBottom = scrollY + window.innerHeight;
                        const viewportLeft = scrollX;
                        const viewportRight = scrollX + window.innerWidth;
                        
                        // Center vertically if it would go off screen
                        if (tooltipTop + tooltipHeight > viewportBottom || tooltipTop < viewportTop) {
                            tooltipTop = scrollY + (window.innerHeight / 2) - (tooltipHeight / 2);
                        }
                        
                        // Ensure horizontal centering within viewport
                        if (tooltipLeft + tooltipWidth > viewportRight || tooltipLeft < viewportLeft) {
                            tooltipLeft = scrollX + (window.innerWidth / 2) - (tooltipWidth / 2);
                        }
                        
                        setTooltipPosition({
                            top: tooltipTop,
                            left: tooltipLeft
                        });
                    } else {
                        // Center in viewport (visible area)
                        setTooltipPosition({
                            top: scrollY + (window.innerHeight / 2) - (tooltipHeight / 2),
                            left: scrollX + (window.innerWidth / 2) - (tooltipWidth / 2)
                        });
                    }
                    setHighlightBox(null);
                    return;
                }

                const rect = currentElement.getBoundingClientRect();
                const scrollY = window.scrollY || window.pageYOffset;
                const scrollX = window.scrollX || window.pageXOffset;

                // Calculate highlight box (document coordinates for absolute positioning)
                setHighlightBox({
                    top: rect.top + scrollY,
                    left: rect.left + scrollX,
                    width: rect.width,
                    height: rect.height
                });

                // Calculate tooltip position (prefer bottom-right, adjust if needed)
                const preferredPosition = step.position || 'bottom-right';
                
                const tooltipWidth = 380;
                const tooltipHeight = 280;
                const spacing = 20; // Space between element and tooltip
                
                // Start with preferred position
                let tooltipTop = 0;
                let tooltipLeft = 0;
                
                // Calculate initial position based on preference
                if (preferredPosition === 'bottom-right') {
                    tooltipTop = rect.bottom + scrollY + spacing;
                    tooltipLeft = rect.right + scrollX + spacing;
                } else if (preferredPosition === 'bottom-center') {
                    tooltipTop = rect.bottom + scrollY + spacing;
                    tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                } else if (preferredPosition === 'bottom') {
                    // Position directly below the element, centered horizontally
                    // Add significant spacing to ensure it's clearly below and not overlapping
                    const bottomSpacing = 40; // Extra spacing for 'bottom' position
                    tooltipTop = rect.bottom + scrollY + bottomSpacing;
                    tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                } else if (preferredPosition === 'top-center') {
                    tooltipTop = rect.top + scrollY - tooltipHeight - spacing;
                    tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                } else if (preferredPosition === 'right') {
                    tooltipTop = rect.top + scrollY + (rect.height / 2) - (tooltipHeight / 2);
                    tooltipLeft = rect.right + scrollX + spacing;
                } else if (preferredPosition === 'left') {
                    tooltipTop = rect.top + scrollY + (rect.height / 2) - (tooltipHeight / 2);
                    tooltipLeft = rect.left + scrollX - tooltipWidth - spacing;
                } else if (preferredPosition === 'center') {
                    // Center the tooltip in the visible viewport
                    tooltipTop = scrollY + (window.innerHeight / 2) - (tooltipHeight / 2);
                    tooltipLeft = scrollX + (window.innerWidth / 2) - (tooltipWidth / 2);
                } else {
                    // Default: bottom-right
                    tooltipTop = rect.bottom + scrollY + spacing;
                    tooltipLeft = rect.right + scrollX + spacing;
                }

                // Ensure tooltip stays within viewport (using viewport coordinates for checking)
                const viewportRight = window.innerWidth;
                const viewportBottom = window.innerHeight;
                const viewportLeft = 0;
                const viewportTop = 0;
                
                // Convert to viewport coordinates for checking
                const tooltipTopViewport = tooltipTop - scrollY;
                const tooltipLeftViewport = tooltipLeft - scrollX;
                
                // Check right boundary
                if (tooltipLeftViewport + tooltipWidth > viewportRight) {
                    // Try left side
                    const leftPosition = rect.left + scrollX - tooltipWidth - spacing;
                    if (leftPosition >= scrollX) {
                        tooltipLeft = leftPosition;
                    } else {
                        // Center horizontally if both sides don't work
                        tooltipLeft = scrollX + Math.max(16, (viewportRight - tooltipWidth) / 2);
                    }
                }
                
                // Check left boundary
                if (tooltipLeft < scrollX + 16) {
                    tooltipLeft = scrollX + 16;
                }
                
                // Check bottom boundary (but for 'bottom' position, prefer to keep it below)
                const newTooltipTopViewport = tooltipTop - scrollY;
                if (preferredPosition === 'bottom') {
                    // For 'bottom' position, ensure it's below even if it goes slightly off screen
                    // Just make sure it's not completely off screen
                    if (newTooltipTopViewport + tooltipHeight > viewportBottom + 50) {
                        // If it's way off screen, adjust but keep it below
                        tooltipTop = rect.bottom + scrollY + 30;
                    }
                } else if (newTooltipTopViewport + tooltipHeight > viewportBottom) {
                    // Try top side for other positions
                    const topPosition = rect.top + scrollY - tooltipHeight - spacing;
                    if (topPosition >= scrollY) {
                        tooltipTop = topPosition;
                    } else {
                        // Center vertically if both sides don't work
                        tooltipTop = scrollY + Math.max(16, (viewportBottom - tooltipHeight) / 2);
                    }
                }
                
                // Check top boundary
                if (tooltipTop < scrollY + 16) {
                    tooltipTop = scrollY + 16;
                }
                
                // Final check: ensure tooltip doesn't overlap with element
                // Skip overlap detection for 'bottom' position to preserve below positioning
                if (preferredPosition !== 'bottom') {
                    const finalTooltipTopViewport = tooltipTop - scrollY;
                    const finalTooltipLeftViewport = tooltipLeft - scrollX;
                    
                    // Check if tooltip overlaps with element
                    const overlapsHorizontally = finalTooltipLeftViewport < rect.right && finalTooltipLeftViewport + tooltipWidth > rect.left;
                    const overlapsVertically = finalTooltipTopViewport < rect.bottom && finalTooltipTopViewport + tooltipHeight > rect.top;
                    
                    if (overlapsHorizontally && overlapsVertically) {
                        // Tooltip completely overlaps, try to position it to the right first
                        const rightPosition = rect.right + scrollX + spacing;
                        if (rightPosition + tooltipWidth <= scrollX + viewportRight) {
                            tooltipLeft = rightPosition;
                        } else {
                            // Try left side
                            const leftPosition = rect.left + scrollX - tooltipWidth - spacing;
                            if (leftPosition >= scrollX) {
                                tooltipLeft = leftPosition;
                            } else {
                                // If both sides don't work, position below
                                tooltipTop = rect.bottom + scrollY + spacing;
                                tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                            }
                        }
                    } else if (overlapsHorizontally) {
                        // Only horizontal overlap, move vertically
                        if (finalTooltipTopViewport < rect.top) {
                            // Tooltip is above, move it below
                            tooltipTop = rect.bottom + scrollY + spacing;
                        } else {
                            // Tooltip is below, move it above
                            tooltipTop = rect.top + scrollY - tooltipHeight - spacing;
                        }
                    } else if (overlapsVertically) {
                        // Only vertical overlap, move horizontally
                        if (finalTooltipLeftViewport < rect.left) {
                            // Tooltip is on left, move to right
                            tooltipLeft = rect.right + scrollX + spacing;
                        } else {
                            // Tooltip is on right, move to left
                            tooltipLeft = rect.left + scrollX - tooltipWidth - spacing;
                        }
                    }
                }
                
                // Final boundary check after overlap adjustment
                const finalTooltipTopViewport2 = tooltipTop - scrollY;
                const finalTooltipLeftViewport2 = tooltipLeft - scrollX;
                
                if (finalTooltipLeftViewport2 + tooltipWidth > viewportRight) {
                    tooltipLeft = scrollX + viewportRight - tooltipWidth - 16;
                }
                if (finalTooltipLeftViewport2 < 0) {
                    tooltipLeft = scrollX + 16;
                }
                if (finalTooltipTopViewport2 + tooltipHeight > viewportBottom) {
                    tooltipTop = scrollY + viewportBottom - tooltipHeight - 16;
                }
                if (finalTooltipTopViewport2 < 0) {
                    tooltipTop = scrollY + 16;
                }

                // Update state directly for immediate response
                setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
            } catch (error) {
                console.error('Error calculating tooltip position:', error);
            }
        };

        // Initial position update - immediate for step changes
        updatePosition();
        
        // Debounce scroll and resize handlers for better performance
        let scrollTimeout;
        let resizeTimeout;
        
        const handleScroll = () => {
            if (scrollTimeout) {
                cancelAnimationFrame(scrollTimeout);
            }
            scrollTimeout = requestAnimationFrame(updatePosition);
        };
        
        const handleResize = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(() => {
                requestAnimationFrame(updatePosition);
            }, 100);
        };
        
        // Update on scroll and resize
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
            // Cleanup element styles
            if (elementCleanupRef.current) {
                elementCleanupRef.current();
                elementCleanupRef.current = null;
            }
            // Cancel any pending animation frames
            if (scrollTimeout) {
                cancelAnimationFrame(scrollTimeout);
            }
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
        };
    }, [open, targetElement, currentStepIndex, steps]);

    if (!open || !steps || currentStepIndex < 0 || currentStepIndex >= steps.length) {
        return null;
    }

    const currentStep = steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            // Just close - the parent component will handle dismissal
            onClose();
        } else {
            onNext();
        }
    };

    const handleDismiss = () => {
        dismissDocumentationOnboarding();
        onClose();
    };

    return (
        <Portal>
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 13000, // Very high z-index to ensure it's above all content
                    pointerEvents: 'auto'
                }}
            >
                {/* Backdrop overlay with cutout using multiple layers */}
                {highlightBox ? (
                    <>
                        {/* Top backdrop */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: `${highlightBox.top}px`,
                                bgcolor: alpha(theme.palette.common.black, 0.5),
                                backdropFilter: 'blur(2px)',
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'auto'
                            }}
                            onClick={handleDismiss}
                        />
                        {/* Bottom backdrop */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: `${highlightBox.top + highlightBox.height}px`,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                bgcolor: alpha(theme.palette.common.black, 0.5),
                                backdropFilter: 'blur(2px)',
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'auto'
                            }}
                            onClick={handleDismiss}
                        />
                        {/* Left backdrop */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: `${highlightBox.top}px`,
                                left: 0,
                                width: `${highlightBox.left}px`,
                                height: `${highlightBox.height}px`,
                                bgcolor: alpha(theme.palette.common.black, 0.5),
                                backdropFilter: 'blur(2px)',
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'auto'
                            }}
                            onClick={handleDismiss}
                        />
                        {/* Right backdrop */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: `${highlightBox.top}px`,
                                left: `${highlightBox.left + highlightBox.width}px`,
                                right: 0,
                                height: `${highlightBox.height}px`,
                                bgcolor: alpha(theme.palette.common.black, 0.5),
                                backdropFilter: 'blur(2px)',
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'auto'
                            }}
                            onClick={handleDismiss}
                        />
                    </>
                ) : (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: alpha(theme.palette.common.black, 0.5),
                            backdropFilter: 'blur(2px)',
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'auto'
                        }}
                        onClick={handleDismiss}
                    />
                )}

                {/* Highlight box border and glow - positioned above backdrop */}
                {highlightBox && (
                    <>
                        {/* Glow effect */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: `${highlightBox.top - 4}px`,
                                left: `${highlightBox.left - 4}px`,
                                width: `${highlightBox.width + 8}px`,
                                height: `${highlightBox.height + 8}px`,
                                borderRadius: 2,
                                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                                pointerEvents: 'none',
                                zIndex: 13001,
                                transition: 'opacity 0.15s ease, transform 0.15s ease', // Faster transition
                                animation: 'pulse 2s ease-in-out infinite',
                                '@keyframes pulse': {
                                    '0%, 100%': {
                                        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`
                                    },
                                    '50%': {
                                        boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.8)}`
                                    }
                                }
                            }}
                        />
                        {/* Border */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: `${highlightBox.top}px`,
                                left: `${highlightBox.left}px`,
                                width: `${highlightBox.width}px`,
                                height: `${highlightBox.height}px`,
                                borderRadius: 2,
                                border: `2px solid ${theme.palette.primary.main}`,
                                pointerEvents: 'none',
                                zIndex: 13001,
                                transition: 'opacity 0.15s ease, transform 0.15s ease' // Faster transition
                            }}
                        />
                    </>
                )}

                {/* Tooltip */}
                <Paper
                    ref={tooltipRef}
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        width: 380,
                        maxWidth: 'calc(100vw - 32px)',
                        bgcolor: theme.palette.background.paper,
                        borderRadius: 3,
                        boxShadow: theme.shadows[12],
                        zIndex: 13002, // Very high z-index to ensure it's above everything including tabs
                        overflow: 'hidden',
                        transition: 'opacity 0.15s ease, transform 0.15s ease', // Faster transition for step changes
                        pointerEvents: 'auto',
                        transform: 'none' // Ensure no transform that might affect stacking
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            p: 3,
                            pb: 2,
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                                {currentStep.icon && (
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
                                        {React.cloneElement(currentStep.icon, { size: 20 })}
                                    </Box>
                                )}
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '1.125rem',
                                        color: theme.palette.text.primary,
                                        fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif"
                                    }}
                                >
                                    {currentStep.title}
                                </Typography>
                            </Box>
                            <IconButton
                                onClick={handleDismiss}
                                size="small"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.background.hover, 0.5),
                                        color: theme.palette.text.primary
                                    }
                                }}
                            >
                                <X size={18} />
                            </IconButton>
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                lineHeight: 1.6,
                                fontSize: '0.875rem',
                                fontFamily: "'Nunito Sans', sans-serif"
                            }}
                        >
                            {currentStep.description}
                        </Typography>
                    </Box>

                    {/* Footer with navigation */}
                    <Box
                        sx={{
                            p: 2.5,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 2,
                            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        {/* Navigation buttons */}
                        <Box display="flex" gap={1.5}>
                            {!isFirstStep && (
                                <Button
                                    onClick={onBack}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 2,
                                        px: 2.5,
                                        py: 1,
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        textTransform: 'none',
                                        borderColor: alpha(theme.palette.divider, 0.3),
                                        color: theme.palette.text.primary,
                                        '&:hover': {
                                            borderColor: alpha(theme.palette.divider, 0.5),
                                            bgcolor: alpha(theme.palette.background.chat, 0.5)
                                        }
                                    }}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                onClick={handleDismiss}
                                variant="text"
                                sx={{
                                    borderRadius: 2,
                                    px: 2.5,
                                    py: 1,
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 500,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.background.hover, 0.5),
                                        color: theme.palette.text.primary
                                    }
                                }}
                            >
                                Skip
                            </Button>
                            <Button
                                onClick={handleNext}
                                variant="contained"
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1,
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    bgcolor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }
                                }}
                            >
                                {isLastStep ? 'Finish' : 'Next'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Portal>
    );
};

export default DocumentationOnboardingTour;

