import React, { useState, useEffect, useCallback } from 'react';
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
  Button
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [connectedLinks, setConnectedLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get('/api/messages/conversations', {
        headers: { 'x-auth-token': token }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
        
        // Create new conversation object
        const newConversation = {
          conversationId: `${user.id}_${userId}`,
          otherUser,
          lastMessage: null,
          unreadCount: 0
        };
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...prev]);
        
        // Select the new conversation
        setSelectedConversation({ _id: userId });
        setMessages([]); // Start with empty messages
      } catch (error) {
        console.error('Error starting new conversation:', error);
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
    } catch (error) {
      console.error('Error fetching connected links:', error);
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
    try {
      const response = await axios.get(`/api/messages/conversation/${otherUserId}`, {
        headers: { 'x-auth-token': token }
      });
      setMessages(response.data);
      setSelectedConversation({ _id: otherUserId });
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      await axios.post('/api/messages', {
        recipient: selectedConversation._id,
        content: newMessage
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setNewMessage('');
      fetchMessages(selectedConversation._id);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
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
    if (token) {
      fetchConversations();
      setLoading(false);
    }
  }, [token, fetchConversations]);

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
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: '#f0f2f5' }}>
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
              sx: { borderRadius: 3, bgcolor: '#f0f2f5' }
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
                onClick={() => fetchMessages(conversation.otherUser?._id)}
                selected={selectedConversation?._id === conversation.otherUser?._id}
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
              {messages && Array.isArray(messages) && messages.map((message) => {
                const isOwn = message.sender?._id === user.id;
                return (
                  <Box
                    key={message._id}
                    sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      mb: 0.5
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: '70%',
                        bgcolor: isOwn ? '#dcf8c6' : 'white',
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {message.content}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          textAlign: 'right',
                          mt: 0.5,
                          fontSize: '0.7rem'
                        }}
                      >
                        {moment(message.createdAt).format('HH:mm')}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
            </Box>

            {/* Message Input */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'white', 
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1
            }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#f0f2f5'
                  }
                }}
              />
              <IconButton 
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                sx={{ 
                  bgcolor: '#1976d2',
                  color: 'white',
                  '&:hover': { bgcolor: '#1565c0' },
                  '&:disabled': { bgcolor: '#ccc' }
                }}
              >
                {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
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

    </Box>
  );
};

export default Messages;