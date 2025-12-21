import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthContext from '../context/AuthContext';
import appleAuthService from '../utils/appleAuth';

const sanitizePath = (path, fallback = '/login') => {
  if (typeof path !== 'string') {
    return fallback;
  }
  return path.startsWith('/') ? path : fallback;
};

const AppleCallback = () => {
  const { loginWithToken } = useContext(AuthContext);
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackPath, setFallbackPath] = useState('/login');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    const redirectTo = (path) => {
      navigate(path, { replace: true });
      fallbackTimer = window.setTimeout(() => {
        if (window.location.pathname.endsWith('/apple/callback')) {
          window.location.replace(path);
        }
      }, 600);
    };

    const finalizeSignIn = async () => {
      const result = await appleAuthService.handleRedirectCallback(location.search);
      if (!isMounted) {
        return;
      }

      if (result?.returnPath) {
        setFallbackPath(sanitizePath(result.returnPath));
      }

      if (result?.type === 'link_required' && result.linkToken) {
        navigate('/apple/link-account', {
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
          setErrorMessage('Failed to establish session from Apple token.');
          return;
        }

        const destination = result.user?.profileComplete ? '/dashboard' : '/profile-setup';
        redirectTo(destination);
        return;
      }

      if (result?.cancelled) {
        setStatus('error');
        setErrorMessage('Apple sign-in was cancelled. Please try again.');
        return;
      }

      setStatus('error');
      setErrorMessage(result?.error || 'Apple sign-in failed. Please try again.');
    };

    finalizeSignIn();

    return () => {
      isMounted = false;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, [location.search, loginWithToken, navigate]);

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
        <LoadingSpinner text="Finishing Apple sign-in..." size="large" />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        {errorMessage || 'Apple sign-in failed. Please try again.'}
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        We could not complete Sign in with Apple inside the app. Please return and try again.
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

export default AppleCallback;
