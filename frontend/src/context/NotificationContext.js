import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket();
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    linkRequests: 0,
    notifications: 0,
    total: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch unread notification counts
  const fetchUnreadCounts = async () => {
    if (!isAuthenticated || !user) {
      setUnreadCounts({ messages: 0, linkRequests: 0, notifications: 0, total: 0 });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch all notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
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
    }
  };

  // Update specific notification count
  const updateCount = (type, count) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: count };
      newCounts.total = newCounts.messages + newCounts.linkRequests + newCounts.notifications;
      return newCounts;
    });
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
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
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
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
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
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
  };

  // Increment notification count
  const incrementCount = (type, count = 1) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: prev[type] + count };
      newCounts.total = newCounts.messages + newCounts.linkRequests + newCounts.notifications;
      return newCounts;
    });
  };

  // Fetch counts and notifications when user authentication changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCounts();
      fetchNotifications();
    } else {
      // Clear state when not authenticated
      setNotifications([]);
      setUnreadCounts({ messages: 0, linkRequests: 0, notifications: 0, total: 0 });
    }
  }, [isAuthenticated, user?.id]); // Only depend on user ID to prevent unnecessary re-renders

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
  }, [isAuthenticated]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isAuthenticated || !user) return;

    // Listen for new messages to increment unread count
    const handleNewMessage = (message) => {
      // Only increment if message is not from current user
      if (message.sender._id !== user.id) {
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
      if (notification.recipient === user._id) {
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
  }, [socket, isAuthenticated, user, incrementCount, fetchUnreadCounts]);

  // Show notification function
  const showNotification = (message, type = 'info') => {
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
  };

  const value = {
    unreadCounts,
    totalUnreadCount: unreadCounts.total,
    notifications,
    loading,
    fetchUnreadCounts,
    fetchNotifications,
    updateCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    incrementCount,
    showNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
