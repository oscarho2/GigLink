import React from 'react';
import { Container, Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useAuth } from '../context/AuthContext';

const ExpiredVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleResendVerification = () => {
    // Redirect to profile page where they can resend the email
    navigate('/profile');
  };

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
          <ErrorOutlineIcon 
            sx={{ 
              fontSize: 60, 
              color: 'warning.main', 
              mb: 3 
            }} 
          />
          <Typography variant="h5" component="h1" gutterBottom color="warning.main">
            Verification Link Expired
          </Typography>
          <Alert severity="warning" sx={{ width: '100%', mb: 3 }}>
            The email verification link you clicked has expired. Verification links are only valid for 24 hours for security purposes.
          </Alert>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {user 
              ? "You can request a new verification email from your profile page." 
              : "Please log in to access your profile and request a new verification email."}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="large"
            >
              Go to Home
            </Button>
            {user ? (
              <Button
                variant="contained"
                size="large"
                onClick={handleResendVerification}
              >
                Request New Link
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
              >
                Sign In
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ExpiredVerification;