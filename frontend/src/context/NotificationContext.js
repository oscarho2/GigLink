import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    linkRequests: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);

  // Fetch unread notification counts
  const fetchUnreadCounts = async () => {
    if (!isAuthenticated || !user) {
      setUnreadCounts({ messages: 0, linkRequests: 0, total: 0 });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch unread messages count
      const messagesResponse = await fetch('/api/messages/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch pending link requests count
      const linksResponse = await fetch('/api/links/pending-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let messagesCount = 0;
      let linkRequestsCount = 0;

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        messagesCount = messagesData.count || 0;
      }

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        linkRequestsCount = linksData.count || 0;
      }

      const totalCount = messagesCount + linkRequestsCount;
      
      setUnreadCounts({
        messages: messagesCount,
        linkRequests: linkRequestsCount,
        total: totalCount
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCounts({ messages: 0, linkRequests: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Update specific notification count
  const updateCount = (type, count) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: count };
      newCounts.total = newCounts.messages + newCounts.linkRequests;
      return newCounts;
    });
  };

  // Mark notifications as read
  const markAsRead = (type, count = 1) => {
    setUnreadCounts(prev => {
      const newCount = Math.max(0, prev[type] - count);
      const newCounts = { ...prev, [type]: newCount };
      newCounts.total = newCounts.messages + newCounts.linkRequests;
      return newCounts;
    });
  };

  // Increment notification count
  const incrementCount = (type, count = 1) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev, [type]: prev[type] + count };
      newCounts.total = newCounts.messages + newCounts.linkRequests;
      return newCounts;
    });
  };

  // Fetch counts when user authentication changes
  useEffect(() => {
    fetchUnreadCounts();
  }, [isAuthenticated, user]);

  // Refresh counts periodically (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value = {
    unreadCounts,
    loading,
    fetchUnreadCounts,
    updateCount,
    markAsRead,
    incrementCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;