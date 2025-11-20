import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import AppleIcon from '@mui/icons-material/Apple';
import AuthContext from '../context/AuthContext';
import googleAuthService from '../utils/googleAuth';
import appleAuthService from '../utils/appleAuth';
import { Turnstile } from '@marsidev/react-turnstile';
import { isTurnstileDisabled, TURNSTILE_DEV_BYPASS_TOKEN } from '../utils/turnstileFlags';
import useViewportHeight from '../hooks/useViewportHeight';

const TURNSTILE_DISABLED = isTurnstileDisabled();

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(TURNSTILE_DISABLED ? TURNSTILE_DEV_BYPASS_TOKEN : '');
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const { login, loginWithToken, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const viewportHeight = useViewportHeight();
  const compactViewport = viewportHeight !== null && viewportHeight < 600;
  const mobileMinHeight = viewportHeight
    ? `${Math.max(viewportHeight - 120, 320)}px`
    : 'calc(100vh - 120px)';

  const handleGoogleSignIn = async () => {
    let shouldResetLoading = true;
    try {
      setIsGoogleLoading(true);
      setError(null);

      const result = await googleAuthService.signInWithGoogle();

      if (result?.redirecting) {
        shouldResetLoading = false;
        return;
      }

      if (result.success && result.token) {
        const ok = loginWithToken(result.token, result.user);
        if (!ok) {
          setError('Failed to establish session from Google token');
          return;
        }
        if (result.user.profileComplete) {
          navigate('/dashboard');
        } else {
          navigate('/profile-setup');
        }
      } else {
        setError(result.error || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('An error occurred during Google sign-in');
    } finally {
      if (shouldResetLoading) {
        setIsGoogleLoading(false);
      }
    }
  };

  const handleAppleSignIn = async () => {
    let shouldResetLoading = true;
    try {
      setIsAppleLoading(true);
      setError(null);

      const result = await appleAuthService.signInWithApple();
      if (result.redirecting) {
        shouldResetLoading = false;
        return;
      }

      if (result.cancelled) {
        return;
      }

      if (result.success && result.token) {
        const ok = loginWithToken(result.token, result.user);
        if (!ok) {
          setError('Failed to establish session from Apple token');
          return;
        }
        if (result.user.profileComplete) {
          navigate('/dashboard');
        } else {
          navigate('/profile-setup');
        }
      } else {
        setError(result.error || 'Apple sign-in failed');
      }
    } catch (error) {
      console.error('Apple sign-in error:', error);
      setError(error.message || 'An error occurred during Apple sign-in');
    } finally {
      if (shouldResetLoading) {
        setIsAppleLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = localStorage.getItem('redirectPath');
      if (redirectPath) {
        localStorage.removeItem('redirectPath');
        navigate(redirectPath);
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Check if Turnstile token exists
    if (!TURNSTILE_DISABLED && !turnstileToken) {
      setError({
        message: 'Please complete the security verification',
        type: 'captcha'
      });
      return;
    }
    
    setError(null);

    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    // Include turnstile token in login credentials
    const credentials = {
      email,
      password,
      'cf-turnstile-response': TURNSTILE_DISABLED ? TURNSTILE_DEV_BYPASS_TOKEN : turnstileToken 
    };
    const result = await login(credentials, redirect);
    console.log('Login result:', result); // Debugging login

    if (result && result.error) {
      let errorMessage = 'Login failed';
      if (Array.isArray(result.error) && result.error.length > 0 && result.error[0].msg) {
        errorMessage = result.error[0].msg;
      } else if (typeof result.error === 'string') {
        errorMessage = result.error;
      }
      setError({
        message: errorMessage,
        type: result.type || 'general'
      });
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          marginTop: { xs: compactViewport ? 1 : 2, sm: 4 },
          marginBottom: { xs: compactViewport ? 4 : 6, sm: 8 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: { xs: mobileMinHeight, sm: 'auto' },
          justifyContent: { xs: compactViewport ? 'flex-start' : 'center', sm: 'flex-start' }
        }}
      >
        <Avatar sx={{ 
          m: { xs: 1, sm: 1 }, 
          bgcolor: 'secondary.main',
          width: { xs: 48, sm: 40 },
          height: { xs: 48, sm: 40 }
        }}>
          <LockOutlinedIcon sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
        </Avatar>
        <Typography 
          component="h1" 
          variant="h5"
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.5rem' },
            fontWeight: 500,
            mb: { xs: 2, sm: 1 }
          }}
        >
          Sign in
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error.message || error}
            {(error.type === 'unregistered_email' || (typeof error === 'string' && error.includes('not registered'))) && (
              <Box sx={{ mt: 1 }}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Join Now
                </Button>
              </Box>
            )}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: { xs: 2, sm: 1 }, width: '100%' }}>
          <Button
             fullWidth
             variant="outlined"
             onClick={handleGoogleSignIn}
             disabled={isGoogleLoading}
             sx={{ 
               mb: { xs: 1, sm: 1 },
               minHeight: { xs: 48, sm: 42 },
               fontSize: { xs: '1rem', sm: '0.875rem' },
               fontWeight: 600,
               borderRadius: { xs: 2, sm: 1 },
               py: { xs: 1.5, sm: 1 },
               borderColor: '#4285f4',
               color: '#4285f4',
               '&:hover': {
                 borderColor: '#3367d6',
                 backgroundColor: 'rgba(66, 133, 244, 0.04)'
               }
             }}
           >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {'Continue with Google'}
              </Box>
            </Button>

          <Button
             fullWidth
             variant="contained"
             onClick={handleAppleSignIn}
             disabled={isAppleLoading}
             sx={{
               mb: { xs: 1, sm: 1 },
               minHeight: { xs: 48, sm: 42 },
               fontSize: { xs: '1rem', sm: '0.875rem' },
               fontWeight: 600,
               borderRadius: { xs: 2, sm: 1 },
               py: { xs: 1.5, sm: 1 },
               bgcolor: '#000',
               color: '#fff',
               '&:hover': {
                 bgcolor: '#111'
               }
             }}
           >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppleIcon sx={{ fontSize: 22, mr: 1 }} />
                {'Continue with Apple'}
              </Box>
            </Button>

          <Divider sx={{ my: 2 }}>OR</Divider>

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={onChange}
            sx={{
              '& .MuiInputBase-root': {
                minHeight: { xs: 56, sm: 56 },
                fontSize: { xs: '1rem', sm: '1rem' }
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '1rem', sm: '1rem' }
              }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={onChange}
            sx={{
              '& .MuiInputBase-root': {
                minHeight: { xs: 56, sm: 56 },
                fontSize: { xs: '1rem', sm: '1rem' }
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '1rem', sm: '1rem' }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{
                      p: { xs: 1.5, sm: 1 },
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: '1.25rem', sm: '1.25rem' }
                      }
                    }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {/* Cloudflare Turnstile */}
          {!TURNSTILE_DISABLED && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              my: 2,
              '& .cf-turnstile': {
                display: 'flex',
                justifyContent: 'center'
              }
            }}>
              <Turnstile
                siteKey={process.env.REACT_APP_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} // Replace with your actual site key
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
                options={{
                  theme: 'light',
                  size: 'normal'
                }}
              />
            </Box>
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: { xs: 2, sm: 2 }, 
              mb: { xs: 2, sm: 2 },
              minHeight: { xs: 48, sm: 42 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              fontWeight: 600,
              borderRadius: { xs: 2, sm: 1 },
              py: { xs: 1.5, sm: 1 }
            }}
            disabled={!TURNSTILE_DISABLED && !turnstileToken} // Disable submit until turnstile is completed
          >
            Sign In
          </Button>

          <Grid container spacing={{ xs: 2, sm: 0 }} sx={{ mt: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Grid item xs={12} sm>
              <Link 
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  display: 'block',
                  textAlign: { xs: 'center', sm: 'left' },
                  py: { xs: 1, sm: 0 },
                  minHeight: { xs: 44, sm: 'auto' },
                  lineHeight: { xs: '44px', sm: 'normal' }
                }}
              >
                Forgot password?
              </Link>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Link 
                component={RouterLink} 
                to="/register" 
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  display: 'block',
                  textAlign: { xs: 'center', sm: 'right' },
                  py: { xs: 1, sm: 0 },
                  minHeight: { xs: 44, sm: 'auto' },
                  lineHeight: { xs: '44px', sm: 'normal' }
                }}
              >
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
