import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const { token, user } = useAuth();
  const userId = user?._id || user?.id || null;

  useEffect(() => {
    if (token && userId) {
      // Initialize socket connection
      const socketUrl = process.env.REACT_APP_API_BASE_URL || 
                       (window.location.origin.includes('localhost') ? 'http://localhost:5001' : 'https://www.giglinksocial.com');
      
      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'], // Explicitly specify transports
        withCredentials: true // Enable credentials
      });

      newSocket.on('connect', () => {
        console.log('Connected to server with user ID:', userId);
        console.log('Socket ID:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      // Test listener for any events
      newSocket.onAny((eventName, ...args) => {
        console.log('Socket event received:', eventName, args);
      });

      // Handle typing indicators
      newSocket.on('user_typing', ({ userId, isTyping }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (isTyping) {
            newMap.set(userId, true);
          } else {
            newMap.delete(userId);
          }
          return newMap;
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, userId]);

  const joinConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  }, [socket]);

  const leaveConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  }, [socket]);

  const startTyping = useCallback((conversationId, recipientId) => {
    if (socket) {
      socket.emit('typing_start', { conversationId, recipientId });
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId, recipientId) => {
    if (socket) {
      socket.emit('typing_stop', { conversationId, recipientId });
    }
  }, [socket]);

  const markMessageDelivered = useCallback((messageId, conversationId) => {
    if (socket) {
      socket.emit('message_delivered', { messageId, conversationId });
    }
  }, [socket]);

  const markMessageRead = useCallback((messageId, conversationId) => {
    if (socket) {
      socket.emit('message_read', { messageId, conversationId });
    }
  }, [socket]);

  const value = useMemo(() => ({
    socket,
    isConnected,
    typingUsers,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessageDelivered,
    markMessageRead
  }), [
    socket,
    isConnected,
    typingUsers,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessageDelivered,
    markMessageRead
  ]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
