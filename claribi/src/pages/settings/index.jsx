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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  ChartBar
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import {
  getChatMode,
  setChatMode,
  getCookiePreferences,
  setCookiePreferences,
  deleteAllData
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
  const [deleting, setDeleting] = useState(false);

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState(null);
  const [tokenUsageLoading, setTokenUsageLoading] = useState(true);

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

  // Load token usage data
  useEffect(() => {
    const loadTokenUsage = async () => {
      setTokenUsageLoading(true);
      try {
        const response = await statsService.getUserTokenUsage();
        if (response.success && response.data) {
          setTokenUsage(response.data);
        }
      } catch (error) {
        console.error('Error loading token usage:', error);
        showNotification('Failed to load token usage', 'error');
      } finally {
        setTokenUsageLoading(false);
      }
    };

    loadTokenUsage();
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

  // Handle cookie preference change
  const handleCookiePreferenceChange = (preference) => {
    const newPrefs = {
      ...cookiePrefs,
      [preference]: !cookiePrefs[preference],
    };
    setCookiePrefs(newPrefs);
    setCookiePreferences(newPrefs);
    showNotification('Cookie preferences updated', 'success');
  };

  // Handle delete all data
  const handleDeleteAllData = async () => {
    setDeleting(true);
    try {
      const success = deleteAllData(false);
      if (success) {
        showNotification('All data deleted successfully', 'success');
        // Logout and redirect to login
        setTimeout(() => {
          logout();
        }, 1000);
      } else {
        showNotification('Failed to delete all data', 'error');
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      showNotification('Failed to delete all data', 'error');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const SettingSection = ({ icon: Icon, title, children }) => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Icon size={20} color={muiTheme.palette.primary.main} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      {children}
      <Divider sx={{ my: 3 }} />
    </Box>
  );

  const SettingItem = ({ label, description, children }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
            {label}
          </Typography>
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
              Token usage breakdown across all features
            </Typography>
            {tokenUsageLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading...
                </Typography>
              </Box>
            ) : tokenUsage ? (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: alpha(muiTheme.palette.primary.main, 0.05),
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>Feature</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Input</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Output</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Overhead</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Chat</TableCell>
                      <TableCell align="right">{formatNumber(tokenUsage.chat_input_tokens || 0)}</TableCell>
                      <TableCell align="right">{formatNumber(tokenUsage.chat_output_tokens || 0)}</TableCell>
                      <TableCell align="right">{formatNumber(tokenUsage.chat_overhead_tokens || 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatNumber(tokenUsage.chat_tokens || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Docs</TableCell>
                      <TableCell align="right">{formatNumber(tokenUsage.docs_input_tokens || 0)}</TableCell>
                      <TableCell align="right">{formatNumber(tokenUsage.docs_output_tokens || 0)}</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatNumber(tokenUsage.docs_tokens || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow
                      sx={{
                        bgcolor: alpha(muiTheme.palette.primary.main, 0.05),
                        '& .MuiTableCell-root': {
                          fontWeight: 600,
                          borderTop: `2px solid ${alpha(muiTheme.palette.primary.main, 0.2)}`,
                        },
                      }}
                    >
                      <TableCell>Total</TableCell>
                      <TableCell align="right">
                        {formatNumber((tokenUsage.chat_input_tokens || 0) + (tokenUsage.docs_input_tokens || 0))}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber((tokenUsage.chat_output_tokens || 0) + (tokenUsage.docs_output_tokens || 0))}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(tokenUsage.chat_overhead_tokens || 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: muiTheme.palette.primary.main }}>
                        {formatNumber(tokenUsage.total_tokens || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No token usage data available
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

          <SettingItem
            label="Analytics Cookies"
            description="Help us improve the application by collecting usage data"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={cookiePrefs.analytics}
                  onChange={() => handleCookiePreferenceChange('analytics')}
                  color="primary"
                />
              }
              label={cookiePrefs.analytics ? 'Enabled' : 'Disabled'}
              sx={{ m: 0 }}
            />
          </SettingItem>

          <SettingItem
            label="Marketing Cookies"
            description="Used for personalized advertising"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={cookiePrefs.marketing}
                  onChange={() => handleCookiePreferenceChange('marketing')}
                  color="primary"
                />
              }
              label={cookiePrefs.marketing ? 'Enabled' : 'Disabled'}
              sx={{ m: 0 }}
            />
          </SettingItem>
        </SettingSection>

        {/* Data Management Section */}
        <SettingSection icon={Trash} title="Data Management">
          <Alert severity="warning" sx={{ mb: 2 }}>
            Deleting all data will remove all your preferences, settings, and stored information. You will be logged out after deletion.
          </Alert>
          <SettingItem
            label="Delete All Data"
            description="Remove all your data from this application"
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash size={18} />}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAllData}
        title="Delete All Data"
        message="Are you sure you want to delete all your data? This action cannot be undone. You will be logged out after deletion."
        confirmText="Delete All Data"
        cancelText="Cancel"
        type="danger"
        isLoading={deleting}
      />
    </Container>
  );
};

export default SettingsPage;