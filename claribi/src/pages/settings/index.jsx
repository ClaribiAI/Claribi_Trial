import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  useTheme as useMuiTheme,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Link,
  alpha,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  User,
  CreditCard,
  Palette,
  ChatCircle,
  Cookie,
  Trash,
  FileText,
  Shield,
  ChartBar,
  Info,
  ArrowClockwise
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import {
  getChatMode,
  setChatMode,
  getCookiePreferences,
  setCookiePreferences
} from '../../services/settings';
import statsService from '../../services/statsService';

const SettingsPage = () => {
  const muiTheme = useMuiTheme();
  const { isDarkMode, setThemeMode } = useTheme();
  const { currentUser, logout } = useAuth();
  const { showNotification } = useNotification();

  // Email state
  const [email, setEmail] = useState('');
  
  // Subscription state
  const [subscription, setSubscription] = useState('none');

  // Chat mode state
  const [chatMode, setChatModeState] = useState(getChatMode());

  // Cookie preferences state
  const [cookiePrefs, setCookiePrefs] = useState(getCookiePreferences());

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Usage data state
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Load email and subscription from user data
  useEffect(() => {
    const loadUserData = async () => {
      // Prefer email from database, then Graph API data, then username as fallback
      if (currentUser?.email) {
        setEmail(currentUser.email);
      } else if (currentUser?.graph_data?.userPrincipalName || currentUser?.graph_data?.mail) {
        // Email from Graph API data
        setEmail(currentUser.graph_data.userPrincipalName || currentUser.graph_data.mail);
      } else if (currentUser?.username) {
        // If we have a user but no email data, try to use username as fallback
        setEmail(currentUser.username || 'Not available');
      } else {
        setEmail('Not available');
      }
      
      // Load subscription from user data
      if (currentUser?.subscription) {
        setSubscription(currentUser.subscription);
      } else {
        setSubscription('none');
      }
    };

    loadUserData();
  }, [currentUser]);

  // Load usage data
  useEffect(() => {
    const loadUsageData = async () => {
      setUsageLoading(true);
      try {
        const response = await statsService.getUserTokenUsage();
        if (response.success && response.data) {
          setUsageData(response.data);
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
        showNotification('Failed to load usage data', 'error');
      } finally {
        setUsageLoading(false);
      }
    };

    loadUsageData();
  }, [showNotification]);
  
  // Format subscription name for display
  const formatSubscriptionName = (sub) => {
    if (!sub || sub === 'none') {
      return 'Free Plan';
    }
    // Capitalize first letter and add "Plan" suffix
    return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase() + ' Plan';
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('en-US');
  };

  // Get progress bar color based on usage status
  const getProgressBarColor = (usage, limit, approachingLimit, remaining, isDocs = false) => {
    if (limit === null || limit === undefined) {
      return muiTheme.palette.primary.main; // Unlimited - use primary color
    }
    
    // Limit exceeded (usage >= limit)
    if (usage >= limit) {
      return muiTheme.palette.error.main; // Red for exceeded
    }
    
    // Approaching limit (remaining < threshold: 5 for docs, 20 for chat)
    const threshold = isDocs ? 5 : 20;
    if (approachingLimit || (remaining !== null && remaining !== undefined && remaining < threshold)) {
      return muiTheme.palette.warning.main; // Yellow/orange for approaching
    }
    
    // Normal usage
    return muiTheme.palette.primary.main; // Blue for normal
  };

  // Handle theme mode change
  const handleThemeModeChange = (event) => {
    const newMode = event.target.value;
    setThemeMode(newMode);
    showNotification('Theme preference saved', 'success');
  };

  // Handle chat mode change
  const handleChatModeChange = (event) => {
    const newMode = event.target.value;
    setChatModeState(newMode);
    setChatMode(newMode);
    showNotification('Chat mode preference saved', 'success');
  };


  // Handle delete all data - show support contact message
  const handleDeleteAllData = () => {
    setDeleteDialogOpen(false);
  };

  const SettingSection = ({ icon: Icon, title, children, iconColor }) => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Icon size={20} color={iconColor || muiTheme.palette.primary.main} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      {children}
      <Divider sx={{ my: 3 }} />
    </Box>
  );

  const SettingItem = ({ label, description, children, infoTooltip }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            {infoTooltip && (
              <Tooltip 
                title={infoTooltip}
                arrow
                placement="top"
                slotProps={{
                  tooltip: {
                    sx: {
                      maxWidth: 400,
                      fontSize: '0.875rem',
                      bgcolor: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.95)' 
                        : 'rgba(0, 0, 0, 0.95)',
                      color: muiTheme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.87)' 
                        : 'rgba(255, 255, 255, 0.87)',
                    }
                  }
                }}
              >
                <IconButton 
                  size="small" 
                  sx={{ 
                    p: 0.5,
                    color: muiTheme.palette.text.secondary,
                    '&:hover': {
                      color: muiTheme.palette.primary.main,
                    }
                  }}
                >
                  <Info size={16} weight="fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {description}
            </Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 200 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4 }}>
        Settings
      </Typography>
      
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
          bgcolor: muiTheme.palette.background.paper,
        }}
      >
        {/* Account Section */}
        <SettingSection icon={User} title="Account">
          <SettingItem label="Email" description="Your account email address">
            <TextField
              fullWidth
              size="small"
              value={email || 'Not available'}
              disabled
              sx={{
                '& .MuiInputBase-input': {
                  color: muiTheme.palette.text.secondary,
                },
              }}
            />
          </SettingItem>
        </SettingSection>

        {/* Subscription Section */}
        <SettingSection icon={CreditCard} title="Subscription">
          <SettingItem label="Plan" description="Your current subscription plan">
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(muiTheme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, color: muiTheme.palette.primary.main }}>
                {formatSubscriptionName(subscription)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                {subscription === 'none' ? 'No active subscription' : 'Active until renewal'}
              </Typography>
            </Box>
          </SettingItem>
        </SettingSection>

        {/* Usage Section */}
        <SettingSection icon={ChartBar} title="Usage">
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Usage limits and remaining capacity
            </Typography>
            {usageLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading...
                </Typography>
              </Box>
            ) : usageData ? (
              <Grid container spacing={2}>
                {/* Chat Usage Card */}
                <Grid item xs={12} sm={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ChatCircle size={24} color={muiTheme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Chat Queries
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: muiTheme.palette.primary.main }}>
                            {formatNumber(usageData.chat_queries || 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {usageData.chat_limit === null || usageData.chat_limit === undefined
                              ? 'Unlimited'
                              : `of ${formatNumber(usageData.chat_limit)}`}
                          </Typography>
                        </Box>
                        {usageData.chat_limit !== null && usageData.chat_limit !== undefined && (
                          <>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(((usageData.chat_queries || 0) / usageData.chat_limit) * 100, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: alpha(getProgressBarColor(
                                  usageData.chat_queries || 0,
                                  usageData.chat_limit,
                                  usageData.chat_approaching_limit,
                                  usageData.chat_remaining,
                                  false
                                ), 0.1),
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 1,
                                  backgroundColor: getProgressBarColor(
                                    usageData.chat_queries || 0,
                                    usageData.chat_limit,
                                    usageData.chat_approaching_limit,
                                    usageData.chat_remaining,
                                    false
                                  ),
                                },
                              }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {usageData.chat_limit - (usageData.chat_queries || 0) > 0
                                  ? `${formatNumber(usageData.chat_limit - (usageData.chat_queries || 0))} remaining`
                                  : 'Limit reached'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(((usageData.chat_queries || 0) / usageData.chat_limit) * 100)}% used
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Documents Usage Card */}
                <Grid item xs={12} sm={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <FileText size={24} color={muiTheme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Documents Generated
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: muiTheme.palette.primary.main }}>
                            {formatNumber(usageData.documents_generated || 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {usageData.documents_limit === null || usageData.documents_limit === undefined
                              ? 'Unlimited'
                              : `of ${formatNumber(usageData.documents_limit)}`}
                          </Typography>
                        </Box>
                        {usageData.documents_limit !== null && usageData.documents_limit !== undefined && (
                          <>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(((usageData.documents_generated || 0) / usageData.documents_limit) * 100, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: alpha(getProgressBarColor(
                                  usageData.documents_generated || 0,
                                  usageData.documents_limit,
                                  usageData.documents_approaching_limit,
                                  usageData.documents_remaining,
                                  true
                                ), 0.1),
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 1,
                                  backgroundColor: getProgressBarColor(
                                    usageData.documents_generated || 0,
                                    usageData.documents_limit,
                                    usageData.documents_approaching_limit,
                                    usageData.documents_remaining,
                                    true
                                  ),
                                },
                              }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {usageData.documents_limit - (usageData.documents_generated || 0) > 0
                                  ? `${formatNumber(usageData.documents_limit - (usageData.documents_generated || 0))} remaining`
                                  : 'Limit reached'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(((usageData.documents_generated || 0) / usageData.documents_limit) * 100)}% used
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Rewrites Usage Card */}
                <Grid item xs={12} sm={6}>
                  <Card
                    elevation={0}
                    sx={{
                      border: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ArrowClockwise size={24} color={muiTheme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Section Rewrites
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: muiTheme.palette.primary.main }}>
                            {formatNumber(usageData.rewrites_count || 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total rewrites
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                          Combined rewrites across all sections
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No usage data available
                </Typography>
              </Box>
            )}
          </Box>
        </SettingSection>

        {/* Personalization Section */}
        <SettingSection icon={Palette} title="Personalization">
          <SettingItem
            label="Theme Mode"
            description="Choose your preferred theme"
          >
            <FormControl fullWidth size="small">
              <Select
                value={isDarkMode ? 'dark' : 'light'}
                onChange={handleThemeModeChange}
                sx={{
                  '& .MuiSelect-select': {
                    py: 1.25,
                  },
                }}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
          </SettingItem>

          <SettingItem
            label="Default Chat Mode"
            description="Set your preferred chat response style"
          >
            <FormControl fullWidth size="small">
              <Select
                value={chatMode}
                onChange={handleChatModeChange}
                sx={{
                  '& .MuiSelect-select': {
                    py: 1.25,
                  },
                }}
              >
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="concise">Concise</MenuItem>
              </Select>
            </FormControl>
          </SettingItem>
        </SettingSection>

        {/* Cookie Settings Section */}
        <SettingSection icon={Cookie} title="Cookie Preferences">
          <SettingItem
            label="Necessary Cookies"
            description="Required for the application to function properly"
            infoTooltip={
              <Box>
                These cookies and local storage are essential for the application to function correctly. We use them to keep you securely logged in, remember your chat conversations, save your preferences (such as theme and chat settings), and maintain your current session. These cannot be disabled as they are required for core functionality. All data is stored securely and is only used to provide you with a seamless, personalized experience. For more detailed information, please read our{' '}
                <Link
                  href="https://www.claribi.ai/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    color: muiTheme.palette.mode === 'dark' 
                      ? muiTheme.palette.primary.dark 
                      : muiTheme.palette.primary.light,
                    textDecoration: 'underline',
                    fontWeight: 500,
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link
                  href="https://www.claribi.ai/terms-and-conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    color: muiTheme.palette.mode === 'dark' 
                      ? muiTheme.palette.primary.dark 
                      : muiTheme.palette.primary.light,
                    textDecoration: 'underline',
                    fontWeight: 500,
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                  Terms of Service
                </Link>
                .
              </Box>
            }
          >
            <FormControlLabel
              control={
                <Switch
                  checked={cookiePrefs.necessary}
                  disabled
                  color="primary"
                />
              }
              label={cookiePrefs.necessary ? 'Enabled' : 'Disabled'}
              sx={{ m: 0 }}
            />
          </SettingItem>
        </SettingSection>

        {/* Data Management Section */}
        <SettingSection icon={Trash} title="Data Management" iconColor={muiTheme.palette.error.main}>
          <SettingItem
            label="Delete All Data"
            description="Request to remove all your data from this application"
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash size={18} color={muiTheme.palette.error.main} />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Delete All Data
            </Button>
          </SettingItem>
        </SettingSection>

        {/* Legal Links Section */}
        <SettingSection icon={FileText} title="Legal">
          <SettingItem label="Privacy Policy" description="Read our privacy policy">
            <Link
              href="https://www.claribi.ai/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: muiTheme.palette.primary.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Shield size={16} />
              View Privacy Policy
            </Link>
          </SettingItem>

          <SettingItem label="Terms of Service" description="Read our terms of service">
            <Link
              href="https://www.claribi.ai/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: muiTheme.palette.primary.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <FileText size={16} />
              View Terms of Service
            </Link>
          </SettingItem>

          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}` }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                textAlign: 'left',
              }}
            >
              By using our services, you accept our{' '}
              <Link
                href="https://www.claribi.ai/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: muiTheme.palette.primary.main,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link
                href="https://www.claribi.ai/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: muiTheme.palette.primary.main,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Privacy Policy
              </Link>
              .
          </Typography>
        </Box>
        </SettingSection>
      </Paper>

      {/* Delete All Data Info Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAllData}
        title="Delete All Data"
        message="To delete all your data, please contact support@claribi.ai. Our support team will assist you with your data deletion request."
        confirmText="Got it"
        cancelText="Close"
        type="warning"
        isLoading={false}
      />
    </Container>
  );
};

export default SettingsPage;