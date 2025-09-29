import { createContext, useContext, useState, useEffect } from 'react';
import api, { withTurnstile } from '../utils/api';
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
          // Verify token with backend
          const res = await api.get('/auth');
          
          setToken(storedToken);
          setIsAuthenticated(true);
          // Normalize user object to match login response format
          setUser({
            id: res.data._id,
            name: res.data.name,
            email: res.data.email,
            avatar: res.data.avatar,
            isEmailVerified: res.data.isEmailVerified
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

  // Register user
  const register = async (formData) => {
    return withTurnstile(async (turnstileToken) => {
      try {
        const body = { ...formData, turnstileToken };
        const res = await api.post('/users', body);
        // Auto-login after successful registration using returned token
        if (res?.data?.token && res?.data?.user) {
          const { token: newToken, user: newUser } = res.data;
          localStorage.setItem('token', newToken);
          setToken(newToken);
          setIsAuthenticated(true);
          setUser(newUser);
        }
        return {
          success: true,
          message:
            res.data.message ||
            'Registration successful! A verification email may have been sent. You can proceed to complete your profile.'
        };
      } catch (err) {
        console.error('Registration error:', err);
        const captchaRequired = Boolean(err.response?.data?.captcha?.required);
        const captchaType = err.response?.data?.captcha?.type;
        return {
          error: err.response?.data?.errors || [{ msg: 'Registration failed' }],
          captchaRequired,
          captchaType
        };
      }
    });
  };

  // Login user
  const login = async (formData, redirectPath = null) => {
    return withTurnstile(async (turnstileToken) => {
      try {
        const body = { ...formData, turnstileToken };
        const res = await api.post('/auth', body);
        
        localStorage.removeItem('hasLoggedOut'); // Clear logout flag on manual login
        setHasLoggedOut(false);
        setToken(res.data.token);
        setIsAuthenticated(true);
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        if (redirectPath) {
          localStorage.setItem('redirectPath', redirectPath);
        }
        return { success: true };
      } catch (err) {
        console.error('Login error:', err);
        const captchaRequired = err.response?.data?.captchaRequired === true;
        return { 
          error: err.response?.data?.errors || [{ msg: 'Login failed' }],
          type: err.response?.data?.type,
          captchaRequired
        };
      }
    });
  };

  // Login with provider-issued JWT (e.g., Google)
  const loginWithToken = (newToken, newUser = null) => {
    try {
      localStorage.removeItem('hasLoggedOut'); // Clear logout flag on provider login
      setHasLoggedOut(false);
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setIsAuthenticated(true);
      if (newUser) {
        setUser(newUser);
      }
      return true;
    } catch (err) {
      console.error('loginWithToken error:', err);
      return false;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token'); // This will remove token from localStorage and axios headers
    localStorage.removeItem('redirectPath'); // Clear any stored redirect path
    localStorage.setItem('hasLoggedOut', 'true'); // Mark that user has manually logged out
    setHasLoggedOut(true);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/'; // Redirect to home page
  };

  // Update avatar in context so UI updates immediately
  const updateAvatar = (avatarUrl) => {
    setUser(prev => prev ? { ...prev, avatar: avatarUrl } : prev);
  };

  const updateUser = (newUserData) => {
    setUser(prev => prev ? { ...prev, ...newUserData } : prev);
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
        loginWithToken,
        logout,
        updateAvatar,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;