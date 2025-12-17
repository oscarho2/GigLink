import React, { useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, TextField, Typography } from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const STORAGE_KEY = 'googleLinkContext';

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const readStoredContext = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.linkToken) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredContext = (ctx) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
};

const clearStoredContext = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export default function GoogleLinkAccount() {
  const { loginWithToken } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const initialContext = useMemo(() => {
    const stateContext = location.state && typeof location.state === 'object' ? location.state : null;
    const stored = readStoredContext();
    const ctx = stateContext?.linkToken ? stateContext : stored;
    if (ctx?.linkToken) {
      writeStoredContext({ linkToken: ctx.linkToken, email: ctx.email || '', returnPath: ctx.returnPath || '' });
    }
    return ctx || null;
  }, [location.state]);

  const linkToken = initialContext?.linkToken || '';
  const googleEmail = initialContext?.email || '';

  const [email, setEmail] = useState(googleEmail);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!linkToken) {
      setErrorMessage('Missing Google link request. Please try signing in with Google again.');
      return;
    }

    const normalizedEmailValue = normalizeEmail(email);
    const normalizedConfirm = normalizeEmail(confirmEmail);

    if (!normalizedEmailValue) {
      setErrorMessage('Please enter your email.');
      return;
    }

    if (normalizedEmailValue !== normalizedConfirm) {
      setErrorMessage('Email addresses do not match.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/auth/google/confirm-link', {
        linkToken,
        email: normalizedEmailValue,
        password
      });

      const token = response.data?.token;
      const user = response.data?.user;
      if (!token) {
        throw new Error('Failed to establish session.');
      }

      const ok = loginWithToken(token, user);
      if (!ok) {
        throw new Error('Failed to establish session.');
      }

      clearStoredContext();

      const destination = user?.profileComplete ? '/dashboard' : '/profile-setup';
      navigate(destination, { replace: true });
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      setErrorMessage(serverMessage || error?.message || 'Failed to link Google sign-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Link Sign in with Google
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        An account already exists for this email. Confirm your email and password to link Sign in with Google to your existing account.
      </Typography>

      {!linkToken && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Missing Google link request. Please go back and try signing in with Google again.
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          autoComplete="email"
          disabled={submitting}
        />
        <TextField
          label="Confirm email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          fullWidth
          autoComplete="email"
          disabled={submitting}
          helperText={googleEmail ? `Google returned: ${googleEmail}` : undefined}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          autoComplete="current-password"
          disabled={submitting}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              clearStoredContext();
              navigate('/login');
            }}
            disabled={submitting}
          >
            Back to login
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || !linkToken}>
            {submitting ? 'Linking…' : 'Link and continue'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

