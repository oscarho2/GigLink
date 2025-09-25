import React, { useState, useRef, useEffect, forwardRef } from 'react';
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MentionInput = forwardRef(({
  value,
  onChange,
  placeholder = "Type a message...",
  multiline = false,
  maxRows = 4,
  disabled = false,
  onKeyPress,
  sx = {},
  ...textFieldProps
}, ref) => {
  const { token } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSelectingUser, setIsSelectingUser] = useState(false);
  const textFieldRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Search for users when typing @ mentions
  const searchUsers = async (query) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/mentions/search?q=${encodeURIComponent(query)}`, {
        headers: { 'x-auth-token': token }
      });
      const results = Array.isArray(response.data) ? response.data : [];
      const q = query.trim().toLowerCase();
      const prioritized = results.slice().sort((a, b) => {
        const wa = weightUser(a, q);
        const wb = weightUser(b, q);
        if (wa !== wb) return wa - wb;
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        return an.localeCompare(bn);
      });
      setSearchResults(prioritized);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Compute priority for a user given a query: exact → prefix → word-prefix → substring
  const weightUser = (user, q) => {
    const name = (user?.name || '').toLowerCase();
    if (!q) return 99;
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    const parts = name.split(/\s+/);
    if (parts.some(p => p.startsWith(q))) return 2;
    if (name.includes(q)) return 3;
    return 9;
  };

  // Handle text input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(e);

    // Skip mention detection if we're in the middle of selecting a user
    if (isSelectingUser) {
      return;
    }

    // Check for @ mention
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      const start = cursorPosition - mentionMatch[0].length;
      
      setMentionQuery(query);
      setMentionStart(start);
      setSelectedIndex(0);
      setAnchorEl(textFieldRef.current);
      
      // Debounce search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(query);
      }, 300);
    } else {
      // Close mention dropdown
      setAnchorEl(null);
      setSearchResults([]);
      setMentionQuery('');
      setMentionStart(-1);
    }
  };

  // Handle key presses for navigation and selection
  const handleKeyPress = (e) => {
    if (anchorEl && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (searchResults && searchResults.length > 0 && selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectUser(searchResults[selectedIndex]);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setAnchorEl(null);
        setSearchResults([]);
        return;
      }
    }
    
    // Call original onKeyPress if provided
    if (onKeyPress) {
      onKeyPress(e);
    }
  };

  // Select a user from the dropdown
  const selectUser = (user) => {
    if (!user || mentionStart === -1) {
      return;
    }
    
    // Set flag to prevent handleInputChange from interfering
    setIsSelectingUser(true);
    
    const currentValue = value;
    const beforeMention = currentValue.substring(0, mentionStart);
    const mentionEnd = mentionStart + mentionQuery.length + 1; // +1 for @
    const afterMention = currentValue.substring(mentionEnd);
    
    // Use 'name' field from backend response
    const userName = user.name || user.username || 'Unknown';
    const newValue = `${beforeMention}@${userName} ${afterMention}`;
    
    // Create synthetic event for onChange
    const syntheticEvent = {
      target: {
        value: newValue,
        name: textFieldRef.current?.name || '',
        selectionStart: mentionStart + userName.length + 2 // +2 for @ and space
      }
    };
    
    onChange(syntheticEvent);
    
    // Close dropdown
    setAnchorEl(null);
    setSearchResults([]);
    setMentionQuery('');
    setMentionStart(-1);
    
    // Focus back to input and reset flag
    setTimeout(() => {
      const inputElement = inputRef.current || textFieldRef.current?.querySelector('input') || textFieldRef.current?.querySelector('textarea');
      if (inputElement) {
        inputElement.focus();
        const userName = user.name || user.username || 'Unknown';
        const newCursorPos = mentionStart + userName.length + 2;
        if (inputElement.setSelectionRange) {
          inputElement.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
      // Reset the flag after the operation is complete
      setIsSelectingUser(false);
    }, 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the popper or the input
      const popperElement = document.querySelector('[data-popper-placement]');
      const isInsidePopper = popperElement && popperElement.contains(event.target);
      const isInsideInput = anchorEl && anchorEl.contains(event.target);
      
      if (anchorEl && !isInsideInput && !isInsidePopper) {
        setAnchorEl(null);
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <TextField
        {...textFieldProps}
        ref={textFieldRef}
        inputRef={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        multiline={multiline}
        maxRows={maxRows}
        disabled={disabled}
        sx={sx}
      />
      
      {/* Mention Dropdown */}
      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="top-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          elevation={8}
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            minWidth: 250,
            mt: 1
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : searchResults.length > 0 ? (
            <List dense>
              {searchResults.map((user, index) => (
                <ListItem
                  key={user._id}
                  button={true}
                  selected={index === selectedIndex}
                  onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     selectUser(user);
                   }}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText'
                    },
                    cursor: 'pointer'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={user.avatar}
                      alt={user.name}
                      sx={{ width: 32, height: 32 }}
                    >
                      {user.name?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="500">
                        {user.name}
                      </Typography>
                    }
                    secondary={
                      user.username ? (
                        <Typography variant="caption" color="text.secondary">
                          {user.username}
                        </Typography>
                      ) : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : mentionQuery.length > 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No users found for "{mentionQuery}"
              </Typography>
            </Box>
          ) : null}
        </Paper>
      </Popper>
    </>
  );
});

export default MentionInput;
