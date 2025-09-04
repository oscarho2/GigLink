import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, user, token } = useAuth();

  console.log('PrivateRoute - isAuthenticated:', isAuthenticated, 'loading:', loading, 'user:', user, 'token:', token ? 'exists' : 'null');
  
  if (loading) {
    console.log('PrivateRoute - Still loading authentication...');
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    console.log('PrivateRoute - User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  console.log('PrivateRoute - User authenticated, rendering protected component');
  return children;
};

export default PrivateRoute;