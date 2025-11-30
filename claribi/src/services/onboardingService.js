/**
 * Onboarding utility functions for managing onboarding guide visibility
 */

const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed';

/**
 * Check if onboarding guide should be shown
 * @returns {boolean} true if guide should be shown, false if dismissed
 */
export const shouldShowOnboarding = () => {
  try {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    return dismissed !== 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return true; // Default to showing if there's an error
  }
};

/**
 * Mark onboarding guide as dismissed (don't show again)
 */
export const dismissOnboarding = () => {
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  } catch (error) {
    console.error('Error dismissing onboarding:', error);
  }
};

/**
 * Reset onboarding guide (for testing purposes)
 */
export const resetOnboarding = () => {
  try {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};

/**
 * Documentation onboarding utility functions
 */
const DOCUMENTATION_ONBOARDING_DISMISSED_KEY = 'documentation_onboarding_dismissed';

/**
 * Check if documentation onboarding tour should be shown
 * @returns {boolean} true if tour should be shown, false if dismissed
 */
export const shouldShowDocumentationOnboarding = () => {
  try {
    const dismissed = localStorage.getItem(DOCUMENTATION_ONBOARDING_DISMISSED_KEY);
    return dismissed !== 'true';
  } catch (error) {
    console.error('Error checking documentation onboarding status:', error);
    return true; // Default to showing if there's an error
  }
};

/**
 * Mark documentation onboarding tour as dismissed (don't show again)
 */
export const dismissDocumentationOnboarding = () => {
  try {
    localStorage.setItem(DOCUMENTATION_ONBOARDING_DISMISSED_KEY, 'true');
  } catch (error) {
    console.error('Error dismissing documentation onboarding:', error);
  }
};

/**
 * Reset documentation onboarding tour (for testing purposes)
 */
export const resetDocumentationOnboarding = () => {
  try {
    localStorage.removeItem(DOCUMENTATION_ONBOARDING_DISMISSED_KEY);
  } catch (error) {
    console.error('Error resetting documentation onboarding:', error);
  }
};

