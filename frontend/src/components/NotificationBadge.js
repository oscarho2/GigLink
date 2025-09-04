import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  Box,
  Divider,
  Button,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const NotificationBadge = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/requests/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.requests);
        setUnreadCount(data.requests.length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const acceptLinkRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/accept/${linkId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove the notification from the list
        setNotifications(prev => prev.filter(notif => notif.linkId !== linkId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error accepting link request:', error);
    }
  };

  const declineLinkRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/decline/${linkId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove the notification from the list
        setNotifications(prev => prev.filter(notif => notif.linkId !== linkId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error declining link request:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          mr: 1,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 350,
            maxHeight: 400,
            mt: 1
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Link Requests
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unreadCount} pending request{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No pending link requests
            </Typography>
          </Box>
        ) : (
          notifications.map((request, index) => (
            <Box key={request.linkId}>
              <MenuItem
                sx={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  py: 2,
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar
                    src={request.requester.avatar}
                    sx={{ width: 40, height: 40, mr: 2 }}
                  >
                    {request.requester.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {request.requester.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      wants to connect with you
                    </Typography>
                    {request.note && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{request.note}"
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      acceptLinkRequest(request.linkId);
                    }}
                    sx={{ minWidth: 80 }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      declineLinkRequest(request.linkId);
                    }}
                    sx={{ minWidth: 80 }}
                  >
                    Decline
                  </Button>
                </Box>
              </MenuItem>
              {index < notifications.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBadge;