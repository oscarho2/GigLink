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

  const guestLinks = (
    <>
      <Button
        component={RouterLink}
        to="/login"
        sx={{ my: 2, color: 'white', display: 'block', mx: 1 }}
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
        sx={{ my: 2, color: 'white', display: 'block', mx: 1 }}
      >
        Dashboard
      </Button>
      <Button
        component={RouterLink}
        to="/messages"
        sx={{ my: 2, color: 'white', display: 'block', mx: 1 }}
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
          bgcolor: '#475569',
          '&:hover': {
            bgcolor: '#334155'
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
        <Toolbar disableGutters>
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
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
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
              }}
            >
              <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/gigs">
                <Typography textAlign="center">Gigs</Typography>
              </MenuItem>
              <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/discover">
                <Typography textAlign="center">Discover</Typography>
              </MenuItem>
              {isAuthenticated && (
                <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/messages">
                  <Typography textAlign="center">Messages</Typography>
                </MenuItem>
              )}
            </Menu>
          </Box>
          
          <MusicNoteIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
          <Typography
            variant="h5"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
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
              sx={{ my: 2, color: 'white', display: 'block', mr: 1 }}
            >
              Gigs
            </Button>
            <Button
              component={RouterLink}
              to="/discover"
              sx={{ my: 2, color: 'white', display: 'block' }}
            >
              Discover
            </Button>
          </Box>

          <Box sx={{ flexGrow: 0, display: 'flex' }}>
            {isAuthenticated ? authLinks : guestLinks}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;