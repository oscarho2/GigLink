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
import AuthContext from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

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
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    const result = await login({ email, password }, redirect);
    if (result.error) {
      setError({
        message: result.error[0].msg,
        type: result.type || 'general'
      });
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          marginTop: { xs: 4, sm: 8 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: { xs: 'calc(100vh - 120px)', sm: 'auto' },
          justifyContent: { xs: 'center', sm: 'flex-start' }
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
          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
              {error}
            </Alert>
          )}
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: { xs: 3, sm: 3 }, 
              mb: { xs: 3, sm: 2 },
              minHeight: { xs: 48, sm: 42 },
              fontSize: { xs: '1rem', sm: '0.875rem' },
              fontWeight: 600,
              borderRadius: { xs: 2, sm: 1 },
              py: { xs: 1.5, sm: 1 }
            }}
          >
            Sign In
          </Button>
          <Grid container spacing={{ xs: 2, sm: 0 }} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
            <Grid item xs={12} sm>
              <Link 
                href="#" 
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