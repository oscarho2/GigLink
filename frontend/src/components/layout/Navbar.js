import React, { useContext, useState, useCallback, memo } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElProfile, setAnchorElProfile] = useState(null);

  const handleOpenNavMenu = useCallback((event) => {
    setAnchorElNav(event.currentTarget);
  }, []);
  
  const handleCloseNavMenu = useCallback(() => {
    setAnchorElNav(null);
  }, []);

  const handleMenuItemClick = useCallback(() => {
    setAnchorElNav(null);
  }, []);

  const handleOpenProfileMenu = useCallback((event) => {
    setAnchorElProfile(event.currentTarget);
  }, []);

  const handleCloseProfileMenu = useCallback(() => {
    setAnchorElProfile(null);
  }, []);

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
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
    </Box>
  );

  const authLinks = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button 
        color="inherit" 
        component={RouterLink} 
        to="/messages"
        sx={{
          borderBottom: location.pathname === '/messages' ? '2px solid white' : 'none',
          borderRadius: 0,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        Messages
      </Button>
      <Button 
        color="inherit" 
        component={RouterLink} 
        to="/dashboard"
        sx={{
          borderBottom: location.pathname === '/dashboard' ? '2px solid white' : 'none',
          borderRadius: 0,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        Dashboard
      </Button>
    </Box>
  );

  return (
    <>
    <AppBar position="static" sx={{ bgcolor: '#1a365d', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: { xs: 64, md: 96 } }}>
          <Box
            component={RouterLink}
            to={isAuthenticated ? "/community" : "/"}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              mr: 2
            }}
          >
            <Box
              component="img"
              src="/images/GigLink Logo Full.svg"
              alt="GigLink"
              sx={{ height: 80, display: 'block' }}
            />
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'none' } }}>
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
              {!isAuthenticated && (
                <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/register">
                  <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>✨ Join Now</Typography>
                </MenuItem>
              )}
              
              {/* User-specific sections */}
              {isAuthenticated && (
                <>
                  <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', my: 1, mx: 2 }} />
                  <Typography sx={{ px: 3, py: 1, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>My Account</Typography>
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/messages">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>💬 Messages</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleMenuItemClick} component={RouterLink} to="/dashboard">
                    <Typography textAlign="left" sx={{ width: '100%', color: '#1a365d' }}>📊 Dashboard</Typography>
                  </MenuItem>

                </>
              )}

            </Menu>
          </Box>
          
          <Box
            component={RouterLink}
            to={isAuthenticated ? "/community" : "/"}
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: 1,
              display: { xs: 'flex', md: 'none' }
            }}
          >
            <Box
              component="img"
              src="/images/GigLink Logo Full.svg"
              alt="GigLink"
              sx={{ height: 60, display: 'block' }}
            />
          </Box>
          
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
              <IconButton
                  onClick={handleNotificationsClick}
                  sx={{
                    p: 0.5,
                    ml: 1,
                    display: { xs: 'flex', md: 'none' },
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '&::after': totalUnreadCount > 0 ? {
                      content: '""',
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#f44336'
                    } : {}
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 20, color: 'white' }} />
                </IconButton>
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
                borderBottom: location.pathname === '/community' ? '2px solid white' : 'none',
                borderRadius: 0,
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
                borderBottom: location.pathname === '/gigs' ? '2px solid white' : 'none',
                borderRadius: 0,
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
                borderBottom: location.pathname === '/discover' ? '2px solid white' : 'none',
                borderRadius: 0,
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
                <IconButton
                  onClick={handleNotificationsClick}
                  sx={{
                    p: 0.5,
                    ml: 1,
                    display: { xs: 'none', md: 'flex' },
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '&::after': totalUnreadCount > 0 ? {
                      content: '""',
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#f44336'
                    } : {}
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 24, color: 'white' }} />
                </IconButton>
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

export default memo(Navbar);
