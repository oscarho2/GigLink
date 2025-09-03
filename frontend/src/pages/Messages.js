import React, { useState, useEffect, useCallback } from 'react';
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
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';

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
  }, [user, token]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (userId, pageNum = 1, append = false) => {
    if (!userId || !token) return;
    
    try {
      if (!append) {
        setMessages([]);
      } else {
        setLoadingMoreMessages(true);
      }
      
      const config = {
        headers: { 'x-auth-token': token },
        params: { page: pageNum, limit: 50 }
      };
      
      const res = await axios.get(`/api/messages/conversation/${userId}`, config);
      const { messages: newMessages, pagination } = res.data;
      
      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      
      setHasMoreMessages(pagination.hasMore);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [token]);

  // Load initial data
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user._id);
    }
  }, [selectedConversation, fetchMessages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      };
      
      const body = {
        recipient: selectedConversation.user._id,
        content: newMessage.trim(),
        messageType: 'text'
      };
      
      const res = await axios.post('/api/messages', body, config);
      
      // Add new message to the list
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      
      // Update conversations list
      fetchConversations();
      
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    setPage(1);
  };

  // Load more messages
  const loadMoreMessages = () => {
    if (selectedConversation && hasMoreMessages && !loadingMoreMessages) {
      fetchMessages(selectedConversation.user._id, page + 1, true);
    }
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

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Messages
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ height: '75vh', display: 'flex' }}>
        {/* Conversations Sidebar */}
        <Box sx={{ width: 350, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          {/* Search Bar */}
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
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
                  selected={selectedConversation && conversation.user._id === selectedConversation.user._id}
                  onClick={() => handleConversationSelect(conversation)}
                  sx={{
                    borderBottom: '1px solid #f5f5f5',
                    '&:hover': { bgcolor: 'grey.50' },
                    '&.Mui-selected': { bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.light' } }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unreadCount}
                      color="error"
                      invisible={conversation.unreadCount === 0}
                    >
                      <Avatar src={conversation.user.avatar}>
                        {conversation.user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: conversation.unreadCount > 0 ? 600 : 400 }}>
                          {conversation.user.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatMessageTime(conversation.lastMessage.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            fontWeight: conversation.unreadCount > 0 ? 500 : 400
                          }}
                        >
                          {conversation.lastMessage.sender._id === user.id ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </Typography>
                        {conversation.lastMessage.messageType === 'gig_application' && (
                          <Chip label="Gig" size="small" color="primary" variant="outlined" />
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Message Header */}
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar src={selectedConversation.user.avatar} sx={{ mr: 2 }}>
                    {selectedConversation.user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h6">
                    {selectedConversation.user.name}
                  </Typography>
                </Box>
              </Box>
              
              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
                {hasMoreMessages && (
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Button
                      onClick={loadMoreMessages}
                      disabled={loadingMoreMessages}
                      size="small"
                    >
                      {loadingMoreMessages ? <CircularProgress size={20} /> : 'Load older messages'}
                    </Button>
                  </Box>
                )}
                
                {messages.map((message) => {
                  const isOwnMessage = message.sender._id === user.id;
                  return (
                    <Box
                      key={message._id}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        mb: 2,
                        alignItems: 'flex-end'
                      }}
                    >
                      {!isOwnMessage && (
                        <Avatar
                          src={message.sender.avatar}
                          sx={{ mr: 1, width: 32, height: 32 }}
                        >
                          {message.sender.name.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      
                      <Box sx={{ maxWidth: '70%' }}>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                            color: isOwnMessage ? 'white' : 'text.primary',
                            borderRadius: 2,
                            position: 'relative'
                          }}
                        >
                          <Typography variant="body1">
                            {message.content}
                          </Typography>
                          
                          {isOwnMessage && (
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: 4, right: 4, color: 'inherit' }}
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
                            mt: 0.5,
                            textAlign: isOwnMessage ? 'right' : 'left',
                            color: 'text.secondary'
                          }}
                        >
                          {moment(message.createdAt).format('MMM DD, HH:mm')}
                          {message.read && isOwnMessage && (
                            <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                              • Read
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                      
                      {isOwnMessage && (
                        <Avatar
                          src={user.avatar}
                          sx={{ ml: 1, width: 32, height: 32 }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                    </Box>
                  );
                })}
              </Box>
              
              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
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
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    {sendingMessage ? <CircularProgress size={20} /> : <SendIcon />}
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Select a conversation
                </Typography>
                <Typography variant="body2" color="textSecondary">
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
    </Container>
  );
};

export default Messages;