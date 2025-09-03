import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const GroupManagement = ({ open, onClose, onGroupCreated, editGroup = null }) => {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Add Members, 3: Settings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Group data
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    maxMembers: 50
  });
  
  // Members management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (editGroup) {
      setGroupData({
        name: editGroup.name || '',
        description: editGroup.description || '',
        isPrivate: editGroup.isPrivate || false,
        maxMembers: editGroup.maxMembers || 50
      });
      setSelectedMembers(editGroup.members || []);
    }
  }, [editGroup]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setStep(1);
      setGroupData({ name: '', description: '', isPrivate: false, maxMembers: 50 });
      setSelectedMembers([]);
      setSearchTerm('');
      setSearchResults([]);
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
    }
  }, [open]);

  // Search users
  const searchUsers = async (query) => {
    if (!query.trim() || !token) return;
    
    try {
      setSearchLoading(true);
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`, config);
      
      // Filter out current user and already selected members
      const filteredResults = res.data.filter(u => 
        u._id !== user.id && !selectedMembers.find(m => m._id === u._id)
      );
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Add member to group
  const addMember = (user) => {
    if (!selectedMembers.find(m => m._id === user._id)) {
      setSelectedMembers(prev => [...prev, { ...user, role: 'member' }]);
      setSearchResults(prev => prev.filter(u => u._id !== user._id));
    }
  };

  // Remove member from group
  const removeMember = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m._id !== userId));
  };

  // Create or update group
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = { headers: { 'x-auth-token': token } };
      
      let groupResponse;
      if (editGroup) {
        // Update existing group
        groupResponse = await axios.put(`/api/groups/${editGroup._id}`, groupData, config);
      } else {
        // Create new group
        groupResponse = await axios.post('/api/groups', groupData, config);
      }
      
      const groupId = groupResponse.data._id;
      
      // Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await axios.post(`/api/groups/${groupId}/avatar`, formData, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // Add members (only for new groups or if members changed)
      if (!editGroup && selectedMembers.length > 0) {
        for (const member of selectedMembers) {
          await axios.post(`/api/groups/${groupId}/members`, 
            { userId: member._id }, 
            config
          );
        }
      }
      
      onGroupCreated && onGroupCreated(groupResponse.data);
      onClose();
    } catch (err) {
      console.error('Error creating/updating group:', err);
      setError(err.response?.data?.msg || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>
              {editGroup ? 'Edit Group Info' : 'Create New Group'}
            </Typography>
            
            {/* Avatar Upload */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={avatarPreview || editGroup?.avatar}
                sx={{ width: 80, height: 80, mr: 2 }}
              >
                <GroupIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Box>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="avatar-upload"
                  type="file"
                  onChange={handleAvatarChange}
                />
                <label htmlFor="avatar-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                    size="small"
                  >
                    Upload Avatar
                  </Button>
                </label>
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label="Group Name"
              value={groupData.name}
              onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={groupData.description}
              onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Add Members
            </Typography>
            
            {/* Search Users */}
            <Autocomplete
              freeSolo
              options={searchResults}
              getOptionLabel={(option) => option.name || ''}
              loading={searchLoading}
              onInputChange={(event, value) => {
                setSearchTerm(value);
                if (value.length > 2) {
                  searchUsers(value);
                }
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar src={option.avatar} sx={{ mr: 2, width: 32, height: 32 }}>
                    {option.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.email}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      addMember(option);
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search users to add"
                  placeholder="Type to search..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            
            {/* Selected Members */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Selected Members ({selectedMembers.length})
            </Typography>
            
            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
              {selectedMembers.map((member) => (
                <ListItem key={member._id}>
                  <ListItemAvatar>
                    <Avatar src={member.avatar}>
                      {member.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.name}
                    secondary={member.email}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeMember(member._id)}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>
              Group Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={groupData.isPrivate}
                  onChange={(e) => setGroupData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                />
              }
              label="Private Group"
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Private groups require admin approval for new members
            </Typography>
            
            <TextField
              fullWidth
              label="Maximum Members"
              type="number"
              value={groupData.maxMembers}
              onChange={(e) => setGroupData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 50 }))}
              inputProps={{ min: 2, max: 500 }}
              margin="normal"
            />
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {editGroup ? 'Edit Group' : 'Create Group'} - Step {step} of 3
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {step > 1 && (
          <Button onClick={() => setStep(step - 1)} disabled={loading}>
            Back
          </Button>
        )}
        
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            variant="contained"
            disabled={!groupData.name.trim() || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!groupData.name.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {editGroup ? 'Update Group' : 'Create Group'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GroupManagement;