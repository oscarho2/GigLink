import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Badge,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Group as GroupIcon,
  Add as AddIcon,
  Info as InfoIcon,
  ExitToApp as ExitToAppIcon,
  People as PeopleIcon,
  Favorite as FavoriteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';
import GroupManagement from '../components/GroupManagement';

const Messages = () => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [groups, setGroups] = useState([]);
  const [links, setLinks] = useState([]);
  const [showLinksOnly, setShowLinksOnly] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const firstUnreadRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Instant scroll to bottom without animation
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Scroll to first unread message
  const scrollToFirstUnread = () => {
    if (firstUnreadRef.current && messagesContainerRef.current) {
      firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Fetch links
  const fetchLinks = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await axios.get('/api/links/links', {
        headers: { 'x-auth-token': token }
      });
      setLinks(res.data.map(link => link._id));
    } catch (err) {
      console.error('Error fetching links:', err);
    }
  }, [token]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user || !token) return;
    
    try {
      setLoading(true);
      const config = {
        headers: { 'x-auth-token': token }
      };
      
      const res = await axios.get('/api/messages/conversations', config);
      setConversations(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversation) => {
    if (!conversation || !token) return;
    
    try {
      if (conversation.isGroup) {
        // Mark group messages as read
        await axios.put(`/api/messages/mark-read-group/${conversation.groupId}`, {}, {
          headers: { 'x-auth-token': token }
        });
      } else {
        // Mark direct messages as read
        await axios.put(`/api/messages/mark-read/${conversation.user._id}`, {}, {
          headers: { 'x-auth-token': token }
        });
      }
      
      // Update local state to mark messages as read
      setMessages(prev => prev.map(msg => 
        (conversation.isGroup || msg.recipient?._id === user.id) ? { ...msg, read: true } : msg
      ));
      
      // Clear first unread message ID
      setFirstUnreadMessageId(null);
      
      // Update conversations to reflect read status
      fetchConversations();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [token, user.id, fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversation, pageNum = 1, append = false) => {
    if (!conversation || !token) return;
    
    try {
      if (!append) {
        setMessages([]);
        setFirstUnreadMessageId(null);
      } else {
        setLoadingMoreMessages(true);
      }
      
      const config = {
        headers: { 'x-auth-token': token },
        params: { page: pageNum, limit: 50 }
      };
      
      let res;
      if (conversation.isGroup) {
        res = await axios.get(`/api/messages/group/${conversation.groupId}`, config);
      } else {
        res = await axios.get(`/api/messages/conversation/${conversation.user._id}`, config);
      }
      
      const { messages: newMessages, pagination } = res.data;
      
      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        
        // Find first unread message (that's not sent by current user)
        const firstUnread = newMessages.find(msg => {
          if (conversation.isGroup) {
            return !msg.read && msg.sender._id !== user.id;
          } else {
            return !msg.read && msg.recipient?._id === user.id;
          }
        });
        if (firstUnread) {
          setFirstUnreadMessageId(firstUnread._id);
        }
      }
      
      setHasMoreMessages(pagination?.hasMore || false);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      if (append) {
        setLoadingMoreMessages(false);
      }
    }
  }, [token, user.id]);

  // Load initial data
  useEffect(() => {
    fetchConversations();
    fetchLinks();
  }, [fetchConversations, fetchLinks]);

  // Auto-select the most recent conversation when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      if (firstUnreadMessageId) {
        // Scroll to first unread message
        setTimeout(() => scrollToFirstUnread(), 100);
      } else {
        // Scroll to bottom if no unread messages
        scrollToBottom();
      }
    }
  }, [messages, firstUnreadMessageId]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation && messages.length > 0 && firstUnreadMessageId) {
      // Mark messages as read after a short delay to ensure user sees them
      const timer = setTimeout(() => {
        markMessagesAsRead(selectedConversation.user._id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedConversation, messages, firstUnreadMessageId, markMessagesAsRead]);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please select an image, document, or archive file.');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };
  
  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
  };
  
  // Upload file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-auth-token': token
      }
    };
    
    const res = await axios.post('/api/upload', formData, config);
    return res.data;
  };
  
  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      setUploadingFile(!!selectedFile);
      
      let messageData = {
        messageType: selectedFile ? 'file' : 'text'
      };
      
      // Set recipient or groupId based on conversation type
      if (selectedConversation.isGroup) {
        messageData.groupId = selectedConversation.groupId;
      } else {
        messageData.recipient = selectedConversation.user._id;
      }
      
      // Handle file upload
      if (selectedFile) {
        const uploadedFile = await uploadFile(selectedFile);
        messageData.attachment = uploadedFile;
        if (newMessage.trim()) {
          messageData.content = newMessage.trim();
        }
      } else {
        messageData.content = newMessage.trim();
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      };
      
      const res = await axios.post('/api/messages', messageData, config);
      
      // Add new message to the list
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setSelectedFile(null);
      
      // Scroll to bottom to show the new message
      scrollToBottom();
      
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
      setUploadingFile(false);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    setPage(1);
    fetchMessages(conversation);
  };

  // Load more messages
  const loadMoreMessages = () => {
    if (selectedConversation && hasMoreMessages && !loadingMoreMessages) {
      fetchMessages(selectedConversation, page + 1, true);
    }
  };

  // Handle group creation
  const handleGroupCreated = (newGroup) => {
    fetchConversations(); // Refresh conversations to include new group
    setShowGroupManagement(false);
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    try {
      const config = {
        headers: { 'x-auth-token': token }
      };
      
      await axios.delete(`/api/messages/${messageId}`, config);
      
      // Update messages list
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, content: 'This message has been deleted', isDeleted: true }
          : msg
      ));
      
      setAnchorEl(null);
      setSelectedMessageId(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message.');
    }
  };

  // Filter conversations based on search and link status
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const matchesSearch = conv.isGroup 
      ? conv.groupName.toLowerCase().includes(searchTerm.toLowerCase())
      : conv.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Link filter (only apply to direct messages, not groups)
    if (showLinksOnly && !conv.isGroup) {
      return links.includes(conv.user._id);
    }
    
    return true;
  });

  // Format message time
  const formatMessageTime = (timestamp) => {
    const messageTime = moment(timestamp);
    const now = moment();
    
    if (now.diff(messageTime, 'days') === 0) {
      return messageTime.format('HH:mm');
    } else if (now.diff(messageTime, 'days') === 1) {
      return 'Yesterday';
    } else if (now.diff(messageTime, 'days') < 7) {
      return messageTime.format('dddd');
    } else {
      return messageTime.format('MMM DD');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 1, sm: 4 },
        px: { xs: 1, sm: 3 }
      }}
    >
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.75rem', sm: '2.125rem' },
          px: { xs: 1, sm: 0 }
        }}
      >
        Messages
      </Typography>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            mx: { xs: 1, sm: 0 },
            fontSize: { xs: '0.875rem', sm: '0.875rem' }
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Paper 
        elevation={3} 
        sx={{ 
          height: { xs: 'calc(100vh - 120px)', sm: '75vh' },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          mx: { xs: 1, sm: 0 }
        }}
      >
        {/* Conversations Sidebar */}
        <Box 
          sx={{ 
            width: { xs: '100%', md: 350 },
            height: { xs: '40%', md: 'auto' },
            borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
            borderBottom: { xs: '1px solid #e0e0e0', md: 'none' },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Search Bar and Create Group */}
          <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: { xs: 44, sm: 40 },
                    fontSize: { xs: '1rem', sm: '0.875rem' }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: { xs: '1.25rem', sm: '1rem' } }} />
                    </InputAdornment>
                  )
                }}
              />
              <IconButton
                onClick={() => setShowGroupManagement(true)}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 }
                }}
                title="Create Group"
              >
                <AddIcon sx={{ fontSize: { xs: '1.25rem', sm: '1rem' } }} />
              </IconButton>
            </Box>
            
            {/* Links Filter Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <ToggleButtonGroup
                value={showLinksOnly ? 'links' : 'all'}
                exclusive
                onChange={(e, newValue) => setShowLinksOnly(newValue === 'links')}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.5, sm: 0.75 }
                  }
                }}
              >
                <ToggleButton value="all">
                  <PeopleIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                  All
                </ToggleButton>
                <ToggleButton value="links">
                  <FavoriteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                  Links Only
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
          
          {/* Conversations List */}
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {filteredConversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  {searchTerm ? 'No conversations found' : 'No conversations yet'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {searchTerm ? 'Try a different search term' : 'Start a conversation by applying to a gig'}
                </Typography>
              </Box>
            ) : (
              filteredConversations.map((conversation) => (
                <ListItem
                  key={conversation._id}
                  button
                  selected={selectedConversation && (
                    conversation.isGroup 
                      ? conversation.groupId === selectedConversation.groupId
                      : conversation.user._id === selectedConversation.user._id
                  )}
                  onClick={() => handleConversationSelect(conversation)}
                  sx={{
                    borderBottom: '1px solid #f5f5f5',
                    py: { xs: 1.5, sm: 1 },
                    px: { xs: 2, sm: 2 },
                    minHeight: { xs: 72, sm: 64 },
                    '&:hover': { bgcolor: 'grey.50' },
                    '&.Mui-selected': { bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.light' } }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unreadCount}
                      color="error"
                      invisible={conversation.unreadCount === 0}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' },
                          minWidth: { xs: 20, sm: 20 },
                          height: { xs: 20, sm: 20 }
                        }
                      }}
                    >
                      <Avatar 
                        src={conversation.isGroup ? conversation.groupAvatar : conversation.user.avatar}
                        sx={{
                          width: { xs: 48, sm: 40 },
                          height: { xs: 48, sm: 40 },
                          fontSize: { xs: '1.25rem', sm: '1rem' },
                          bgcolor: conversation.isGroup ? 'primary.main' : 'grey.400'
                        }}
                      >
                        {conversation.isGroup 
                          ? <GroupIcon sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                          : conversation.user.name.charAt(0).toUpperCase()
                        }
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: conversation.unreadCount > 0 ? 600 : 400,
                              fontSize: { xs: '1rem', sm: '0.875rem' },
                              color: conversation.unreadCount > 0 ? 'text.primary' : 'text.secondary'
                            }}
                          >
                            {conversation.isGroup ? conversation.groupName : conversation.user.name}
                          </Typography>
                          {!conversation.isGroup && links.includes(conversation.user._id) && (
                            <Tooltip title="Link">
                              <FavoriteIcon 
                                sx={{ 
                                  fontSize: { xs: '0.875rem', sm: '0.75rem' }, 
                                  color: 'error.main',
                                  ml: 0.5
                                }} 
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography 
                          variant="caption" 
                          color="textSecondary"
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.75rem' },
                            lineHeight: { xs: 1.2, sm: 1.66 }
                          }}
                        >
                          {formatMessageTime(conversation.lastMessage.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            fontWeight: conversation.unreadCount > 0 ? 500 : 400,
                            fontSize: { xs: '0.875rem', sm: '0.875rem' },
                            lineHeight: { xs: 1.3, sm: 1.43 }
                          }}
                        >
                          {conversation.lastMessage.sender._id === user.id 
                            ? 'You: ' 
                            : conversation.isGroup 
                              ? `${conversation.lastMessage.sender.name}: `
                              : ''
                          }
                          {conversation.lastMessage.content}
                        </Typography>
                        {conversation.lastMessage.messageType === 'gig_application' && (
                          <Chip 
                            label="Gig" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{
                              fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>
        
        {/* Message Thread */}
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            height: { xs: '60%', md: 'auto' }
          }}
        >
          {selectedConversation ? (
            <>
              {/* Message Header */}
              <Box 
                sx={{ 
                  p: { xs: 1.5, sm: 2 }, 
                  borderBottom: '1px solid #e0e0e0', 
                  bgcolor: 'grey.50',
                  minHeight: { xs: 60, sm: 'auto' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={selectedConversation.isGroup ? selectedConversation.groupAvatar : selectedConversation.user.avatar} 
                      sx={{ 
                        mr: { xs: 1.5, sm: 2 },
                        width: { xs: 40, sm: 40 },
                        height: { xs: 40, sm: 40 },
                        fontSize: { xs: '1rem', sm: '1rem' },
                        bgcolor: selectedConversation.isGroup ? 'primary.main' : 'grey.400'
                      }}
                    >
                      {selectedConversation.isGroup 
                        ? <GroupIcon sx={{ fontSize: '1.25rem' }} />
                        : selectedConversation.user.name.charAt(0).toUpperCase()
                      }
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h6"
                        sx={{
                          fontSize: { xs: '1.125rem', sm: '1.25rem' },
                          fontWeight: 500
                        }}
                      >
                        {selectedConversation.isGroup ? selectedConversation.groupName : selectedConversation.user.name}
                      </Typography>
                      {selectedConversation.isGroup && (
                        <Typography 
                          variant="caption" 
                          color="textSecondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}
                        >
                          {selectedConversation.memberCount} members
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {selectedConversation.isGroup && (
                    <IconButton
                      size="small"
                      sx={{ color: 'text.secondary' }}
                      title="Group Info"
                    >
                      <InfoIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
              
              {/* Messages */}
              <Box 
                ref={messagesContainerRef}
                sx={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  p: { xs: 1, sm: 2 }, 
                  display: 'flex', 
                  flexDirection: 'column',
                  scrollBehavior: 'auto'
                }}
              >
                {hasMoreMessages && (
                  <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <Button
                      onClick={loadMoreMessages}
                      disabled={loadingMoreMessages}
                      size="small"
                      sx={{
                        minHeight: { xs: 40, sm: 32 },
                        fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                        px: { xs: 2, sm: 1.5 },
                        py: { xs: 1, sm: 0.5 }
                      }}
                    >
                      {loadingMoreMessages ? <CircularProgress size={20} /> : 'Load older messages'}
                    </Button>
                  </Box>
                )}
                
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender._id === user.id;
                  const isFirstUnread = message._id === firstUnreadMessageId;
                  
                  return (
                    <React.Fragment key={message._id}>
                      {/* Unread messages separator */}
                      {isFirstUnread && (
                        <Box
                          ref={firstUnreadRef}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            my: 2,
                            '&::before, &::after': {
                              content: '""',
                              flex: 1,
                              height: '1px',
                              backgroundColor: 'error.main'
                            }
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              px: 2,
                              py: 0.5,
                              backgroundColor: 'error.main',
                              color: 'white',
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          >
                            New messages
                          </Typography>
                        </Box>
                      )}
                      
                      <Box
                         sx={{
                           display: 'flex',
                           justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                           mb: { xs: 1.5, sm: 2 },
                           alignItems: 'flex-end'
                         }}
                       >
                         <Box sx={{ maxWidth: { xs: '80%', sm: '70%' } }}>
                        <Paper
                          elevation={1}
                          sx={{
                            p: { xs: 1.5, sm: 2 },
                            pr: isOwnMessage ? { xs: 5, sm: 6 } : { xs: 1.5, sm: 2 },
                            bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                            color: isOwnMessage ? 'white' : 'text.primary',
                            borderRadius: { xs: 1.5, sm: 2 },
                            position: 'relative'
                          }}
                        >
                          {/* File Attachment */}
                          {message.messageType === 'file' && message.attachment && (
                            <Box sx={{ mb: message.content ? 1 : 0 }}>
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  p: 1,
                                  bgcolor: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                  borderRadius: 1,
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  // Open file in new tab
                                  window.open(message.attachment.url, '_blank');
                                }}
                              >
                                <FileIcon sx={{ fontSize: 20 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 500,
                                      fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {message.attachment.originalName}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      opacity: 0.8,
                                      fontSize: { xs: '0.6875rem', sm: '0.75rem' }
                                    }}
                                  >
                                    {(message.attachment.size / 1024 / 1024).toFixed(2)} MB
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Text Content */}
                          {message.content && (
                            <Typography 
                              variant="body1"
                              sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                lineHeight: { xs: 1.4, sm: 1.5 }
                              }}
                            >
                              {message.content}
                            </Typography>
                          )}
                          
                          {isOwnMessage && (
                            <IconButton
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: { xs: 2, sm: 4 }, 
                                right: { xs: 2, sm: 4 }, 
                                color: 'inherit',
                                minWidth: { xs: 32, sm: 'auto' },
                                minHeight: { xs: 32, sm: 'auto' },
                                p: { xs: 1, sm: 0.5 }
                              }}
                              onClick={(e) => {
                                setAnchorEl(e.currentTarget);
                                setSelectedMessageId(message._id);
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Paper>
                        
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: { xs: 0.25, sm: 0.5 },
                            textAlign: isOwnMessage ? 'right' : 'left',
                            color: 'text.secondary',
                            fontSize: { xs: '0.6875rem', sm: '0.75rem' }
                          }}
                        >
                          {moment(message.createdAt).format('MMM DD, HH:mm')}
                          {message.read && isOwnMessage && (
                            <Typography 
                              component="span" 
                              variant="caption" 
                              sx={{ 
                                ml: 1,
                                fontSize: { xs: '0.6875rem', sm: '0.75rem' }
                              }}
                            >
                              • Read
                            </Typography>
                          )}
                        </Typography>
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>
              
              {/* Message Input */}
              <Box 
                sx={{ 
                  p: { xs: 1.5, sm: 2 }, 
                  borderTop: '1px solid #e0e0e0', 
                  bgcolor: 'grey.50',
                  minHeight: { xs: 70, sm: 'auto' }
                }}
              >
                {/* File Preview */}
                {selectedFile && (
                  <Box 
                    sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      bgcolor: 'background.paper', 
                      borderRadius: 1, 
                      border: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <FileIcon color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={handleRemoveFile}
                      disabled={sendingMessage}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1 } }}>
                  <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                  />
                  <IconButton
                    component="label"
                    htmlFor="file-upload"
                    disabled={sendingMessage}
                    sx={{
                      minWidth: { xs: 44, sm: 40 },
                      minHeight: { xs: 44, sm: 40 },
                      borderRadius: { xs: 1.5, sm: 1 }
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                    variant="outlined"
                    size="small"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    multiline
                    maxRows={4}
                    disabled={sendingMessage}
                    sx={{
                      '& .MuiInputBase-root': {
                        minHeight: { xs: 44, sm: 40 },
                        fontSize: { xs: '1rem', sm: '0.875rem' },
                        padding: { xs: '8px 12px', sm: '6px 12px' }
                      },
                      '& .MuiInputBase-input': {
                        padding: 0
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !selectedFile) || sendingMessage}
                    sx={{ 
                      minWidth: { xs: 48, sm: 'auto' }, 
                      px: { xs: 1.5, sm: 2 },
                      minHeight: { xs: 44, sm: 40 },
                      borderRadius: { xs: 1.5, sm: 1 }
                    }}
                  >
                    {sendingMessage ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SendIcon />
                    )}
                  </Button>
                </Box>
                
                {uploadingFile && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="textSecondary">
                      Uploading file...
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: { xs: 2, sm: 0 }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <PersonIcon 
                  sx={{ 
                    fontSize: { xs: 48, sm: 64 }, 
                    color: 'grey.300', 
                    mb: { xs: 1.5, sm: 2 } 
                  }} 
                />
                <Typography 
                  variant="h6" 
                  color="textSecondary" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.125rem', sm: '1.25rem' }
                  }}
                >
                  Select a conversation
                </Typography>
                <Typography 
                  variant="body2" 
                  color="textSecondary"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.875rem' },
                    px: { xs: 2, sm: 0 }
                  }}
                >
                  Choose a conversation from the sidebar to start messaging
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Message Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedMessageId(null);
        }}
      >
        <MenuItem
          onClick={() => handleDeleteMessage(selectedMessageId)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Message
        </MenuItem>
      </Menu>
      
      {/* Group Management Dialog */}
      {showGroupManagement && (
        <GroupManagement
          open={showGroupManagement}
          onClose={() => setShowGroupManagement(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </Container>
  );
};

export default Messages;