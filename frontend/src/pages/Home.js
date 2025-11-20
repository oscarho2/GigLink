import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import AppleIcon from '@mui/icons-material/Apple';
import LoadingSpinner from '../components/LoadingSpinner';
import googleAuthService from '../utils/googleAuth';
import appleAuthService from '../utils/appleAuth';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const { loginWithToken, isAuthenticated, loading } = useAuth();

  // Redirect to community page if user is already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Use replace instead of navigate to avoid adding to history
      navigate('/community', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <LoadingSpinner 
        type="spinner" 
        size="large" 
        text="Loading..." 
        fullScreen={false}
      />
    );
  }

  // Don't render anything if user is authenticated (redirect is happening)
  if (isAuthenticated) {
    return null;
  }

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    let shouldResetLoading = true;
    try {
      setIsLoading(true);
      setError('');
      setShowError(false); // Clear any previous error display
      
      const result = await googleAuthService.signInWithGoogle();

      if (result?.redirecting) {
        shouldResetLoading = false;
        return;
      }
      
      if (result.success && result.token) {
        const loginOk = loginWithToken(result.token, result.user);

        if (loginOk) {
          if (result.user?.profileComplete) {
            navigate('/dashboard');
          } else {
            navigate('/profile-setup');
          }
        } else {
          throw new Error('Failed to establish session from Google token');
        }
      } else {
        throw new Error(result.error || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
      setShowError(true);
    } finally {
      if (shouldResetLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleAppleSignIn = async () => {
    let shouldResetLoading = true;
    try {
      setIsLoading(true);
      setError('');
      setShowError(false);

      const result = await appleAuthService.signInWithApple();
      if (result.redirecting) {
        shouldResetLoading = false;
        return;
      }

      if (result.cancelled) {
        return;
      }

      if (result.success && result.token) {
        const loginOk = loginWithToken(result.token, result.user);

        if (loginOk) {
          if (result.user?.profileComplete) {
            navigate('/dashboard');
          } else {
            navigate('/profile-setup');
          }
        } else {
          throw new Error('Failed to establish session from Apple token');
        }
      } else {
        throw new Error(result.error || 'Apple sign-in failed');
      }
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      setError(error.message || 'Failed to sign in with Apple. Please try again.');
      setShowError(true);
    } finally {
      if (shouldResetLoading) {
        setIsLoading(false);
      }
    }
  };

  // Handle error snackbar close
  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            GigLink - Connect with Musicians & Find Gigs
          </Typography>
          <Typography variant="h5" component="p" paragraph>
            GigLink is the professional network for musicians to
            find performance opportunities and connect with other professionals.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mt: 2,
              mb: 2,
              gap: 1
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              sx={{ 
                bgcolor: 'white',
                color: '#757575',
                border: '1px solid #dadce0',
                '&:hover': {
                  bgcolor: isLoading ? 'white' : '#f8f9fa',
                  boxShadow: isLoading ? 'none' : '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)'
                },
                '&:disabled': {
                  bgcolor: 'white',
                  color: '#757575',
                  border: '1px solid #dadce0'
                },
                fontWeight: 500,
                textTransform: 'none',
                px: 3,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                maxWidth: 320
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
              variant="contained"
              size="large"
              onClick={handleAppleSignIn}
              disabled={isLoading}
              sx={{
                bgcolor: '#000',
                color: '#fff',
                border: '1px solid #000',
                '&:hover': {
                  bgcolor: isLoading ? '#000' : '#111',
                  boxShadow: isLoading ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
                },
                '&:disabled': {
                  bgcolor: '#000',
                  color: '#fff',
                  opacity: 0.6
                },
                fontWeight: 500,
                textTransform: 'none',
                px: 3,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                maxWidth: 320
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppleIcon sx={{ fontSize: 22, mr: 1 }} />
                {'Continue with Apple'}
              </Box>
            </Button>
          </Box>
          
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            size="large"
            sx={{ 
              mt: 2,
              mb: 2,
              bgcolor: 'white',
              color: '#757575',
              border: '1px solid #dadce0',
              '&:hover': {
                bgcolor: '#f8f9fa',
                boxShadow: '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)'
              },
              fontWeight: 500,
              textTransform: 'none',
              px: 3,
              width: '200px',
              display: 'block',
              mx: 'auto'
            }}
          >
            Sign in with Email
          </Button>
          <Box sx={{ mt: 4 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} sm={4} display="flex" justifyContent="center">
                <Button
                  component={RouterLink}
                  to="/gigs"
                  variant="outlined"
                  color="inherit"
                  size="large"
                  fullWidth
                >
                  Browse Gigs
                </Button>
              </Grid>
              <Grid item xs={12} sm={4} display="flex" justifyContent="center">
                <Button
                  component={RouterLink}
                  to="/discover"
                  variant="outlined"
                  color="inherit"
                  size="large"
                  fullWidth
                >
                  Discover Musicians
                </Button>
              </Grid>
            </Grid>
            <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
              <Grid item xs={12} sm="auto">
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ 
                    bgcolor: '#e53e3e',
                    '&:hover': {
                      bgcolor: '#c53030'
                    },
                    fontWeight: 'bold'
                  }}
                >
                  Join Now
                </Button>
              </Grid>
            </Grid>
            
            {/* Legal Agreement Text */}
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 3, 
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 1.4
              }}
            >
              By clicking Sign Up Now, you agree to the GigLink{' '}
              <Link 
                href="/terms-of-service" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: 'underline',
                  '&:hover': { textDecoration: 'none' }
                }}
              >
                Terms of Service
              </Link>
              {', '}
              <Link 
                href="/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: 'underline',
                  '&:hover': { textDecoration: 'none' }
                }}
              >
                Privacy Policy
              </Link>
              {', and '}
              <Link 
                href="/cookie-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: 'underline',
                  '&:hover': { textDecoration: 'none' }
                }}
              >
                Cookie Policy
              </Link>
              .
            </Typography>

          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          Features for Musicians
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <MusicNoteIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Professional Profile
                </Typography>
                <Typography>
                  Create a detailed profile showcasing your musical skills and portfolio.
                  Upload videos of your performances to demonstrate your talent.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <WorkIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Gig Opportunities
                </Typography>
                <Typography>
                  Browse and apply for gig opportunities posted by venues, event organizers, and other musicians.
                  Post your own gigs when you need to find substitute musicians.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <GroupIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Musician Network
                </Typography>
                <Typography>
                  Connect with other musicians in your area or with similar interests.
                  Build your professional network and find collaboration opportunities.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to advance your music career?
          </Typography>
          <Typography variant="h6" component="p" paragraph>
            Join GigLink today and connect with the professional music community.
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            size="large"
            sx={{ 
              bgcolor: '#e53e3e',
              '&:hover': {
                bgcolor: '#c53030'
              },
              fontWeight: 'bold'
            }}
          >
            Sign Up Now
          </Button>
          
          {/* Legal Agreement Text */}
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              fontSize: '0.75rem',
              color: 'text.secondary',
              textAlign: 'center',
              lineHeight: 1.4
            }}
          >
            By clicking Sign Up Now, you agree to the GigLink{' '}
            <Link 
              href="/terms-of-service" 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': { textDecoration: 'none' }
              }}
            >
              Terms of Service
            </Link>
            {', '}
            <Link 
              href="/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': { textDecoration: 'none' }
              }}
            >
              Privacy Policy
            </Link>
            {', and '}
            <Link 
              href="/cookie-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': { textDecoration: 'none' }
              }}
            >
              Cookie Policy
            </Link>
            .
          </Typography>
        </Container>
      </Box>

      {/* Error Feedback Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;
