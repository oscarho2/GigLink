import React, { useState, useEffect, useContext } from 'react';
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
  AlternateEmail as MentionIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon
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
  const { notifications, markAsRead, deleteNotification } = useNotifications();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'gig':
        return <WorkIcon />;
      case 'link':
        return <LinkIcon />;
      case 'mention':
        return <MentionIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'gig':
        return '#1976d2';
      case 'link':
        return '#388e3c';
      case 'mention':
        return '#f57c00';
      default:
        return '#757575';
    }
  };

  const filterNotifications = (type) => {
    if (!notifications) return [];
    if (type === 'all') return notifications;
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
              sx={{
                bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.04)',
                borderRadius: 1,
                mb: 1,
                border: notification.read ? '1px solid #e0e0e0' : '1px solid rgba(25, 118, 210, 0.2)'
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
                    <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                      {notification.title || 'Notification'}
                    </Typography>
                    {!notification.read && (
                      <Badge color="primary" variant="dot" />
                    )}
                    <Chip
                      label={notification.type}
                      size="small"
                      sx={{
                        bgcolor: getNotificationColor(notification.type),
                        color: 'white',
                        fontSize: '0.75rem',
                        height: 20
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {notification.message || 'No message available'}
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
                {!notification.read && (
                  <IconButton
                    size="small"
                    onClick={() => handleMarkAsRead(notification._id)}
                    sx={{ color: '#1976d2' }}
                    title="Mark as read"
                  >
                    <MarkReadIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleDelete(notification._id)}
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
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1a365d' }}>
        Notifications
      </Typography>

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
                    label={filterNotifications('gig').length}
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
                    label={filterNotifications('link').length}
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
                  <MentionIcon fontSize="small" />
                  Mentions
                  <Chip
                    label={filterNotifications('mention').length}
                    size="small"
                    sx={{ bgcolor: '#fff3e0', color: '#f57c00', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(3)}
            />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tabValue} index={0}>
            {renderNotificationList(filterNotifications('all'))}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderNotificationList(filterNotifications('gig'))}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderNotificationList(filterNotifications('link'))}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderNotificationList(filterNotifications('mention'))}
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Notifications;