import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (token && user) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5001', {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server with user ID:', user._id);
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
  }, [token, user]);

  const joinConversation = (conversationId) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  };

  const startTyping = (conversationId, recipientId) => {
    if (socket) {
      socket.emit('typing_start', { conversationId, recipientId });
    }
  };

  const stopTyping = (conversationId, recipientId) => {
    if (socket) {
      socket.emit('typing_stop', { conversationId, recipientId });
    }
  };

  const markMessageDelivered = (messageId, conversationId) => {
    if (socket) {
      socket.emit('message_delivered', { messageId, conversationId });
    }
  };

  const markMessageRead = (messageId, conversationId) => {
    if (socket) {
      socket.emit('message_read', { messageId, conversationId });
    }
  };

  const value = {
    socket,
    isConnected,
    typingUsers,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markMessageDelivered,
    markMessageRead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};