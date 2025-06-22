import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Component for conditionally rendering UI elements based on user roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.dataAnalystComponent - Component shown only to data analysts
 * @param {React.ReactNode} props.userComponent - Component shown only to users
 * @param {React.ReactNode} props.fallback - Component shown if neither role matches (optional)
 * @param {Array<string>} props.allowedRoles - List of roles allowed to see the component
 * @param {React.ReactNode} props.children - Content shown to all allowed roles
 * @returns {React.ReactNode} - The appropriate component based on role
 */
const RoleBasedComponent = ({ 
  dataAnalystComponent, 
  userComponent, 
  fallback = null, 
  allowedRoles = null,
  children = null
}) => {
  const { currentUser, ROLES } = useAuth();
  
  // If specific roles are provided, check if current user's role is included
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return fallback;
  }
  
  // Render specific component based on role
  if (currentUser.role === ROLES.DATA_ANALYST && dataAnalystComponent) {
    return dataAnalystComponent;
  }
  
  if (currentUser.role === ROLES.USER && userComponent) {
    return userComponent;
  }
  
  // Render children if they exist and no specific component is provided for the role
  return children || fallback;
};

export default RoleBasedComponent; 