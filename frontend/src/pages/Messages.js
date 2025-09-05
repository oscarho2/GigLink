import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Fade,
  Zoom,
  Chip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Schedule as ScheduleIcon,
  Reply as ReplyIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
  Payment as PaymentIcon,
  MusicNote as MusicNoteIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import { formatPayment } from '../utils/currency';
import moment from 'moment';

const Messages = () => {
  const { user, token } = useAuth();
  const { showNotification } = useNotifications();
  const { socket, isConnected, typingUsers, joinConversation, leaveConversation, startTyping, stopTyping, markMessageDelivered, markMessageRead } = useSocket();
  
  console.log('=== MESSAGES COMPONENT RENDER ===');
  console.log('Messages component rendered - User:', user, 'Token:', token ? 'Present' : 'Missing');
  console.log('User object:', JSON.stringify(user, null, 2));
  console.log('Token value:', token);
  console.log('LocalStorage token:', localStorage.getItem('token'));
  console.log('=== END RENDER DEBUG ===');
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Test if component is loading
  useEffect(() => {
    console.log('Messages component mounted');
  }, []);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [connectedLinks, setConnectedLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [emojiMenuAnchor, setEmojiMenuAnchor] = useState(null);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
      const [replyToMessage, setReplyToMessage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);

  const handleMessageContextMenu = (event, message) => {
    event.preventDefault();
    setSelectedMessageForMenu(message);
    setMessageMenuAnchor(event.currentTarget);
  };
  
  // Debug: Log replyToMessage changes
  useEffect(() => {
    console.log('replyToMessage state changed:', replyToMessage);
  }, [replyToMessage]);

  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    console.log('fetchConversations called - making API request to /api/messages/conversations');
    try {
      console.log('Making axios GET request to /api/messages/conversations with token:', token ? 'Present' : 'Missing');
      const response = await axios.get('/api/messages/conversations', {
        headers: { 'x-auth-token': token }
      });
      console.log('API response received:', response.data);
      console.log('Response status:', response.status);
      console.log('Number of conversations:', response.data?.length || 0);
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      console.error('Error details:', err.response?.data || err.message);
      console.error('Error status:', err.response?.status);
      
      // If token is invalid, clear it and redirect to login
      if (err.response?.status === 401 || err.response?.data?.msg === 'Token is not valid') {
        console.log('Invalid token detected, clearing and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('hasLoggedOut');
        window.location.href = '/login';
        return;
      }
      
      setError('Failed to load conversations');
    }
  }, [token]);



  // Start conversation with selected user
  const startConversation = async (userId) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => conv.otherUser?._id === userId);
    if (existingConversation) {
      // If conversation exists, just select it
      setSelectedConversation({ _id: userId });
      fetchMessages(userId);
    } else {
      try {
        // Fetch user details for new conversation
        const userResponse = await axios.get(`/api/users/${userId}`, {
          headers: { 'x-auth-token': token }
        });
        const otherUser = userResponse.data;
        
        // Create new conversation object with consistent ID generation
        const sortedIds = [user.id, userId].sort();
        const conversationId = sortedIds.join('_');
        const newConversation = {
          conversationId,
          otherUser,
          lastMessage: null,
          unreadCount: 0
        };
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...(prev || [])]);
        
        // Select the new conversation
        setSelectedConversation({ _id: userId });
        setMessages([]); // Start with empty messages
      } catch (err) {
        console.error('Error starting new conversation:', err);
        setError('Failed to start new conversation');
      }
    }
  };

  // Fetch connected users for new conversation
  const fetchConnectedLinks = async () => {
    try {
      setLoadingLinks(true);
      const response = await axios.get('/api/links/links', {
        headers: { 'x-auth-token': token }
      });
      // Extract the user data from the links response
      const users = response.data.links.map(linkData => linkData.link);
      setConnectedLinks(users);
    } catch (err) {
      console.error('Error fetching connected links:', err);
      setError('Failed to load connected users');
    } finally {
      setLoadingLinks(false);
    }
  };

  // Handle opening new conversation dialog
  const handleOpenNewConversation = () => {
    setShowNewConversationDialog(true);
    fetchConnectedLinks();
  };

  // Fetch messages for a conversation
  const fetchMessages = async (otherUserId) => {
    console.log('=== FETCH MESSAGES CALLED ===');
    console.log('fetchMessages called with otherUserId:', otherUserId);
    console.log('Token available:', token ? 'YES' : 'NO');
    console.log('Making API call to:', `/api/messages/conversation/${otherUserId}`);
    try {
      const response = await axios.get(`/api/messages/conversation/${otherUserId}`, {
        headers: { 'x-auth-token': token }
      });
      console.log('=== API RESPONSE RECEIVED ===');
      console.log('Messages response:', response.data);
      console.log('Response status:', response.status);
      console.log('Number of messages:', response.data?.length || 0);
      setMessages(Array.isArray(response.data) ? response.data : []);
      
      // Find the full conversation object from conversations array
      const fullConversation = conversations.find(conv => conv.otherUser?._id === otherUserId);
      console.log('Full conversation found:', fullConversation);
      if (fullConversation) {
        setSelectedConversation(fullConversation);
        
        // Join the conversation for real-time updates
        joinConversation(fullConversation.conversationId);
        
        // Mark all unread messages as read when conversation is opened
        if (fullConversation.unreadCount > 0) {
          const messages = Array.isArray(response.data) ? response.data : [];
          const unreadMessages = messages.filter(msg => 
            msg.sender._id !== user.id && !msg.read
          );
          
          // Mark each unread message as read via API
          unreadMessages.forEach(async (message) => {
            try {
              await axios.put(`/api/messages/${message._id}/status`, {
                status: 'read'
              }, {
                headers: { 'x-auth-token': token }
              });
            } catch (error) {
              console.error('Error marking message as read:', error);
            }
          });
          
          // Update conversation unread count locally
          setConversations(prev => 
            prev.map(conv => 
              conv.conversationId === fullConversation.conversationId 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          );
        }
      } else {
        // If conversation not found, fetch user details
        try {
          const userResponse = await axios.get(`/api/users/${otherUserId}`, {
            headers: { 'x-auth-token': token }
          });
          const otherUser = userResponse.data;
          setSelectedConversation({ _id: otherUserId, otherUser });
        } catch (userErr) {
          console.error('Error fetching user details:', userErr);
          setSelectedConversation({ _id: otherUserId });
        }
      }
      console.log('Messages state updated, count:', response.data.length);
    } catch (err) {
      console.error('=== ERROR FETCHING MESSAGES ===');
      console.error('Error fetching messages:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError('Failed to load messages');
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      await axios.post('/api/messages/send', {
        recipient: selectedConversation._id,
        content: newMessage
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setNewMessage('');
      fetchMessages(selectedConversation._id);
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };



  useEffect(() => {
    console.log('=== Messages useEffect START ===');
    console.log('Messages useEffect triggered, token:', token);
    console.log('Current user:', user);
    console.log('Is authenticated:', token ? 'Yes' : 'No');
    console.log('fetchConversations function:', typeof fetchConversations);
    if (token) {
      console.log('Token exists, calling fetchConversations');
      fetchConversations();
      setLoading(false);
    } else {
      console.log('No token available, cannot fetch conversations');
      // Clear any invalid token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('hasLoggedOut');
      window.location.href = '/login';
    }
    console.log('=== Messages useEffect END ===');
  }, [token, fetchConversations]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('new_message', (message) => {
      // Only add message to state if it's not from the current user
      // (current user's messages are already added optimistically)
      if (message.sender._id !== user.id) {
        setMessages(prev => [...(prev || []), message]);
        
        // Check if this message is for the currently open conversation
        const isCurrentConversation = selectedConversation && 
          (selectedConversation.conversationId === message.conversationId ||
           selectedConversation.otherUser?._id === message.sender._id);
        
        if (isCurrentConversation) {
          // If conversation is already open, mark message as read immediately via API
          (async () => {
            try {
              await axios.put(`/api/messages/${message._id}/status`, {
                status: 'read'
              }, {
                headers: { 'x-auth-token': token }
              });
            } catch (error) {
              console.error('Error marking message as read:', error);
            }
          })();
          
          // Don't increment unread count for current conversation
          setConversations(prev => {
            const updated = (prev || []).map(conv => {
              if (conv.conversationId === message.conversationId) {
                return {
                  ...conv,
                  lastMessage: message
                  // unreadCount stays the same since message is read immediately
                };
              }
              return conv;
            });
            return updated;
          });
        } else {
          // If conversation is not open, increment unread count
          setConversations(prev => {
            const updated = (prev || []).map(conv => {
              if (conv.conversationId === message.conversationId) {
                return {
                  ...conv,
                  lastMessage: message,
                  unreadCount: conv.unreadCount + 1
                };
              }
              return conv;
            });
            return updated;
          });
        }
      }
    });

    // Listen for message reactions
    socket.on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => (prev || []).map(msg => {
        if (msg._id === messageId) {
          return { ...msg, reactions: reactions };
        }
        return msg;
      }));
    });

    // Listen for message status updates
    socket.on('message_status_update', ({ messageId, status }) => {
      setMessages(prev => (prev || []).map(msg => {
        if (msg._id === messageId) {
          return { ...msg, [status]: true };
        }
        return msg;
      }));
      
      // If a message was marked as read, update the tick icon color
      if (status === 'read') {
        // The getMessageStatusIcon function will automatically show blue ticks for read messages
        console.log(`Message ${messageId} marked as read - tick will turn blue`);
      }
    });

    // Listen for typing indicators
    socket.on('user_typing', ({ userId, isTyping }) => {
      const selectedUserId = selectedConversation?.otherUser?._id || selectedConversation?._id;
      if (selectedConversation && selectedUserId === userId) {
        setIsTyping(isTyping);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('message_reaction');
      socket.off('message_status_update');
      socket.off('user_typing');
    };
  }, [socket, selectedConversation]);

  // Handle joining/leaving conversations
  useEffect(() => {
    return () => {
      // Leave conversation when component unmounts or conversation changes
      if (selectedConversation?.conversationId) {
        leaveConversation(selectedConversation.conversationId);
      }
    };
  }, [selectedConversation?.conversationId, leaveConversation]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll only the message container div to the bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll to bottom when conversation is opened or messages change
  useEffect(() => {
    if (selectedConversation && messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, selectedConversation]);

  // Auto-scroll to bottom when typing indicator appears or disappears
  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [isTyping, selectedConversation]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (selectedConversation && socket && user?.id) {
      const userId1 = user.id;
      // Handle both cases: full conversation object or just ID
      const userId2 = selectedConversation.otherUser?._id || selectedConversation._id;
      
      if (!userId1 || !userId2) {
        return;
      }
      
      const sortedIds = [userId1, userId2].sort();
      const conversationId = sortedIds.join('_');
      joinConversation(conversationId);
      
      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [selectedConversation, socket, user?.id, joinConversation, leaveConversation]);

  // Handle typing indicators
  const handleTyping = () => {
    if (selectedConversation && socket && user?.id) {
      const userId1 = user.id;
      const userId2 = selectedConversation.otherUser?._id || selectedConversation._id;
      
      if (!userId1 || !userId2) {
        return;
      }
      
      const sortedIds = [userId1, userId2].sort();
      const conversationId = sortedIds.join('_');
      startTyping(conversationId, userId2);
      
      // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId, userId2);
    }, 1000);
    }
  };

  // Search messages in current conversation
  const searchMessages = async (searchTerm) => {
    if (!selectedConversation || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const userId = selectedConversation.otherUser?._id || selectedConversation._id;
      const response = await fetch(`/api/messages/search/${userId}?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        console.error('Search failed:', response.statusText);
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching messages:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle message search input
  const handleMessageSearch = (e) => {
    const term = e.target.value;
    setMessageSearchTerm(term);
    
    // Debounce search
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      searchMessages(term);
    }, 300);
  };

  // Toggle message search
  const toggleMessageSearch = () => {
    setShowMessageSearch(!showMessageSearch);
    if (showMessageSearch) {
      setMessageSearchTerm('');
      setSearchResults([]);
    }
  };

  // Scroll to searched message
  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  // Enhanced send message with real-time features
  const sendMessageEnhanced = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || sending) {
      return;
    }

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      let fileData = null;
      
      // Upload file if selected
      if (selectedFile) {
        fileData = await handleFileUpload();
        if (!fileData) {
          setSending(false);
          return;
        }
      }

      // Determine the recipient ID based on available conversation data
      let recipientId;
      if (selectedConversation.otherUser && selectedConversation.otherUser._id) {
        // We have the full conversation object
        recipientId = selectedConversation.otherUser._id;
      } else {
        // We only have the ID
        recipientId = selectedConversation._id;
      }
      
      const messagePayload = {
        recipientId: recipientId,
        content: messageText,
        messageType: fileData ? 'file' : 'text',
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        mimeType: fileData?.mimeType,
        replyTo: replyToMessage?._id
      };

      const response = await axios.post('/api/messages/send', messagePayload, {
        headers: { 'x-auth-token': token }
      });

      const newMessageData = response.data;
      
      // Add message to local state immediately
      setMessages(prev => [...(prev || []), newMessageData]);
      
      // Clear selected file and reply
      clearSelectedFile();
      clearReply();
      
      // Refresh conversations to update last message
      fetchConversations();
     } catch (err) {
       console.error('Error sending message:', err);
       if (err.response) {
         showNotification('Failed to send message: ' + (err.response.data?.message || err.response.statusText), 'error');
       } else if (err.request) {
         showNotification('Network error: Could not reach backend', 'error');
       } else {
         showNotification('Failed to send message: ' + err.message, 'error');
       }
       setNewMessage(messageText); // Restore message on error
     } finally {
       setSending(false);
     }
    };

  // Handle emoji reactions
  const handleEmojiReaction = async (messageId, emoji) => {
    try {
      await axios.post(`/api/messages/${messageId}/react`, {
        emoji
      }, {
        headers: { 'x-auth-token': token }
      });
      setEmojiMenuAnchor(null);
      setSelectedMessageForReaction(null);
      setShowReactionPicker(null);
    } catch (err) {
      console.error('Error adding reaction:', err);
      showNotification('Failed to add reaction', 'error');
    }
  };

  // Handle message hover (desktop)
  const handleMessageHover = (messageId) => {
    setHoveredMessage(messageId);
  };

  const handleMessageLeave = () => {
    setHoveredMessage(null);
  };

  // Handle long press (mobile)
  const handleTouchStart = (event, message) => {
    const timer = setTimeout(() => {
      handleMessageContextMenu(event, message);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle reply to message
  const handleReplyToMessage = (message) => {
    console.log('Setting reply to message:', message);
    setReplyToMessage(message);
    setHoveredMessage(null);
    setShowReactionPicker(null);
    // Focus on input
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Clear reply
  const clearReply = () => {
    setReplyToMessage(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        showNotification('File size must be less than 10MB', 'error');
        event.target.value = ''; // Clear the input
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return null;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          'x-auth-token': token
        },
        body: formData
      });

      if (response.ok) {
        const fileData = await response.json();
        return fileData;
      } else {
        throw new Error('File upload failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      showNotification('Failed to upload file', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Handle document preview
  const handleDocumentPreview = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the object URL after a delay to allow the browser to load it
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      } else {
        showNotification('Failed to open file', 'error');
      }
    } catch (err) {
      console.error('Error opening file:', err);
      showNotification('Failed to open file', 'error');
    }
  };

  // Message status helpers
  const getMessageStatusIcon = (message) => {
    if (message.sender._id !== user.id) return null;
    
    if (message.read) {
      return <DoneAllIcon sx={{ fontSize: 16, color: '#4caf50' }} />;
    } else if (message.delivered) {
      return <DoneAllIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />;
    } else {
      return <CheckIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />;
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const messageTime = moment(timestamp);
    const now = moment();
    
    if (now.diff(messageTime, 'days') === 0) {
      return 'Today';
    } else if (now.diff(messageTime, 'days') === 1) {
      return 'Yesterday';
    } else {
      return messageTime.format('DD/MM/YYYY');
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', bgcolor: '#f5f5f5' }}>
      {/* Sidebar - Conversations List */}
      <Box sx={{ 
        width: 400, 
        bgcolor: 'white', 
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h5" fontWeight="bold">
            Chats
          </Typography>
          <Box>
            <IconButton size="small" onClick={handleOpenNewConversation}>
              <AddIcon />
            </IconButton>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: '#f5f5f5' }
            }}
          />
        </Box>

        {/* Conversations List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List sx={{ p: 0 }}>
            {filteredConversations && Array.isArray(filteredConversations) && filteredConversations.map((conversation) => (
              <ListItem
                key={conversation.conversationId}
                button
                onClick={() => {
                  console.log('=== CONVERSATION CLICKED ===');
                  console.log('Conversation clicked:', conversation);
                  console.log('Other user ID:', conversation.otherUser?._id);
                  console.log('About to call fetchMessages with ID:', conversation.otherUser?._id);
                  if (conversation.otherUser?._id) {
                    // Set the timestamp for "new messages" line based on unread count
                    // If there are unread messages, set timestamp to show them as new
                    if (conversation.unreadCount > 0) {
                      // Set to a time before the last message to show unread messages as new
                      const lastMessageTime = conversation.lastMessage?.createdAt;
                      if (lastMessageTime) {
                        setLastReadTimestamp(moment(lastMessageTime).subtract(1, 'hour'));
                      } else {
                        setLastReadTimestamp(moment().subtract(1, 'day'));
                      }
                    } else {
                      // No unread messages, set to current time
                      setLastReadTimestamp(moment());
                    }
                    fetchMessages(conversation.otherUser._id);
                  } else {
                    console.error('No other user ID found in conversation:', conversation);
                  }
                }}
                selected={selectedConversation?.otherUser?._id === conversation.otherUser?._id || selectedConversation?._id === conversation.otherUser?._id}
                sx={{
                  '&:hover': { bgcolor: '#f5f5f5' },
                  '&.Mui-selected': { bgcolor: '#e3f2fd' },
                  py: 1.5
                }}
              >

                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#1976d2', width: 50, height: 50 }}>
                      {conversation.otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="500">
                        {conversation.otherUser?.name || 'Unknown User'}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {conversation.lastMessage?.createdAt ? moment(conversation.lastMessage.createdAt).format('DD/MM/YYYY') : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                          {conversation.lastMessage?.createdAt ? moment(conversation.lastMessage.createdAt).format('HH:mm') : ''}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        noWrap 
                        sx={{ maxWidth: '200px' }}
                      >
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </Typography>
                      {conversation.unreadCount > 0 && (
                        <Badge 
                          badgeContent={conversation.unreadCount} 
                          color="primary" 
                          sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          {filteredConversations.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No conversations found
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'white', 
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    mr: 2, 
                    bgcolor: '#1976d2',
                    fontSize: '1rem'
                  }}
                >
                  {(selectedConversation?.otherUser?.name || conversations.find(c => c.otherUser?._id === selectedConversation._id)?.otherUser?.name || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="500">
                    {selectedConversation?.otherUser?.name || conversations.find(c => c.otherUser?._id === selectedConversation._id)?.otherUser?.name || 'Unknown User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Online
                  </Typography>
                </Box>
              </Box>
              <Box>
                <IconButton onClick={() => setShowMessageSearch(!showMessageSearch)}>
                  <SearchIcon />
                </IconButton>
                <IconButton>
                  <PhoneIcon />
                </IconButton>
                <IconButton>
                  <VideoCallIcon />
                </IconButton>
                <IconButton>
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Message Search */}
            {showMessageSearch && (
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#f8f9fa' }}>
                <TextField
                  fullWidth
                  placeholder="Search messages..."
                  value={messageSearchTerm}
                  onChange={(e) => setMessageSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            )}

            {/* Messages Area */}
            <Box 
              ref={messagesContainerRef}
              sx={{ 
                flex: 1, 
                p: 2, 
                overflow: 'auto',
                bgcolor: '#f5f5f5',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="a" patternUnits="userSpaceOnUse" width="100" height="100"%3E%3Cpath d="M0 0h100v100H0z" fill="%23e5ddd5"/%3E%3Cpath d="M20 20h60v60H20z" fill="none" stroke="%23d1c7b7" stroke-width="0.5" opacity="0.1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23a)"/%3E%3C/svg%3E")',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
              {(() => {
                console.log('Rendering messages:', messages, 'Array?', Array.isArray(messages), 'Length:', messages?.length);
                return messages && Array.isArray(messages) && messages
                  .filter(message => 
                    !messageSearchTerm || 
                    message.content?.toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
                    message.fileName?.toLowerCase().includes(messageSearchTerm.toLowerCase())
                  )
                  .map((message, index) => {
                const isOwn = message.sender?._id === user.id;
                const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender?._id !== message.sender?._id);
                const showTimestamp = index === 0 || 
                  !moment(message.createdAt).isSame(moment(messages[index - 1]?.createdAt), 'day');
                
                // Debug logging for reply functionality
                if (message.replyTo) {
                  console.log('Message with reply found:', {
                    messageId: message._id,
                    content: message.content,
                    replyTo: message.replyTo,
                    replyToContent: message.replyTo?.content,
                    replyToSender: message.replyTo?.sender
                  });
                }
                
                // Check if this is the first new message (only for received messages, not sent)
                const isFirstNewMessage = lastReadTimestamp && 
                  moment(message.createdAt).isAfter(lastReadTimestamp) &&
                  !isOwn && // Only show for received messages, not sent messages
                  (index === 0 || !moment(messages[index - 1]?.createdAt).isAfter(lastReadTimestamp));
                
                return (
                  <React.Fragment key={message._id}>
                    {/* New Messages separator */}
                    {isFirstNewMessage && (
                      <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                        <Box sx={{ flex: 1, height: '1px', bgcolor: '#e74c3c' }} />
                        <Chip 
                          label="New Messages" 
                          size="small" 
                          sx={{ 
                            mx: 2,
                            bgcolor: '#e74c3c', 
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }} 
                        />
                        <Box sx={{ flex: 1, height: '1px', bgcolor: '#e74c3c' }} />
                      </Box>
                    )}
                    
                    {/* Timestamp separator */}
                    {showTimestamp && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <Chip 
                          label={formatMessageTime(message.createdAt)} 
                          size="small" 
                          sx={{ 
                            bgcolor: 'rgba(0,0,0,0.1)', 
                            color: 'text.secondary',
                            fontSize: '0.7rem'
                          }} 
                        />
                      </Box>
                    )}
                    
                    <Box
                      onMouseEnter={() => handleMessageHover(message._id)}
                      onMouseLeave={handleMessageLeave}
                      onTouchStart={() => handleTouchStart(message._id)}
                      onTouchEnd={handleTouchEnd}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        mb: 0.5,
                        alignItems: 'flex-end',
                        position: 'relative',
                        px: 1
                      }}
                    >
                      {/* Avatar removed for cleaner message display */}
                      
                      {/* Message bubble */}
                      <Box sx={{ maxWidth: '70%', position: 'relative', zIndex: 1, mb: 1 }} id={`message-${message._id}`}>
                        <Paper
                          onMouseEnter={() => setHoveredMessage(message._id)}
                          onMouseLeave={() => {
                            if (showReactionPicker !== message._id) {
                              setHoveredMessage(null);
                            }
                          }}
                          onTouchStart={(e) => handleTouchStart(e, message)}
                          onTouchEnd={handleTouchEnd}
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                          sx={{
                            p: 1.5,
                            bgcolor: isOwn ? '#e6f3ff' : 'white',
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            position: 'relative',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }
                          }}
                        >
                          {/* Reply indicator - nested bubble */}
                          {message.replyTo && (
                            <Paper
                              data-testid="reply-bubble"
                              sx={{
                                mb: 1.5,
                                p: 1.5,
                                bgcolor: isOwn ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0,0,0,0.03)',
                                borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                borderLeft: '3px solid #1976d2',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                border: '1px solid rgba(25, 118, 210, 0.12)'
                              }}
                              onClick={() => {
                                const repliedElement = document.getElementById(`message-${message.replyTo._id}`);
                                if (repliedElement) {
                                  repliedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <ReplyIcon sx={{ fontSize: '0.875rem', mr: 0.5, color: '#1976d2' }} />
                                <Typography variant="caption" color="#1976d2" fontWeight="600">
                                  {message.replyTo.sender?.name || 'Unknown'}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                color={isOwn ? 'rgba(25, 118, 210, 0.8)' : 'text.secondary'}
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {message.replyTo.content || 'File attachment'}
                              </Typography>
                            </Paper>
                          )}
                          
                          {/* Message content */}
                          {message.fileUrl ? (
                            <Box>
                              {message.content && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word', mb: 1 }}>
                                  {message.content}
                                </Typography>
                              )}
                              
                              {/* File attachment */}
                              {message.mimeType?.startsWith('image/') ? (
                                <Box
                                  component="img"
                                  src={message.fileUrl}
                                  alt={message.fileName}
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: 300,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    '&:hover': { opacity: 0.9 }
                                  }}
                                  onClick={() => window.open(message.fileUrl, '_blank')}
                                />
                              ) : message.mimeType?.startsWith('video/') ? (
                                <Box
                                  component="video"
                                  controls
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: 300,
                                    borderRadius: 2
                                  }}
                                >
                                  <source src={message.fileUrl} type={message.mimeType} />
                                  Your browser does not support the video tag.
                                </Box>
                              ) : message.mimeType?.startsWith('audio/') ? (
                                <Box
                                  component="audio"
                                  controls
                                  sx={{ width: '100%', mt: 1 }}
                                >
                                  <source src={message.fileUrl} type={message.mimeType} />
                                  Your browser does not support the audio tag.
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: 2,
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                                  }}
                                  onClick={() => handleDocumentPreview(message.fileUrl, message.fileName)}
                                >
                                  <AttachIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight="500">
                                      {message.fileName}
                                    </Typography>
                                    {message.fileSize && (
                                      <Typography variant="caption" color="text.secondary">
                                        {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', color: isOwn ? '#1a365d' : 'inherit' }}>
                              {message.content}
                            </Typography>
                          )}
                          
                          {/* Gig Application Component */}
                          {message.messageType === 'gig_application' && message.gigApplication && (
                            <Card 
                              sx={{ 
                                mt: 2, 
                                bgcolor: 'rgba(26, 54, 93, 0.05)',
                                border: '1px solid rgba(26, 54, 93, 0.2)',
                                borderRadius: 2
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                  <MusicNoteIcon sx={{ color: '#1a365d', mr: 1, fontSize: '1.25rem' }} />
                                  <Typography variant="subtitle2" fontWeight="bold" color="#1a365d">
                                    Gig Application
                                  </Typography>
                                </Box>
                                
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5, color: '#1a365d' }}>
                                  {message.gigApplication.gigTitle}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                   <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                     <LocationOnIcon sx={{ color: '#1a365d', mr: 1, fontSize: '1rem' }} />
                                     <Typography variant="body2" color="text.secondary">
                                       {message.gigApplication.gigVenue}
                                     </Typography>
                                   </Box>
                                   
                                   <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                     <CalendarTodayIcon sx={{ color: '#1a365d', mr: 1, fontSize: '1rem' }} />
                                     <Typography variant="body2" color="text.secondary">
                                       {moment(message.gigApplication.gigDate).format('MMMM Do, YYYY')}
                                     </Typography>
                                   </Box>
                                   
                                   <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                     <PaymentIcon sx={{ color: '#1a365d', mr: 1, fontSize: '1rem' }} />
                                     <Typography variant="body2" color="text.secondary">
                                       {formatPayment(message.gigApplication.gigPayment)}
                                     </Typography>
                                   </Box>
                                   
                                   {/* Instruments */}
                                   {message.gigApplication.gigInstruments && message.gigApplication.gigInstruments.length > 0 && (
                                     <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                       <MusicNoteIcon sx={{ color: '#1a365d', mr: 1, fontSize: '1rem', mt: 0.25 }} />
                                       <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                         {message.gigApplication.gigInstruments.map((instrument, index) => (
                                           <Chip
                                             key={index}
                                             label={instrument}
                                             size="small"
                                             sx={{
                                               bgcolor: 'rgba(26, 54, 93, 0.1)',
                                               color: '#1a365d',
                                               fontSize: '0.75rem',
                                               height: 24
                                             }}
                                           />
                                         ))}
                                       </Box>
                                     </Box>
                                   )}
                                   
                                   {/* Genres */}
                                   {message.gigApplication.gigGenres && message.gigApplication.gigGenres.length > 0 && (
                                     <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                       <Typography variant="body2" sx={{ color: '#1a365d', mr: 1, fontSize: '0.875rem', fontWeight: 'bold', mt: 0.25 }}>
                                         Genres:
                                       </Typography>
                                       <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                         {message.gigApplication.gigGenres.map((genre, index) => (
                                           <Chip
                                             key={index}
                                             label={genre}
                                             size="small"
                                             variant="outlined"
                                             sx={{
                                               borderColor: '#1a365d',
                                               color: '#1a365d',
                                               fontSize: '0.75rem',
                                               height: 24
                                             }}
                                           />
                                         ))}
                                       </Box>
                                     </Box>
                                   )}
                                 </Box>
                                
                                <Divider sx={{ my: 1.5 }} />
                                
                                <Button
                                  component={Link}
                                  to={`/gigs/${message.gigApplication.gigId}`}
                                  variant="outlined"
                                  size="small"
                                  endIcon={<OpenInNewIcon sx={{ fontSize: '1rem' }} />}
                                  sx={{
                                    borderColor: '#1a365d',
                                    color: '#1a365d',
                                    '&:hover': {
                                      borderColor: '#2c5282',
                                      bgcolor: 'rgba(26, 54, 93, 0.05)'
                                    }
                                  }}
                                >
                                  View Gig Details
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                          
                          {/* Message reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <Chip
                                  key={emoji}
                                  label={`${emoji} ${count}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                                  }}
                                  onClick={() => handleEmojiReaction(message._id, emoji)}
                                />
                              ))}
                            </Box>
                          )}
                          
                          {/* Message time and status */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mt: 0.5 
                          }}>
                            <Typography 
                              variant="caption" 
                              color={isOwn ? "rgba(26,54,93,0.7)" : "text.secondary"}
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {moment(message.createdAt).format('HH:mm')}
                            </Typography>
                            
                            {/* Message status for sent messages */}
                            {isOwn && (
                              <Box sx={{ ml: 1 }}>
                                {getMessageStatusIcon(message)}
                              </Box>
                            )}
                          </Box>
                        </Paper>
                        
                        {/* Floating reaction and reply buttons - positioned next to bubble */}
                        {hoveredMessage === message._id && (
                          <Box
                            onMouseEnter={() => setHoveredMessage(message._id)}
                            onMouseLeave={() => {
                              if (showReactionPicker !== message._id) {
                                setHoveredMessage(null);
                              }
                            }}
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              right: isOwn ? 'auto' : -80,
                              left: isOwn ? -80 : 'auto',
                              display: 'flex',
                              flexDirection: isOwn ? 'row' : 'row-reverse',
                              alignItems: 'center',
                              gap: 0.5,
                              zIndex: 1000
                            }}
                          >
                            {/* Emoji face button - closest to bubble */}
                            <Fade in={true} timeout={200}>
                              <IconButton
                                size="small"
                                onMouseEnter={() => {
                                  setShowReactionPicker(message._id);
                                  setHoveredMessage(message._id);
                                }}
                                onMouseLeave={() => {
                                  // Keep buttons visible when moving to emoji picker
                                }}
                                sx={{
                                  bgcolor: 'white',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                <EmojiIcon fontSize="small" />
                              </IconButton>
                            </Fade>
                            
                            {/* Reply button */}
                            <Fade in={true} timeout={300}>
                              <IconButton
                                size="small"
                                onClick={() => handleReplyToMessage(message)}
                                sx={{
                                  bgcolor: 'white',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                <ReplyIcon fontSize="small" />
                              </IconButton>
                            </Fade>
                            
                            {/* Emoji picker - appears when hovering emoji face */}
                            {showReactionPicker === message._id && (
                              <Fade in={true} timeout={200}>
                                <Box
                                  onMouseEnter={() => {
                                    setShowReactionPicker(message._id);
                                    setHoveredMessage(message._id);
                                  }}
                                  onMouseLeave={() => {
                                    setShowReactionPicker(null);
                                    setHoveredMessage(null);
                                  }}
                                  sx={{
                                    position: 'absolute',
                                    top: isOwn ? 'auto' : -5,
                                    bottom: isOwn ? -5 : 'auto',
                                    right: isOwn ? 80 : 'auto',
                                    left: isOwn ? 'auto' : 80,
                                    display: 'flex',
                                    gap: 0.5,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    p: 0.5,
                                    zIndex: 1001
                                  }}
                                >
                                  {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                    <IconButton
                                      key={emoji}
                                      size="small"
                                      onClick={() => {
                                        handleEmojiReaction(message._id, emoji);
                                        setShowReactionPicker(null);
                                      }}
                                      sx={{
                                        fontSize: '1.2rem',
                                        minWidth: 32,
                                        height: 32,
                                        '&:hover': {
                                          bgcolor: 'rgba(0,0,0,0.1)',
                                          transform: 'scale(1.2)'
                                        }
                                      }}
                                    >
                                      {emoji}
                                    </IconButton>
                                  ))}
                                </Box>
                              </Fade>
                            )}
                          </Box>
                        )}
                      </Box>
                      
                      {/* Spacer removed since avatars are no longer displayed */}
                    </Box>
                  </React.Fragment>
                );
              });
              })()}
              
              {/* Typing indicator */}
              {isTyping && (
                <Fade in={isTyping}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    {/* Avatar removed from typing indicator */}
                    <Paper sx={{
                      p: 1.5,
                      bgcolor: '#f0f0f0',
                      borderRadius: '18px 18px 18px 4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: '#999',
                          animation: 'typing 1.4s infinite ease-in-out'
                        }} />
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: '#999',
                          animation: 'typing 1.4s infinite ease-in-out 0.2s'
                        }} />
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: '#999',
                          animation: 'typing 1.4s infinite ease-in-out 0.4s'
                        }} />
                      </Box>
                    </Paper>
                  </Box>
                </Fade>
              )}
              
              <div ref={messagesEndRef} />
            </Box>

            {/* File Preview */}
            {selectedFile && (
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                {filePreview ? (
                  <Box
                    component="img"
                    src={filePreview}
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Box sx={{
                    width: 60,
                    height: 60,
                    bgcolor: '#ddd',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AttachIcon />
                  </Box>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="500">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <IconButton size="small" onClick={clearSelectedFile}>
                  <Typography>×</Typography>
                </IconButton>
              </Box>
            )}

            {/* Reply indicator */}
            {replyToMessage && (
              <Box sx={{
                p: 2,
                bgcolor: '#f0f8ff',
                borderTop: '1px solid #e0e0e0',
                borderLeft: '4px solid #1976d2',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2
              }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ReplyIcon sx={{ fontSize: '1rem', mr: 0.5, color: '#1976d2' }} />
                    <Typography variant="caption" color="primary" fontWeight="600">
                      Replying to {replyToMessage.sender?.name || 'Unknown'}
                    </Typography>
                  </Box>
                  
                  {/* Message preview bubble */}
                  <Paper sx={{
                    p: 1.5,
                    bgcolor: 'white',
                    borderRadius: '12px',
                    border: '1px solid rgba(25, 118, 210, 0.2)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    maxWidth: '400px'
                  }}>
                    {replyToMessage.content && (
                       <Typography variant="body2" color="text.primary" sx={{
                         display: '-webkit-box',
                         WebkitLineClamp: 3,
                         WebkitBoxOrient: 'vertical',
                         overflow: 'hidden',
                         lineHeight: 1.4
                       }}>
                         {replyToMessage.content}
                       </Typography>
                     )}
                    
                    {replyToMessage.fileName && (
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <AttachIcon sx={{ fontSize: '1rem', color: '#666' }} />
                         <Typography variant="body2" color="text.primary">
                           {replyToMessage.fileName}
                         </Typography>
                       </Box>
                     )}
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {moment(replyToMessage.createdAt).format('MMM D, HH:mm')}
                    </Typography>
                  </Paper>
                </Box>
                
                <IconButton size="small" onClick={clearReply} sx={{ mt: 0.5 }}>
                  <Typography sx={{ fontSize: '1.2rem', color: '#666' }}>×</Typography>
                </IconButton>
              </Box>
            )}

            {/* Message Input */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'white', 
              borderTop: replyToMessage ? 'none' : '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1
            }}>
              <IconButton 
                size="small"
                sx={{ mb: 0.5, color: '#666' }}
                component="label"
              >
                <AttachIcon />
                <input
                  type="file"
                  hidden
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                />
              </IconButton>
              
              <TextField
                ref={messageInputRef}
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageEnhanced();
                  }
                }}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#f5f5f5',
                    '& fieldset': {
                      border: 'none'
                    }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small"
                        sx={{ color: '#666' }}
                        onClick={(e) => {
                          setEmojiMenuAnchor(e.currentTarget);
                          setSelectedMessageForReaction(null);
                        }}
                      >
                        <EmojiIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <IconButton 
                onClick={sendMessageEnhanced}
                disabled={(!newMessage.trim() && !selectedFile) || sending}
                sx={{ 
                  bgcolor: (newMessage.trim() || selectedFile) ? '#1976d2' : '#ccc',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: (newMessage.trim() || selectedFile) ? '#1565c0' : '#ccc'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {sending || uploading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              </IconButton>
            </Box>
          </>
        ) : (
          /* Welcome Screen */
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="text.secondary" gutterBottom>
                Welcome to GigLink Messages
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Select a conversation to start messaging
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Error Snackbar */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
        >
          {error}
        </Alert>
      )}

      {/* New Conversation Dialog */}
      <Dialog 
        open={showNewConversationDialog} 
        onClose={() => setShowNewConversationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start New Conversation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a user to start a new conversation
          </Typography>
          {loadingLinks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {connectedLinks.map((user) => (
                <ListItem 
                  key={user._id} 
                  button 
                  onClick={() => {
                    startConversation(user._id);
                    setShowNewConversationDialog(false);
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>{user.name?.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={user.name} 
                    secondary={user.email}
                  />
                </ListItem>
              ))}
              {connectedLinks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No connected users found
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewConversationDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Message Context Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => {
          setMessageMenuAnchor(null);
          setSelectedMessageForMenu(null);
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={() => {
            setSelectedMessageForReaction(selectedMessageForMenu);
            setEmojiMenuAnchor(messageMenuAnchor);
            setMessageMenuAnchor(null);
          }}
        >
          <EmojiIcon sx={{ mr: 1 }} /> React
        </MenuItem>
        <MenuItem onClick={() => {
          handleReplyToMessage(selectedMessageForMenu);
          setMessageMenuAnchor(null);
          setSelectedMessageForMenu(null);
        }}>
          <ReplyIcon sx={{ mr: 1 }} /> Reply
        </MenuItem>
      </Menu>

      {/* Emoji Picker Menu */}
      <Menu
        anchorEl={emojiMenuAnchor}
        open={Boolean(emojiMenuAnchor)}
        onClose={() => {
          setEmojiMenuAnchor(null);
          setSelectedMessageForReaction(null);
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'].map((emoji) => (
          <MenuItem 
            key={emoji}
            onClick={() => {
              if (selectedMessageForReaction) {
                handleEmojiReaction(selectedMessageForReaction._id, emoji);
              } else {
                setNewMessage(prev => prev + emoji);
                setEmojiMenuAnchor(null);
              }
            }}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            <Typography variant="h6">{emoji}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* CSS for typing animation */}
      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
            }
            30% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>

    </Box>
  );
};

export default Messages;