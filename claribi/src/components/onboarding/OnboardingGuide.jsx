import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    CloudArrowUp,
    FileText,
    ChatCircle,
    Stethoscope,
    House
} from '@phosphor-icons/react';
import { dismissOnboarding } from '../../services/onboardingService';

const OnboardingGuide = ({ 
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

    // Get element function - memoized to avoid recreating on every render
    const getElement = useCallback(() => {
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
    }, [targetElement]);

    // Calculate tooltip position and highlight box based on target element
    useEffect(() => {
        if (!open || !steps || currentStepIndex < 0 || currentStepIndex >= steps.length) {
            return;
        }

        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 100;

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
                if (!steps || currentStepIndex < 0 || currentStepIndex >= steps.length) return;
                const step = steps[currentStepIndex];
                const noHighlight = step.noHighlight || false;
                
                const scrollY = window.scrollY || window.pageYOffset;
                const scrollX = window.scrollX || window.pageXOffset;
                const tooltipWidth = 380;
                const tooltipHeight = 280;
                const preferredPosition = step.position || (noHighlight ? 'center' : 'bottom-right');
                
                if (!currentElement || noHighlight) {
                    // If element not found or step doesn't need highlighting, center the tooltip
                    const newPosition = {
                        top: scrollY + (window.innerHeight / 2) - (tooltipHeight / 2),
                        left: scrollX + (window.innerWidth / 2) - (tooltipWidth / 2)
                    };
                    
                    // Only update if position changed significantly (avoid micro-updates)
                    setTooltipPosition(prev => {
                        if (Math.abs(prev.top - newPosition.top) < 1 && Math.abs(prev.left - newPosition.left) < 1) {
                            return prev;
                        }
                        return newPosition;
                    });
                    setHighlightBox(null);
                    return;
                }

                const rect = currentElement.getBoundingClientRect();
                
                // Calculate highlight box (document coordinates for absolute positioning)
                const newHighlightBox = {
                    top: rect.top + scrollY,
                    left: rect.left + scrollX,
                    width: rect.width,
                    height: rect.height
                };
                
                // Only update highlight box if it changed significantly
                setHighlightBox(prev => {
                    if (prev && 
                        Math.abs(prev.top - newHighlightBox.top) < 1 &&
                        Math.abs(prev.left - newHighlightBox.left) < 1 &&
                        Math.abs(prev.width - newHighlightBox.width) < 1 &&
                        Math.abs(prev.height - newHighlightBox.height) < 1) {
                        return prev;
                    }
                    return newHighlightBox;
                });

                const spacing = 20;
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
                    tooltipTop = rect.bottom + scrollY + 40;
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
                    tooltipTop = scrollY + (window.innerHeight / 2) - (tooltipHeight / 2);
                    tooltipLeft = scrollX + (window.innerWidth / 2) - (tooltipWidth / 2);
                } else {
                    tooltipTop = rect.bottom + scrollY + spacing;
                    tooltipLeft = rect.right + scrollX + spacing;
                }

                // Simplified boundary checks - only adjust if necessary
                const viewportRight = window.innerWidth;
                const viewportBottom = window.innerHeight;
                const tooltipTopViewport = tooltipTop - scrollY;
                const tooltipLeftViewport = tooltipLeft - scrollX;
                
                if (preferredPosition === 'right' && tooltipLeftViewport + tooltipWidth > viewportRight) {
                    tooltipLeft = scrollX + Math.max(16, viewportRight - tooltipWidth - 16);
                } else if (tooltipLeftViewport + tooltipWidth > viewportRight) {
                    const leftPosition = rect.left + scrollX - tooltipWidth - spacing;
                    tooltipLeft = leftPosition >= scrollX ? leftPosition : scrollX + Math.max(16, (viewportRight - tooltipWidth) / 2);
                }
                
                if (tooltipLeft < scrollX + 16) {
                    tooltipLeft = scrollX + 16;
                }
                
                if (preferredPosition === 'bottom' && tooltipTopViewport + tooltipHeight > viewportBottom + 50) {
                    tooltipTop = rect.bottom + scrollY + 30;
                } else if (preferredPosition === 'right') {
                    if (tooltipTopViewport + tooltipHeight > viewportBottom) {
                        tooltipTop = scrollY + Math.max(16, viewportBottom - tooltipHeight - 16);
                    }
                    if (tooltipTopViewport < 0) {
                        tooltipTop = scrollY + 16;
                    }
                } else if (tooltipTopViewport + tooltipHeight > viewportBottom) {
                    const topPosition = rect.top + scrollY - tooltipHeight - spacing;
                    tooltipTop = topPosition >= scrollY ? topPosition : scrollY + Math.max(16, (viewportBottom - tooltipHeight) / 2);
                }
                
                if (tooltipTop < scrollY + 16) {
                    tooltipTop = scrollY + 16;
                }
                
                // Skip complex overlap detection for better performance - only for non-preferred positions
                if (preferredPosition !== 'bottom' && preferredPosition !== 'right' && preferredPosition !== 'center') {
                    const finalTooltipTopViewport = tooltipTop - scrollY;
                    const finalTooltipLeftViewport = tooltipLeft - scrollX;
                    const overlapsHorizontally = finalTooltipLeftViewport < rect.right && finalTooltipLeftViewport + tooltipWidth > rect.left;
                    const overlapsVertically = finalTooltipTopViewport < rect.bottom && finalTooltipTopViewport + tooltipHeight > rect.top;
                    
                    if (overlapsHorizontally && overlapsVertically) {
                        const rightPosition = rect.right + scrollX + spacing;
                        if (rightPosition + tooltipWidth <= scrollX + viewportRight) {
                            tooltipLeft = rightPosition;
                        } else {
                            tooltipTop = rect.bottom + scrollY + spacing;
                            tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                        }
                    }
                }
                
                // Final boundary check
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

                // Only update if position changed significantly
                setTooltipPosition(prev => {
                    if (Math.abs(prev.top - tooltipTop) < 1 && Math.abs(prev.left - tooltipLeft) < 1) {
                        return prev;
                    }
                    return { top: tooltipTop, left: tooltipLeft };
                });
            } catch (error) {
                console.error('Error calculating tooltip position:', error);
            }
        };

        // Initial position update - immediate for step changes
        updatePosition();
        
        // Throttle scroll and resize handlers for better performance
        let scrollTimeout;
        let resizeTimeout;
        let lastScrollTime = 0;
        let lastResizeTime = 0;
        const SCROLL_THROTTLE = 16; // ~60fps
        const RESIZE_THROTTLE = 150;
        
        const handleScroll = () => {
            const now = performance.now();
            if (now - lastScrollTime < SCROLL_THROTTLE) {
                if (scrollTimeout) {
                    cancelAnimationFrame(scrollTimeout);
                }
                scrollTimeout = requestAnimationFrame(() => {
                    lastScrollTime = performance.now();
                    updatePosition();
                });
            } else {
                lastScrollTime = now;
                updatePosition();
            }
        };
        
        const handleResize = () => {
            const now = performance.now();
            if (now - lastResizeTime < RESIZE_THROTTLE) {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = setTimeout(() => {
                    lastResizeTime = performance.now();
                    updatePosition();
                }, RESIZE_THROTTLE);
            } else {
                lastResizeTime = now;
                updatePosition();
            }
        };
        
        // Update on scroll and resize - use passive listeners for better performance
        window.addEventListener('scroll', handleScroll, { passive: true, capture: false });
        window.addEventListener('resize', handleResize, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll, { passive: true, capture: false });
            window.removeEventListener('resize', handleResize, { passive: true });
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
    }, [open, targetElement, currentStepIndex, steps, getElement]);

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
        dismissOnboarding();
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
                                backdropFilter: 'blur(1px)',
                                transition: 'opacity 0.2s ease',
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
                                backdropFilter: 'blur(1px)',
                                transition: 'opacity 0.2s ease',
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
                                backdropFilter: 'blur(1px)',
                                transition: 'opacity 0.2s ease',
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
                                backdropFilter: 'blur(1px)',
                                transition: 'opacity 0.2s ease',
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
                                boxShadow: `0 0 20px ${alpha('#FCC000', 0.5)}`,
                                pointerEvents: 'none',
                                zIndex: 13001,
                                transition: 'opacity 0.15s ease, transform 0.15s ease', // Faster transition
                                animation: 'pulse 2s ease-in-out infinite',
                                '@keyframes pulse': {
                                    '0%, 100%': {
                                        boxShadow: `0 0 20px ${alpha('#FCC000', 0.5)}`
                                    },
                                    '50%': {
                                        boxShadow: `0 0 30px ${alpha('#FCC000', 0.8)}`
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
                                border: `2px solid #FCC000`,
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
                                            p: currentStep.icon.type === 'img' || currentStep.icon.props?.component === 'img' ? 0 : 1,
                                            borderRadius: 2,
                                            bgcolor: (currentStep.icon.type === 'img' || currentStep.icon.props?.component === 'img') 
                                                ? 'transparent' 
                                                : alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {currentStep.icon.type === 'img' || currentStep.icon.props?.component === 'img' 
                                            ? currentStep.icon 
                                            : React.cloneElement(currentStep.icon, { size: 20 })}
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
                                        transition: 'none',
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
                                    transition: 'none',
                                    bgcolor: 'transparent',
                                    '&:hover': {
                                        bgcolor: 'transparent',
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
                                    transition: 'none',
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.dark,
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

export default OnboardingGuide;
