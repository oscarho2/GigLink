import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, List, ListItem, ListItemText, ListItemAvatar, Avatar, TextField, Button, Box, Divider, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await axios.get('/api/messages/conversations', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setConversations(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch conversations.');
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      try {
        setLoading(true);
        const recipientId = selectedConversation.user._id;
        const res = await axios.get(`/api/messages?recipient=${recipientId}`, {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        // Filter messages to only show those between the current user and the selected conversation partner
        const filteredMessages = res.data.filter(msg => 
          (msg.sender._id === user.id && msg.recipient._id === recipientId) ||
          (msg.sender._id === recipientId && msg.recipient._id === user.id)
        );
        setMessages(filteredMessages.reverse()); // Display in chronological order
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch messages.');
        setLoading(false);
      }
    };
    fetchMessages();
  }, [selectedConversation, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      const res = await axios.post('/api/messages', 
        { recipient: selectedConversation.user._id, content: newMessage },
        { headers: { 'x-auth-token': localStorage.getItem('token') } }
      );
      setMessages([...messages, res.data]);
      setNewMessage('');
      // Optionally, refresh conversations to update last message/unread count
      // fetchConversations(); 
    } catch (err) {
      console.error(err);
      setError('Failed to send message.');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Messages</Typography>
      <Paper elevation={3}>
        <Grid container>
          {/* Conversations List */}
          <Grid item xs={12} md={4} sx={{ borderRight: '1px solid #e0e0e0' }}>
            <List sx={{ height: '70vh', overflow: 'auto' }}>
              {conversations.map((conversation) => (
                <React.Fragment key={conversation.id}>
                  <ListItem button selected={selectedConversation && conversation.user._id === selectedConversation.user._id} onClick={() => setSelectedConversation(conversation)}>
                    <ListItemAvatar>
                      <Avatar>{conversation.user.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1">{conversation.user.name}</Typography>
                          {conversation.unreadCount > 0 && (
                            <Typography variant="caption" sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '50%', px: 1 }}>
                              {conversation.unreadCount}
                            </Typography>
                          )}
                        </Box>
                      } 
                      secondary={conversation.lastMessage.content} 
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Grid>
          
          {/* Message Thread */}
          <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
            {/* Message Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6">{selectedConversation ? selectedConversation.user.name : 'Select a conversation'}</Typography>
            </Box>
            
            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              {selectedConversation ? (
                messages.map((message) => (
                  <Box 
                    key={message._id} 
                    sx={{
                      display: 'flex', 
                      justifyContent: message.sender._id === user.id ? 'flex-end' : 'flex-start',
                      mb: 2 
                    }}
                  >
                    {message.sender._id !== user.id && (
                      <Avatar sx={{ mr: 1 }}>{message.sender.name.charAt(0)}</Avatar>
                    )}
                    <Box>
                      <Paper 
                        elevation={1} 
                        sx={{
                          p: 2, 
                          bgcolor: message.sender._id === user.id ? 'primary.light' : 'grey.100',
                          maxWidth: '70%' 
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                      </Paper>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: message.sender._id === user.id ? 'right' : 'left' }}>
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    {message.sender._id === user.id && (
                      <Avatar sx={{ ml: 1 }}>{user.name.charAt(0)}</Avatar>
                    )}
                  </Box>
                ))
              ) : (
                <Typography variant="body1" color="textSecondary">No conversation selected.</Typography>
              )}
            </Box>
            
            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex' }}>
              <TextField 
                fullWidth 
                placeholder="Type a message..." 
                variant="outlined"
                size="small"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                disabled={!selectedConversation}
              />
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ ml: 1 }}
                onClick={handleSendMessage}
                disabled={!selectedConversation}
              >
                Send
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Messages;