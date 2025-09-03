import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  TextField,
  Typography,
  Chip,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

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
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LinksManagement = ({ open, onClose }) => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      loadFriends();
      loadPendingRequests();
      loadSentRequests();
    }
  }, [open]);

  const loadFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/requests/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error searching users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/links/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId: userId })
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Friend request sent successfully');
        // Update search results to reflect new status
        setSearchResults(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, relationshipStatus: 'pending' }
            : user
        ));
        loadSentRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error sending friend request');
    }
  };

  const acceptFriendRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/accept/${linkId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Friend request accepted');
        loadFriends();
        loadPendingRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error accepting friend request');
    }
  };

  const declineFriendRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/decline/${linkId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Friend request declined');
        loadPendingRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error declining friend request');
    }
  };

  const removeFriend = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Friend removed successfully');
        loadFriends();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error removing friend');
    }
  };

  const cancelRequest = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Friend request cancelled');
        loadSentRequests();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error cancelling request');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      none: { label: 'Add Friend', color: 'primary', icon: <PersonAddIcon /> },
      pending: { label: 'Request Sent', color: 'warning', icon: null },
      accepted: { label: 'Friends', color: 'success', icon: <PeopleIcon /> },
      declined: { label: 'Declined', color: 'error', icon: null },
      blocked: { label: 'Blocked', color: 'error', icon: <BlockIcon /> }
    };

    const config = statusConfig[status] || statusConfig.none;
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        variant={status === 'none' ? 'outlined' : 'filled'}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Links Management
        </Typography>
      </DialogTitle>
      
      <DialogContent>
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
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Friends (${friends.length})`} />
            <Tab label={`Requests (${pendingRequests.length})`} />
            <Tab label={`Sent (${sentRequests.length})`} />
            <Tab label="Find Friends" />
          </Tabs>
        </Box>

        {/* Friends Tab */}
        <TabPanel value={tabValue} index={0}>
          {friends.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No friends yet. Use the "Find Friends" tab to connect with other musicians!
            </Typography>
          ) : (
            <List>
              {friends.map((friendData) => (
                <ListItem key={friendData.linkId}>
                  <ListItemAvatar>
                    <Avatar src={friendData.friend.avatar}>
                      {friendData.friend.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={friendData.friend.name}
                    secondary={`Connected ${new Date(friendData.connectedAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeFriend(friendData.linkId)}
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
              No pending friend requests
            </Typography>
          ) : (
            <List>
              {pendingRequests.map((request) => (
                <ListItem key={request.linkId}>
                  <ListItemAvatar>
                    <Avatar src={request.requester.avatar}>
                      {request.requester.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={request.requester.name}
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
                      onClick={() => declineFriendRequest(request.linkId)}
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
              No sent friend requests
            </Typography>
          ) : (
            <List>
              {sentRequests.map((request) => (
                <ListItem key={request.linkId}>
                  <ListItemAvatar>
                    <Avatar src={request.recipient.avatar}>
                      {request.recipient.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={request.recipient.name}
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

        {/* Find Friends Tab */}
        <TabPanel value={tabValue} index={3}>
          <TextField
            fullWidth
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          
          {searchResults.length === 0 && searchQuery.length >= 2 && !loading ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No users found matching "{searchQuery}"
            </Typography>
          ) : (
            <List>
              {searchResults.map((user) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar src={user.avatar}>
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.email}
                  />
                  <ListItemSecondaryAction>
                    {user.relationshipStatus === 'none' ? (
                      <Button
                        onClick={() => sendFriendRequest(user.id)}
                        variant="outlined"
                        size="small"
                        startIcon={<PersonAddIcon />}
                      >
                        Add Friend
                      </Button>
                    ) : (
                      getStatusChip(user.relationshipStatus)
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LinksManagement;