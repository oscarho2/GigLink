import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user, token } = useAuth();
  const { socket } = useSocket();
  const userId = user?._id || user?.id || null;
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    linkRequests: 0,
    notifications: 0,
    total: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Fetch unread notification counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !userId || !token) {
      setUnreadCounts({ messages: 0, linkRequests: 0, notifications: 0, total: 0 });
      return;
    }

    try {
      // Fetch unread messages count
      const messagesResponse = await fetch('/api/messages/unread-count', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch pending link requests count
      const linksResponse = await fetch('/api/links/pending-count', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      // Fetch unread notifications count
      const notificationsResponse = await fetch('/api/notifications/unread', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      let messagesCount = 0;
      let linkRequestsCount = 0;
      let notificationsCount = 0;

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        messagesCount = messagesData.count || 0;
      }

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        linkRequestsCount = linksData.count || 0;
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        notificationsCount = notificationsData.count || 0;
      }

      const totalCount = messagesCount + linkRequestsCount + notificationsCount;
      
      setUnreadCounts({
        messages: messagesCount,
        linkRequests: linkRequestsCount,
        notifications: notificationsCount,
        total: totalCount
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCounts({ messages: 0, linkRequests: 0, notifications: 0, total: 0 });
    }
  }, [isAuthenticated, token, userId]);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !userId || !token) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isAuthenticated, token, userId]);

  // Update specific notification count
  const updateCount = useCallback((type, count) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: count };
      newCounts.total = newCounts.messages + newCounts.linkRequests + newCounts.notifications;
      return newCounts;
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
        // Update counts locally instead of refetching
        setUnreadCounts(prev => ({
          ...prev,
          notifications: Math.max(0, prev.notifications - 1),
          total: Math.max(0, prev.total - 1)
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [token]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state and counts efficiently
        setNotifications(prev => {
          const deletedNotification = prev.find(notif => notif._id === notificationId);
          const filteredNotifications = prev.filter(notif => notif._id !== notificationId);
          
          // Update counts locally if the deleted notification was unread
          if (deletedNotification && !deletedNotification.read) {
            setUnreadCounts(prevCounts => ({
              ...prevCounts,
              notifications: Math.max(0, prevCounts.notifications - 1),
              total: Math.max(0, prevCounts.total - 1)
            }));
          }
          
          return filteredNotifications;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [token]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state - mark all notifications as read
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        // Update counts locally
        setUnreadCounts(prev => ({
          ...prev,
          notifications: 0,
          total: prev.messages + prev.linkRequests
        }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [token]);

  // Increment notification count
  const incrementCount = useCallback((type, count = 1) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: prev[type] + count };
      newCounts.total = newCounts.messages + newCounts.linkRequests + newCounts.notifications;
      return newCounts;
    });
  }, []);

  // Show notification function
  const showNotification = useCallback((message, type = 'info') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      default:
        toast.info(message);
    }
  }, []);

  // Fetch counts and notifications when user authentication changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchUnreadCounts();
      fetchNotifications();
    } else {
      // Clear state when not authenticated
      setNotifications([]);
      setUnreadCounts({ messages: 0, linkRequests: 0, notifications: 0, total: 0 });
      setNotificationsLoading(false);
    }
  }, [fetchNotifications, fetchUnreadCounts, isAuthenticated, userId]);

  // Refresh counts periodically (every 60 seconds instead of 30 to reduce visual updates)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      // Only refresh if page is visible to prevent unnecessary updates
      if (!document.hidden) {
        fetchUnreadCounts();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts, isAuthenticated]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isAuthenticated || !userId) return;

    // Listen for new messages to increment unread count
    const handleNewMessage = (message) => {
      // Only increment if message is not from current user
      if (message.sender._id !== userId) {
        incrementCount('messages', 1);
      }
    };

    // Listen for conversation updates (when messages are read)
    const handleConversationUpdate = (data) => {
      // Update counts locally instead of refetching
      if (data.type === 'messages_read') {
        setUnreadCounts(prev => ({
          ...prev,
          messages: Math.max(0, prev.messages - (data.count || 1)),
          total: Math.max(0, prev.total - (data.count || 1))
        }));
      }
    };

    // Listen for message status updates (when messages are marked as read)
    const handleMessageStatusUpdate = ({ status, count = 1 }) => {
      if (status === 'read') {
        // Update counts locally when messages are marked as read
        setUnreadCounts(prev => ({
          ...prev,
          messages: Math.max(0, prev.messages - count),
          total: Math.max(0, prev.total - count)
        }));
      }
    };

    // Listen for new notifications
    const handleNewNotification = (notification) => {
      console.log('Received newNotification event:', notification);
      if (String(notification.recipient) === String(userId)) {
        console.log('Processing notification for current user');
        // Check if notification already exists to prevent duplicates
        setNotifications(prev => {
          const exists = prev.some(notif => notif._id === notification._id);
          if (exists) {
            console.log('Notification already exists, skipping');
            return prev;
          }
          console.log('Adding new notification to state');
          return [notification, ...prev];
        });
        
        // Update counts locally
        setUnreadCounts(prev => ({
          ...prev,
          notifications: prev.notifications + 1,
          total: prev.total + 1
        }));
        
        // Show toast notification
        const typeMessages = {
          comment: 'New comment on your post',
          message: 'New message received',
          gig_application: 'New application for your gig',
          gig_posted: 'New gig posted',
          link_request: 'New link request'
        };
        
        showNotification(
          typeMessages[notification.type] || 'New notification',
          'info'
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_update', handleConversationUpdate);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_update', handleConversationUpdate);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, isAuthenticated, userId, incrementCount, showNotification]);

  const value = useMemo(() => ({
    unreadCounts,
    totalUnreadCount: unreadCounts.total,
    notifications,
    loading: notificationsLoading,
    fetchUnreadCounts,
    fetchNotifications,
    updateCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    incrementCount,
    showNotification
  }), [
    unreadCounts,
    notifications,
    notificationsLoading,
    fetchUnreadCounts,
    fetchNotifications,
    updateCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    incrementCount,
    showNotification
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
