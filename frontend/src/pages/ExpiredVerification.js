import React from 'react';
import { Container, Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useAuth } from '../context/AuthContext';

const ExpiredVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
            alignItems: 'flex-start',
            width: '100%'
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom color="warning.main" sx={{ textAlign: 'center', width: '100%' }}>
            Verification Link Expired
          </Typography>
          <Alert severity="warning" sx={{ width: '100%', mb: 3, textAlign: 'center' }}>
            The email verification link you clicked has expired. Verification links are only valid for 24 hours for security purposes.
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', width: '100%' }}>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="large"
            >
              Go to Home
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="large"
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ExpiredVerification;