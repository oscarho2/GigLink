import React, { useContext, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AuthContext from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [anchorElNav, setAnchorElNav] = useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleMenuItemClick = () => {
    setAnchorElNav(null);
  };

  const guestLinks = (
    <>
      <Button
        component={RouterLink}
        to="/login"
        sx={{ 
          my: 2, 
          color: 'white', 
          display: 'block', 
          mx: 1,
          bgcolor: '#1a365d',
          '&:hover': {
            bgcolor: '#2c5282'
          }
        }}
      >
        Login
      </Button>
    </>
  );

  const authLinks = (
    <>
      <Button
        component={RouterLink}
        to="/dashboard"
        sx={{ 
          my: 2, 
          color: 'white', 
          display: 'block', 
          mx: 1,
          bgcolor: '#1a365d',
          '&:hover': {
            bgcolor: '#2c5282'
          }
        }}
      >
        Dashboard
      </Button>
      <Button
        component={RouterLink}
        to="/messages"
        sx={{ 
          my: 2, 
          color: 'white', 
          display: 'block', 
          mx: 1,
          bgcolor: '#1a365d',
          '&:hover': {
            bgcolor: '#2c5282'
          }
        }}
      >
        Messages
      </Button>
      <Button
        onClick={logout}
        sx={{ 
          my: 2,
          color: 'white',
          display: 'block',
          ml: 1,
          bgcolor: '#1a365d',
          '&:hover': {
            bgcolor: '#2c5282'
          }
        }}
      >
        Logout
      </Button>

    </>
  );

  return (
    <AppBar position="static" sx={{ bgcolor: '#1a365d', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <MusicNoteIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            GigLink
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
              sx={{
                p: { xs: 2, sm: 1.5 },
                minWidth: 48,
                minHeight: 48,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                },
                '&:active': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)'
                }
              }}
            >
              <MenuIcon sx={{ fontSize: { xs: 32, sm: 28 } }} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiPaper-root': {
                  minWidth: { xs: 250, sm: 220 },
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  bgcolor: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)'
                },
                '& .MuiMenuItem-root': {
                  minHeight: { xs: 56, sm: 48 },
                  px: { xs: 4, sm: 3 },
                  py: { xs: 2, sm: 1.5 },
                  fontSize: { xs: '1.1rem', sm: '1rem' },
                  fontWeight: 500,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    bgcolor: 'rgba(26, 54, 93, 0.08)',
                    transform: 'translateX(4px)',
                    transition: 'all 0.2s ease'
                  },
                  '&:active': {
                    bgcolor: 'rgba(26, 54, 93, 0.12)'
                  }
                }
              }}
            >
              <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/gigs">
                <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>🎵 Gigs</Typography>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/discover">
                <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>🔍 Discover</Typography>
              </MenuItem>
              {isAuthenticated && (
                <>
                  <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', my: 1, mx: 2 }} />
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/dashboard">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>📊 Dashboard</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/messages">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>💬 Messages</Typography>
                  </MenuItem>
                  <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', my: 1, mx: 2 }} />
                  <MenuItem onClick={() => { handleMenuItemClick(); logout(); }}>
                    <Typography textAlign="left" sx={{ width: '100%', color: '#dc2626', fontWeight: 600 }}>🚪 Logout</Typography>
                  </MenuItem>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', my: 1, mx: 2 }} />
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/login">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d', fontWeight: 600 }}>🔐 Login</Typography>
                  </MenuItem>
                </>
              )}
            </Menu>
          </Box>
          
          <MusicNoteIcon sx={{ 
            display: { xs: 'flex', md: 'none' }, 
            mr: { xs: 1.5, sm: 1 }, 
            fontSize: { xs: 28, sm: 24 },
            color: 'white'
          }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: { xs: '.15rem', sm: '.2rem' },
              color: 'inherit',
              textDecoration: 'none',
              fontSize: { xs: '1.2rem', sm: '1.25rem' },
              py: { xs: 1, sm: 0.5 },
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.9)'
              },
              '&:active': {
                color: 'rgba(255, 255, 255, 0.8)'
              }
            }}
          >
            GigLink
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />

          {/* Navigation Links - Right Side */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            <Button
              component={RouterLink}
              to="/gigs"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'block', 
                mr: 1,
                bgcolor: '#1a365d',
                '&:hover': {
                  bgcolor: '#2c5282'
                }
              }}
            >
              Gigs
            </Button>
            <Button
              component={RouterLink}
              to="/discover"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'block',
                bgcolor: '#1a365d',
                '&:hover': {
                  bgcolor: '#2c5282'
                }
              }}
            >
              Discover
            </Button>
          </Box>

          <Box sx={{ 
            flexGrow: 0, 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1
          }}>
            {isAuthenticated ? authLinks : guestLinks}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;