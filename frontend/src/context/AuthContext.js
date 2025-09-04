import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { isValidJWT, clearInvalidToken } from '../utils/tokenValidator';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Set to true initially
  const [hasLoggedOut, setHasLoggedOut] = useState(false); // Track manual logout

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const hasManuallyLoggedOut = localStorage.getItem('hasLoggedOut') === 'true';
      
      if (storedToken && !hasManuallyLoggedOut) {
        // First validate the token format
        if (!isValidJWT(storedToken)) {
          console.log('Invalid JWT format detected, clearing token');
          clearInvalidToken();
          setLoading(false);
          return;
        }
        
        try {
          // Set auth token in axios headers
          axios.defaults.headers.common['x-auth-token'] = storedToken;
          
          // Verify token with backend
          const res = await axios.get('/api/auth');
          
          setToken(storedToken);
          setIsAuthenticated(true);
          // Normalize user object to match login response format
          setUser({
            id: res.data._id,
            name: res.data.name,
            email: res.data.email,
            avatar: res.data.avatar
          });
        } catch (err) {
          console.error('Token verification failed:', err);
          // Remove invalid token using utility
          clearInvalidToken();
        }
      }
      setLoading(false);
    };
    
    initializeAuth();
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

  // Register user
  const register = async (formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const body = JSON.stringify(formData);
      const res = await axios.post('/api/users', body, config);
      
      localStorage.removeItem('hasLoggedOut'); // Clear logout flag on registration
      setHasLoggedOut(false);
      setToken(res.data.token);
      setIsAuthenticated(true);
      setUser(res.data.user);
      setAuthToken(res.data.token);
      
      // Return success to allow component to handle redirect
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      return { error: err.response?.data?.errors || [{ msg: 'Registration failed' }] };
    }
  };

  // Login user
  const login = async (formData, redirectPath = null) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const body = JSON.stringify(formData);
      const res = await axios.post('/api/auth', body, config);
      
      localStorage.removeItem('hasLoggedOut'); // Clear logout flag on manual login
      setHasLoggedOut(false);
      setToken(res.data.token);
      setIsAuthenticated(true);
      setUser(res.data.user);
      setAuthToken(res.data.token);
      if (redirectPath) {
        localStorage.setItem('redirectPath', redirectPath);
      }
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return { 
        error: err.response?.data?.errors || [{ msg: 'Login failed' }],
        type: err.response?.data?.type
      };
    }
  };

  // Logout user
  const logout = () => {
    setAuthToken(null); // This will remove token from localStorage and axios headers
    localStorage.removeItem('redirectPath'); // Clear any stored redirect path
    localStorage.setItem('hasLoggedOut', 'true'); // Mark that user has manually logged out
    setHasLoggedOut(true);
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