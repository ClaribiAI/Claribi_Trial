import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from '../../pages/login';

const LoginWrapper = () => {
  const { currentUser, loading } = useAuth();

  // Immediate redirect check - don't wait for useEffect
  if (currentUser && !loading) {
    console.log('User is authenticated, redirecting to home immediately...');
    // Use replace to avoid adding to browser history
    window.location.replace('/');
    return null;
  }

  // If still loading, show nothing
  if (loading) {
    return null;
  }

  // Only render LoginPage if user is not authenticated
  return <LoginPage />;
};

export default LoginWrapper;
