import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Typography } from '@mui/material';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthContext from '../context/AuthContext';
import googleAuthService from '../utils/googleAuth';

const sanitizePath = (path) => {
  if (typeof path !== 'string') {
    return '/login';
  }
  return path.startsWith('/') ? path : '/login';
};

const GoogleCallback = () => {
  const { loginWithToken } = useContext(AuthContext);
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackPath, setFallbackPath] = useState('/login');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const finalizeSignIn = async () => {
      const result = await googleAuthService.handleRedirectCallback(location.hash, location.search);
      if (!isMounted) {
        return;
      }

      if (result?.returnPath) {
        setFallbackPath(sanitizePath(result.returnPath));
      }

      if (result?.type === 'link_required' && result.linkToken) {
        navigate('/google/link-account', {
          replace: true,
          state: {
            linkToken: result.linkToken,
            email: result.email || '',
            returnPath: result.returnPath || ''
          }
        });
        return;
      }

      if (result?.success && result.token) {
        const ok = loginWithToken(result.token, result.user);
        if (!ok) {
          setStatus('error');
          setErrorMessage('Failed to establish session from Google token.');
          return;
        }

        const destination = result.user?.profileComplete ? '/dashboard' : '/profile-setup';
        navigate(destination, { replace: true });
        return;
      }

      setStatus('error');
      setErrorMessage(result?.error || 'Google sign-in failed. Please try again.');
    };

    finalizeSignIn();

    return () => {
      isMounted = false;
    };
  }, [location.hash, location.search, loginWithToken, navigate]);

  if (status === 'processing') {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <LoadingSpinner text="Finishing Google sign-in..." size="large" />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        {errorMessage || 'Google sign-in failed. Please try again.'}
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        We could not complete Sign in with Google inside the app. Please return and try again.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate(fallbackPath || '/login', { replace: true })}
      >
        Go back
      </Button>
    </Container>
  );
};

export default GoogleCallback;
