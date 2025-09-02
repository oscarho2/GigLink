import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false); // Set to false for prototype

  // For prototype, we'll skip the actual API calls
  useEffect(() => {
    // Simulate loading user data
    setLoading(false);
  }, []);

  // Set auth token in headers
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
      localStorage.removeItem('token');
    }
  };

  // Register user - Mock implementation for prototype
  const register = async (formData) => {
    try {
      // Mock successful registration
      const mockToken = 'mock-jwt-token';
      setToken(mockToken);
      setIsAuthenticated(true);
      setUser({
        id: '1',
        name: formData.name,
        email: formData.email,
        avatar: '',
      });
      localStorage.setItem('token', mockToken);
      return true;
    } catch (err) {
      return { error: err.response.data.errors };
    }
  };

  // Login user - Mock implementation for prototype
  const login = async (formData, redirectPath = null) => {
    try {
      // Mock successful login
      const mockToken = 'mock-jwt-token';
      setToken(mockToken);
      setIsAuthenticated(true);
      setUser({
        id: '1',
        name: 'Demo User',
        email: formData.email,
        avatar: '',
      });
      localStorage.setItem('token', mockToken);
      if (redirectPath) {
        localStorage.setItem('redirectPath', redirectPath);
      }
      return true;
    } catch (err) {
      return { error: err.response.data.errors };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('redirectPath'); // Clear any stored redirect path
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/'; // Redirect to home page
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        user,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;