import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Work as WorkIcon,
  Link as LinkIcon,
  Comment as CommentIcon,
  Message as MessageIcon,
  Favorite as FavoriteIcon,
  Delete as DeleteIcon,
  Article as PostIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import AuthContext from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `notification-tab-${index}`,
    'aria-controls': `notification-tabpanel-${index}`,
  };
}

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const { notifications, markAsRead, deleteNotification, markAllAsRead, loading } = useNotifications();
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  // Remove auto-mark-as-read to prevent visual refreshes
  // Users can manually mark notifications as read by clicking them or using the mark all button

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'gig_application':
      case 'gig_accepted':
      case 'gig_rejected':
        if (notification.relatedId) {
          navigate(`/gigs/${notification.relatedId}`);
        } else {
          navigate('/gigs');
        }
        break;
      case 'message':
      case 'chat':
        if (notification.relatedId) {
          navigate(`/messages/${notification.relatedId}`);
        } else {
          navigate('/messages');
        }
        break;
      case 'link_request':
      case 'connection_request':
      case 'connection_accepted':
        navigate('/links', { state: { activeTab: 1 } }); // Open requests tab
        break;
      case 'comment':
      case 'post_comment':
        if (notification.relatedId) {
          navigate(`/posts/${notification.relatedId}`);
        } else {
          navigate('/feed');
        }
        break;
      case 'like':
      case 'post_like':
        if (notification.relatedId) {
          navigate(`/posts/${notification.relatedId}`);
        } else {
          navigate('/feed');
        }
        break;
      case 'profile_view':
        navigate('/profile');
        break;
      default:
        // For unknown types, stay on notifications page
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'gig_application':
        return <WorkIcon />;
      case 'link_request':
        return <LinkIcon />;
      case 'comment':
        return <CommentIcon />;
      case 'message':
        return <MessageIcon />;
      case 'like':
        return <FavoriteIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'gig_application':
        return '#1976d2';
      case 'link_request':
        return '#388e3c';
      case 'comment':
        return '#f57c00';
      case 'message':
        return '#9c27b0';
      case 'like':
        return '#e91e63';
      default:
        return '#757575';
    }
  };

  const filterNotifications = (type) => {
    if (!notifications) return [];
    if (type === 'all') return notifications;
    if (type === 'posts') return notifications.filter(notification => notification.type === 'comment' || notification.type === 'like');
    return notifications.filter(notification => notification.type === type);
  };

  const renderNotificationList = (notificationList) => {
    if (notificationList.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No notifications found.
        </Alert>
      );
    }

    return (
      <List sx={{ mt: 2 }}>
        {notificationList.map((notification, index) => (
          <React.Fragment key={notification._id || index}>
            <ListItem
              onClick={() => handleNotificationClick(notification)}
              sx={{
                bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.04)',
                borderRadius: 1,
                mb: 1,
                border: notification.read ? '1px solid #e0e0e0' : '1px solid rgba(25, 118, 210, 0.2)',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(25, 118, 210, 0.08)'
                }
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: getNotificationColor(notification.type),
                    width: 40,
                    height: 40
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {notification.title && (
                      <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                        {notification.title}
                      </Typography>
                    )}
                    {!notification.read && (
                      <Badge color="primary" variant="dot" />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {notification.type === 'comment' && notification.commentContent 
                        ? notification.commentContent 
                        : notification.message || 'No message available'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.createdAt
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                        : 'Unknown time'
                      }
                    </Typography>
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification._id);
                  }}
                  sx={{ color: '#d32f2f' }}
                  title="Delete notification"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
            {index < notificationList.length - 1 && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Card sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="notification tabs"
            variant="fullWidth"
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon fontSize="small" />
                  All
                  <Chip
                    label={notifications ? notifications.length : 0}
                    size="small"
                    sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(0)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon fontSize="small" />
                  Gigs
                  <Chip
                    label={filterNotifications('gig_application').length}
                    size="small"
                    sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(1)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon fontSize="small" />
                  Links
                  <Chip
                    label={filterNotifications('link_request').length}
                    size="small"
                    sx={{ bgcolor: '#e8f5e8', color: '#388e3c', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(2)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PostIcon fontSize="small" />
                  Posts
                  <Chip
                    label={filterNotifications('posts').length}
                    size="small"
                    sx={{ bgcolor: '#fff3e0', color: '#f57c00', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(3)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageIcon fontSize="small" />
                  Messages
                  <Chip
                    label={filterNotifications('message').length}
                    size="small"
                    sx={{ bgcolor: '#f3e5f5', color: '#9c27b0', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(4)}
            />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tabValue} index={0}>
            {renderNotificationList(filterNotifications('all'))}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderNotificationList(filterNotifications('gig_application'))}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderNotificationList(filterNotifications('link_request'))}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderNotificationList(filterNotifications('posts'))}
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            {renderNotificationList(filterNotifications('message'))}
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Notifications;