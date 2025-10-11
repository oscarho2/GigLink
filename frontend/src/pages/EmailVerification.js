import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress,
  Paper
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth(); // Get the user and updateUser function from AuthContext
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // If user is already authenticated and verified, show success immediately
      if (user && user.isEmailVerified) {
        setStatus('success');
        setMessage('Your email has already been verified successfully!');
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await axios.get(`/api/auth/verify-email/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Your email has been successfully verified!');
          
          // Update user's verification status in the auth context
          if (response.data.user && updateUser) {
            updateUser({ isEmailVerified: true });
          }
        } else {
          // Check if it's an expired token
          if (response.data.expired) {
            // Redirect to expired verification page
            navigate('/expired-verification');
            return;
          }
          
          // Check if user is already verified
          if (response.data.alreadyVerified) {
            setStatus('success');
            setMessage(response.data.message || 'Your email has already been verified successfully!');
            // Update user's verification status in the auth context
            if (updateUser) {
              updateUser({ isEmailVerified: true });
            }
            return;
          }
          
          setStatus('error');
          setMessage(response.data.message || 'Email verification failed.');
        }
      } catch (error) {
        setStatus('error');
        if (error.response?.data?.message) {
          setMessage(error.response.data.message);
        } else {
          setMessage('An error occurred during email verification. Please try again.');
        }
      }
    };

    verifyEmail();
  }, [token, user, updateUser]);



  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            textAlign: 'center'
          }}
        >
          {status === 'verifying' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Verifying Your Email
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please wait while we verify your email address...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon 
                sx={{ 
                  fontSize: 60, 
                  color: 'success.main', 
                  mb: 3 
                }} 
              />
              <Typography variant="h5" component="h1" gutterBottom color="success.main">
                Email Verified Successfully!
              </Typography>
              <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your account is now active. You can sign in and start connecting with musicians!
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Sign In Now
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon 
                sx={{ 
                  fontSize: 60, 
                  color: 'error.main', 
                  mb: 3 
                }} 
              />
              <Typography variant="h5" component="h1" gutterBottom color="error.main">
                Invalid verification token
              </Typography>
              <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                The verification link may have expired or already been used.
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerification;