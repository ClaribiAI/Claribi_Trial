import React, { createContext, useContext, useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { CheckCircle, WarningCircle, XCircle, Info } from '@phosphor-icons/react';
import { setNotificationHandler } from './notificationBus';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const hideNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Register global handler so non-React modules can trigger notifications
  useEffect(() => {
    setNotificationHandler((message, severity = 'info') => {
      showNotification(message, severity);
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={hideNotification} 
          severity={notification.severity} 
          icon={
            notification.severity === 'success' ? <CheckCircle size={20} /> :
            notification.severity === 'warning' ? <WarningCircle size={20} /> :
            notification.severity === 'error' ? <XCircle size={20} /> :
            <Info size={20} />
          }
          sx={{ width: '100%', boxShadow: 3, fontFamily: "'Nunito Sans', sans-serif" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext; 