import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, user, token } = useAuth();

  console.log('PrivateRoute - isAuthenticated:', isAuthenticated, 'loading:', loading, 'user:', user, 'token:', token ? 'exists' : 'null');
  
  if (loading) {
    console.log('PrivateRoute - Still loading authentication...');
    return <LoadingSpinner text="Loading your account..." fullScreen />;
  }
  
  if (!isAuthenticated) {
    console.log('PrivateRoute - User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  console.log('PrivateRoute - User authenticated, rendering protected component');
  return children;
};

export default PrivateRoute;
