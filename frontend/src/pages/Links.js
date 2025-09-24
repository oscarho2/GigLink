import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Divider,
  Alert,
  Paper,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`links-tabpanel-${index}`}
      aria-labelledby={`links-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LinksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabValue, setTabValue] = useState(location.state?.activeTab || 0);
  const [links, setLinks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadLinks();
    loadPendingRequests();
    loadSentRequests();
  }, []);

  const loadLinks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/links', {
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      if (response.ok) {
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/requests/pending', {
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      if (response.ok) {
        setPendingRequests(data.requests);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadSentRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/requests/sent', {
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSentRequests(data.requests);
      }
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  };





  const acceptFriendRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/accept/${linkId}`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Link request accepted');
        loadLinks();
        loadPendingRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error accepting link request');
    }
  };

  const declineLinkRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/decline/${linkId}`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Link request declined');
        loadPendingRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error declining link request');
    }
  };

  const removeLink = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Link removed successfully');
        loadLinks();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error removing link');
    }
  };

  const cancelRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Link request cancelled');
        loadSentRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error cancelling request');
    }
  };

  const handleTabChange = (event, newValue) => {
    // Ensure tab value doesn't exceed available tabs (0, 1, 2)
    if (newValue <= 2) {
      setTabValue(newValue);
    }
    setError('');
    setSuccess('');
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'x-auth-token': token
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error searching users');
    }
    setSearchLoading(false);
  };

  const sendLinkRequest = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ recipientId: userId })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Link request sent successfully!');
        loadSentRequests(); // Refresh sent requests
        // Remove user from search results
        setSearchResults(prev => prev.filter(user => user._id !== userId));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error sending link request');
    }
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };





  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Links Management
      </Typography>
      
      <Paper elevation={2} sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab label={`Links (${links.length})`} />
            <Tab label={`Requests (${pendingRequests.length})`} />
            <Tab label={`Sent (${sentRequests.length})`} />
          </Tabs>
        </Box>

        {/* Permanent Search Box */}
        <Box sx={{ mt: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search for musicians to connect with..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Search Results */}
          {searchQuery && (
            <Box sx={{ mb: 2 }}>
              {searchLoading ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  Searching...
                </Typography>
              ) : searchResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No users found matching "{searchQuery}"
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  {searchResults.map((user) => {
                    // Check if user is already linked or has pending request
                    const isLinked = links.some(link => link.link.id === user._id);
                    const hasPendingRequest = sentRequests.some(req => req.recipient._id === user._id || req.recipient.id === user._id);
                    const hasIncomingRequest = pendingRequests.some(req => req.requester._id === user._id || req.requester.id === user._id);
                    
                    return (
                      <ListItem key={user._id}>
                        <ListItemAvatar>
                          <Avatar 
                            src={user.avatar}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/profile/${user._id}`)}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              component="span"
                              sx={{
                                cursor: 'pointer',
                                color: 'primary.main',
                                '&:hover': {
                                  color: 'primary.dark'
                                }
                              }}
                              onClick={() => navigate(`/profile/${user._id}`)}
                            >
                              {user.name}
                            </Typography>
                          }
                          secondary={
                            <>
                              {user.bio && (
                                <Typography variant="body2" color="text.secondary">
                                  {user.bio.length > 100 ? `${user.bio.substring(0, 100)}...` : user.bio}
                                </Typography>
                              )}
                              {user.instruments && user.instruments.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {user.instruments.join(', ')}
                                </Typography>
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          {isLinked ? (
                            <Button disabled size="small">
                              Connected
                            </Button>
                          ) : hasPendingRequest ? (
                            <Button disabled size="small">
                              Request Sent
                            </Button>
                          ) : hasIncomingRequest ? (
                            <Button disabled size="small">
                              Request Received
                            </Button>
                          ) : (
                            <Button
                              onClick={() => sendLinkRequest(user._id)}
                              color="primary"
                              size="small"
                              startIcon={<PersonAddIcon />}
                            >
                              Connect
                            </Button>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          )}
        </Box>

        {/* Links Tab */}
        <TabPanel value={tabValue} index={0}>
          {links.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No links yet. Connect with other musicians to build your network!
            </Typography>
          ) : (
            <List>
              {links.map((linkData) => (
                <ListItem key={linkData.linkId}>
                  <ListItemAvatar>
                    <Avatar 
                       src={linkData.link.avatar}
                       sx={{ cursor: 'pointer' }}
                       onClick={() => navigate(`/profile/${linkData.link._id}`)}
                     >
                      {linkData.link.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                        }}
                        onClick={() => navigate(`/profile/${linkData.link.id}`)}
                      >
                        {linkData.link.name}
                      </Typography>
                    }
                    secondary={`Connected ${new Date(linkData.connectedAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeLink(linkData.linkId)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Pending Requests Tab */}
        <TabPanel value={tabValue} index={1}>
          {pendingRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No pending link requests
            </Typography>
          ) : (
            <List>
              {pendingRequests.map((request) => (
                <ListItem key={request.linkId}>
                  <ListItemAvatar>
                    <Avatar 
                       src={request.requester.avatar}
                       sx={{ cursor: 'pointer' }}
                       onClick={() => navigate(`/profile/${request.requester._id}`)}
                     >
                      {request.requester.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            color: 'primary.dark'
                          }
                        }}
                        onClick={() => navigate(`/profile/${request.requester._id || request.requester.id}`)}
                      >
                        {request.requester.name}
                      </Typography>
                    }
                    secondary={
                      <>
                        {request.note && (
                          <Typography variant="body2" color="text.secondary">
                            "{request.note}"
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => acceptFriendRequest(request.linkId)}
                      color="success"
                      sx={{ mr: 1 }}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => declineLinkRequest(request.linkId)}
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Sent Requests Tab */}
        <TabPanel value={tabValue} index={2}>
          {sentRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No sent link requests
            </Typography>
          ) : (
            <List>
              {sentRequests.map((request) => (
                <ListItem key={request.linkId}>
                  <ListItemAvatar>
                    <Avatar 
                       src={request.recipient.avatar}
                       sx={{ cursor: 'pointer' }}
                       onClick={() => navigate(`/profile/${request.recipient._id}`)}
                     >
                      {request.recipient.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': {
                            color: 'primary.dark'
                          }
                        }}
                        onClick={() => navigate(`/profile/${request.recipient._id || request.recipient.id}`)}
                      >
                        {request.recipient.name}
                      </Typography>
                    }
                    secondary={
                      <>
                        {request.note && (
                          <Typography variant="body2" color="text.secondary">
                            "{request.note}"
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Sent {new Date(request.requestedAt).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      onClick={() => cancelRequest(request.linkId)}
                      color="error"
                      size="small"
                    >
                      Cancel
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>



      </Paper>
    </Container>
  );
};

export default LinksPage;