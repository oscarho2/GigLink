import React, { useContext, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import Avatar from '@mui/material/Avatar';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AuthContext from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationBadge from '../NotificationBadge';
import UserAvatar from '../UserAvatar';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const { totalUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElProfile, setAnchorElProfile] = useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleMenuItemClick = () => {
    setAnchorElNav(null);
  };

  const handleOpenProfileMenu = (event) => {
    setAnchorElProfile(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setAnchorElProfile(null);
  };

  const handleLogout = () => {
    logout();
    setAnchorElProfile(null);
  };

  const handleProfileClick = () => {
    setAnchorElProfile(null);
    navigate(`/profile/${user.id || user._id}`);
  };

  const handleSettingsClick = () => {
    setAnchorElProfile(null);
    navigate('/settings');
  };

  const handleNotificationsClick = () => {
    navigate('/notifications');
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
        Sign In
      </Button>
      <Button
        component={RouterLink}
        to="/register"
        sx={{ 
          my: 2, 
          color: 'white', 
          display: 'block', 
          mx: 1,
          bgcolor: '#2c5282',
          '&:hover': {
            bgcolor: '#3182ce'
          }
        }}
      >
        Join Now
      </Button>
    </>
  );

  const authLinks = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
      <Button color="inherit" component={RouterLink} to="/messages">Messages</Button>
    </Box>
  );

  return (
    <>
    <AppBar position="static" sx={{ bgcolor: '#1a365d', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <MusicNoteIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to={isAuthenticated ? "/community" : "/"}
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
              {/* Public Pages */}
              <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/community">
                <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>🌐 Community</Typography>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/gigs">
                <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>🎵 Browse Gigs</Typography>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/discover">
                <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>🔍 Discover Links</Typography>
              </MenuItem>
              
              {/* User-specific sections */}
              {isAuthenticated && (
                <>
                  <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', my: 1, mx: 2 }} />
                  <Typography sx={{ px: 3, py: 1, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>My Account</Typography>
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/dashboard">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>📊 Dashboard</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/messages">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>💬 Messages</Typography>
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
            to={isAuthenticated ? "/community" : "/"}
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
          
          {/* Mobile Guest Buttons */}
          {!isAuthenticated && (
            <Box sx={{ 
              display: { xs: 'flex', md: 'none' },
              gap: 1,
              ml: 'auto'
            }}>
              <Button
                component={RouterLink}
                to="/login"
                size="small"
                sx={{ 
                  color: 'white', 
                  bgcolor: '#1a365d',
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#2c5282'
                  }
                }}
              >
                Sign In
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                size="small"
                sx={{ 
                  color: 'white', 
                  bgcolor: '#2c5282',
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#3182ce'
                  }
                }}
              >
                Join Now
              </Button>
            </Box>
          )}
          
          {isAuthenticated && user && (
            <>
              <NotificationBadge count={totalUnreadCount}>
                <IconButton
                  onClick={handleNotificationsClick}
                  sx={{
                    p: 0.5,
                    ml: 1,
                    display: { xs: 'flex', md: 'none' },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 20, color: 'white' }} />
                </IconButton>
              </NotificationBadge>
              <UserAvatar
                user={user}
                size={32}
                onClick={handleOpenProfileMenu}
                sx={{
                  ml: 0.5,
                  display: { xs: 'flex', md: 'none' },
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              />
            </>
          )}
          
          {/* Center Navigation - Public Pages */}
          <Box sx={{ 
            flexGrow: 1, 
            display: { xs: 'none', md: 'flex' }, 
            justifyContent: 'center',
            gap: 2
          }}>
            <Button
              component={RouterLink}
              to="/community"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'block',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Community
            </Button>
            <Button
              component={RouterLink}
              to="/gigs"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'block',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Browse Gigs
            </Button>
            <Button
              component={RouterLink}
              to="/discover"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'block',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Discover Links
            </Button>
          </Box>

          {/* Right Side - User Actions */}
          <Box sx={{ 
            flexGrow: 0, 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1
          }}>
            {isAuthenticated ? authLinks : guestLinks}
            {isAuthenticated && user && (
              <>
                <NotificationBadge count={totalUnreadCount}>
                  <IconButton
                    onClick={handleNotificationsClick}
                    sx={{
                      p: 1,
                      ml: 1,
                      display: { xs: 'none', md: 'flex' },
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <NotificationsIcon sx={{ color: 'white' }} />
                  </IconButton>
                </NotificationBadge>
                <UserAvatar
                  user={user}
                  size={40}
                  onClick={handleOpenProfileMenu}
                  sx={{
                    ml: 1,
                    display: { xs: 'none', md: 'flex' },
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                />
                <Menu
                  anchorEl={anchorElProfile}
                  open={Boolean(anchorElProfile)}
                  onClose={handleCloseProfileMenu}
                  sx={{
                    mt: '45px'
                  }}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleProfileClick}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleSettingsClick}>
                    <SettingsIcon sx={{ mr: 1 }} />
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    
    </>
  );
};

export default Navbar;