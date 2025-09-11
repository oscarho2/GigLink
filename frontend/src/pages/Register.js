import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import AuthContext from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
  });
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const { register, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const { name, email, password, password2 } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }
    
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      setError('Name can only contain letters and spaces');
      return;
    }
    
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
      return;
    }
    
    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }

    const result = await register({ name, email, password });
     if (result && result.success) {
       navigate('/profile-setup');
     } else if (result.error) {
       setError(result.error[0].msg);
     }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          marginTop: { xs: 4, sm: 8 },
          marginBottom: { xs: 6, sm: 8 },
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
          Sign up
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: { xs: 2, sm: 3 }, width: '100%' }}>
          <Grid container spacing={{ xs: 2, sm: 2 }}>
            <Grid item xs={12}>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                label="Full Name"
                autoFocus
                value={name}
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password2"
                label="Confirm Password"
                type={showPassword2 ? 'text' : 'password'}
                id="password2"
                value={password2}
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
                        onClick={() => setShowPassword2(!showPassword2)}
                        edge="end"
                        sx={{
                          p: { xs: 1.5, sm: 1 },
                          '& .MuiSvgIcon-root': {
                            fontSize: { xs: '1.25rem', sm: '1.25rem' }
                          }
                        }}
                      >
                        {showPassword2 ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
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
            Sign Up
          </Button>
          <Grid container justifyContent="center">
            <Grid item>
              <Link 
                component={RouterLink} 
                to="/login" 
                variant="body2"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  display: 'block',
                  textAlign: 'center',
                  py: { xs: 1, sm: 0 },
                  minHeight: { xs: 44, sm: 'auto' },
                  lineHeight: { xs: '44px', sm: 'normal' }
                }}
              >
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default Register;