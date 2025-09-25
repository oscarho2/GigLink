import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Groups as CommunityIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const MobileBottomNavigation = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { totalUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Don't show on desktop
  if (!isMobile) {
    return null;
  }

  // Get current tab value based on pathname
  const getCurrentValue = () => {
    const path = location.pathname;
    
    if (path === '/' || path === '/community') return 0;
    if (path === '/discover') return 1;
    if (path === '/gigs' || path === '/my-gigs') return 2;
    if (path === '/messages') return 3;
    if (path === '/dashboard' || path === '/settings' || path.includes('/profile')) return 4;
    
    return 0; // Default to home
  };

  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        navigate(isAuthenticated ? '/community' : '/');
        break;
      case 1:
        navigate('/discover');
        break;
      case 2:
        navigate('/gigs');
        break;
      case 3:
        navigate('/messages');
        break;
      case 4:
        navigate(isAuthenticated ? '/dashboard' : '/login');
        break;
      default:
        break;
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        sx={{
          height: 70,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 12px 8px',
            '&.Mui-selected': {
              color: 'black',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            fontWeight: 500,
            opacity: 1,
            transform: 'none',
            '&.Mui-selected': {
              fontSize: '0.75rem',
              color: 'black',
            },
          },
          '& .MuiBottomNavigationAction-iconOnly': {
            paddingTop: '6px',
          },
        }}
      >
        <BottomNavigationAction
          label={isAuthenticated ? "Community" : "Home"}
          icon={isAuthenticated ? <CommunityIcon /> : <HomeIcon />}
        />
        <BottomNavigationAction
          label="Explore"
          icon={<SearchIcon />}
        />
        <BottomNavigationAction
          label="Gigs"
          icon={<WorkIcon />}
        />
        <BottomNavigationAction
          label="Messages"
          icon={<MessageIcon />}
        />
        <BottomNavigationAction
          label={isAuthenticated ? "Dashboard" : "Profile"}
          icon={isAuthenticated ? <DashboardIcon /> : <PersonIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNavigation;