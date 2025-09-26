import React, { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Alert,
  Paper,
  IconButton,
  InputAdornment
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';

const ResetPassword = () => {
  const location = useLocation();
  const params = useParams();
  const query = new URLSearchParams(location.search);
  const tokenFromQuery = query.get('token');
  const tokenFromPath = params.token;
  const token = tokenFromQuery || tokenFromPath || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const meetsPolicy = useMemo(() => {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    return password.length >= 8 && re.test(password);
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing or invalid. Please use the link from your email.');
      return;
    }
    if (!meetsPolicy) {
      setError('Password does not meet the required complexity.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/reset-password', { token, password });
      setMessage(response.data.message || 'Password reset successfully. You can now sign in.');
      setIsSubmitted(true);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors[0]?.msg || 'Invalid input.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
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
            width: '100%'
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockResetIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            Set a New Password
          </Typography>

          {!token && (
            <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
              Reset token is missing. Please open this page from the link in your email.
            </Alert>
          )}

          {!isSubmitted ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'left', width: '100%' }}>
                Your password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="New Password"
                  type={showPw ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw(p => !p)} edge="end" aria-label="toggle password visibility">
                          {showPw ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showPw2 ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw2(p => !p)} edge="end" aria-label="toggle password visibility">
                          {showPw2 ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading || !token}
                >
                  {isLoading ? 'Resetting…' : 'Reset Password'}
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                {message}
              </Alert>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Link component={RouterLink} to="/login" variant="body2" sx={{ display: 'block', textAlign: 'center' }}>
                    Go to Sign In
                  </Link>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Link component={RouterLink} to="/" variant="body2" sx={{ display: 'block', textAlign: 'center' }}>
                    Back to Home
                  </Link>
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;

