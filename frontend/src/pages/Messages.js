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
  Chip
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
  Reply as ReplyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
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

  
  const messagesEndRef = useRef(null);
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
      } else {
        setSelectedConversation({ _id: otherUserId });
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
        // scrollToBottom(); // Disabled auto-scroll
      }
    });

    // Listen for message reactions
    socket.on('message_reaction', ({ messageId, reaction }) => {
      setMessages(prev => (prev || []).map(msg => {
        if (msg._id === messageId) {
          const existingReactionIndex = msg.reactions.findIndex(r => r.user === reaction.user);
          if (existingReactionIndex >= 0) {
            const updatedReactions = [...msg.reactions];
            updatedReactions[existingReactionIndex] = reaction;
            return { ...msg, reactions: updatedReactions };
          } else {
            return { ...msg, reactions: [...msg.reactions, reaction] };
          }
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

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]); // Disabled auto-scroll when messages update

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
        mimeType: fileData?.mimeType
      };

      const response = await axios.post('/api/messages/send', messagePayload, {
        headers: { 'x-auth-token': token }
      });

      const newMessageData = response.data;
      
      // Add message to local state immediately
      setMessages(prev => [...(prev || []), newMessageData]);
      
      // Clear selected file
      clearSelectedFile();
      
      // Refresh conversations to update last message
      fetchConversations();
      
      showNotification('Message sent successfully', 'success');
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
    } catch (err) {
      console.error('Error adding reaction:', err);
      showNotification('Failed to add reaction', 'error');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
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

  // Message status helpers
  const getMessageStatusIcon = (message) => {
    if (message.sender._id !== user.id) return null;
    
    if (message.read) {
      return <DoneAllIcon sx={{ fontSize: 16, color: '#4fc3f7' }} />;
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
      return messageTime.format('HH:mm');
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
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: '#f5f5f5' }}>
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
                      <Typography variant="caption" color="text.secondary">
                        {conversation.lastMessage?.createdAt ? moment(conversation.lastMessage.createdAt).format('HH:mm') : ''}
                      </Typography>
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
                <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
                  {conversations.find(c => c.otherUser?._id === selectedConversation._id)?.otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="500">
                    {conversations.find(c => c.otherUser?._id === selectedConversation._id)?.otherUser?.name || 'Unknown User'}
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
            <Box sx={{ 
              flex: 1, 
              p: 2, 
              overflow: 'auto',
              bgcolor: '#e5ddd5',
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
                  moment(message.createdAt).diff(moment(messages[index - 1]?.createdAt), 'minutes') > 5;
                
                return (
                  <React.Fragment key={message._id}>
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
                      sx={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        mb: 0.5,
                        alignItems: 'flex-end'
                      }}
                    >
                      {/* Avatar for received messages */}
                      {showAvatar && (
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1, 
                            bgcolor: '#1976d2',
                            fontSize: '0.8rem'
                          }}
                        >
                          {message.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                      )}
                      
                      {/* Message bubble */}
                      <Box sx={{ maxWidth: '70%' }}>
                        <Paper
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedMessageForMenu(message);
                            setMessageMenuAnchor(e.currentTarget);
                          }}
                          sx={{
                            p: 1.5,
                            bgcolor: isOwn ? '#dcf8c6' : 'white',
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            position: 'relative',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }
                          }}
                        >
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
                                  onClick={() => window.open(message.fileUrl, '_blank')}
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
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {message.content}
                            </Typography>
                          )}
                          
                          {/* Message reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {message.reactions.map((reaction, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${reaction.emoji} ${reaction.count || 1}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                                  }}
                                  onClick={() => handleEmojiReaction(message._id, reaction.emoji)}
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
                              color="text.secondary"
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
                      </Box>
                      
                      {/* Spacer for sent messages to align with avatar space */}
                      {isOwn && !showAvatar && (
                        <Box sx={{ width: 40 }} />
                      )}
                    </Box>
                  </React.Fragment>
                );
              });
              })()}
              
              {/* Typing indicator */}
              {isTyping && (
                <Fade in={isTyping}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: '#1976d2' }}>
                      {conversations.find(c => c.otherUser?._id === selectedConversation._id)?.otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    <Paper sx={{
                      p: 1.5,
                      bgcolor: 'white',
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

            {/* Message Input */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'white', 
              borderTop: '1px solid #e0e0e0',
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
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
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