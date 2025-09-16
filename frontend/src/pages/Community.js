import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Menu
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Videocam as VideocamIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  PushPin as PushPinIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';

const Community = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [filters, setFilters] = useState({ instruments: [], genres: [] });
  const [expandedComments, setExpandedComments] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [postMenuAnchor, setPostMenuAnchor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);

  const [replyMenuAnchor, setReplyMenuAnchor] = useState(null);
  const [selectedReply, setSelectedReply] = useState(null);
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});

  // Ref for reply input auto-focus
  const replyInputRef = useRef(null);

  // Predefined options for instruments and genres
  const instrumentOptions = [
    'Guitar', 'Bass', 'Drums', 'Piano', 'Keyboard', 'Violin', 'Saxophone', 
    'Trumpet', 'Flute', 'Clarinet', 'Cello', 'Vocals', 'Harmonica', 
    'Banjo', 'Mandolin', 'Ukulele', 'Accordion', 'Harp', 'Trombone', 'Tuba'
  ];

  const genreOptions = [
    'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'Folk', 'Classical', 
    'Electronic', 'Hip Hop', 'R&B', 'Reggae', 'Punk', 'Metal', 
    'Alternative', 'Indie', 'Funk', 'Soul', 'Gospel', 'World', 'Experimental'
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.instruments.length > 0) {
        queryParams.append('instruments', filters.instruments.join(','));
      }
      if (filters.genres.length > 0) {
        queryParams.append('genres', filters.genres.join(','));
      }
      
      const url = `http://localhost:5001/api/posts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        
        // Initialize commentLikes state with actual like status from server
        const initialCommentLikes = {};
        data.forEach(post => {
          post.comments.forEach(comment => {
            initialCommentLikes[comment._id] = comment.isLikedByUser || false;
            // Also initialize reply likes if they have isLikedByUser property
            if (comment.replies) {
              comment.replies.forEach(reply => {
                if (reply.isLikedByUser !== undefined) {
                  initialCommentLikes[reply._id] = reply.isLikedByUser;
                }
              });
            }
          });
        });
        setCommentLikes(initialCommentLikes);
      } else {
        if (response.status === 401) {
          toast.error('Authentication expired. Please log in again.');
          // Optionally redirect to login or clear auth state
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch posts' }));
          throw new Error(errorData.message || 'Failed to fetch posts');
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async (e) => {
    if (e) e.preventDefault();
    
    if (!postContent.trim() && selectedFiles.length === 0) {
      toast.error('Please add some content or media to your post');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', postContent);
      formData.append('instruments', JSON.stringify(selectedInstruments));
      formData.append('genres', JSON.stringify(selectedGenres));
      
      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'x-auth-token': token
        },
        body: formData
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [newPost, ...prev]);
        setPostContent('');
        setSelectedFiles([]);
        setSelectedInstruments([]);
        setSelectedGenres([]);
        setCreatePostModalOpen(false);
        toast.success('Post created successfully!');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId, isLiked) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => 
          post._id === postId ? updatedPost : post
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content: commentText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => 
          post._id === postId ? updatedPost : post
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const response = await fetch(`/api/posts/${postToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        setPosts(prev => prev.filter(post => post._id !== postToDelete));
        toast.success('Post deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
      setPostMenuAnchor(null);
      setSelectedPost(null);
    }
  };

  const handlePostMenuClick = (event, post) => {
    setPostMenuAnchor(event.currentTarget);
    setSelectedPost(post);
  };

  const handlePostMenuClose = () => {
    setPostMenuAnchor(null);
    setSelectedPost(null);
  };

  const handleDeleteClick = () => {
    setPostToDelete(selectedPost._id);
    setDeleteDialogOpen(true);
    handlePostMenuClose();
  };

  const handleCommentLike = async (postId, commentId) => {
    try {
      const isLiked = commentLikes[commentId];
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:5001/api/posts/${postId}/comments/${commentId}/like`, {
        method,
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: !isLiked
        }));
        
        // Update the posts state to reflect the like count change
        setPosts(prevPosts => 
          prevPosts.map(post => ({
            ...post,
            comments: post.comments.map(comment => 
              comment._id === commentId 
                ? { 
                    ...comment, 
                    likesCount: isLiked ? (comment.likesCount || 1) - 1 : (comment.likesCount || 0) + 1 
                  }
                : comment
            )
          }))
        );
      } else if (response.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to update comment like');
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      toast.error('Failed to update comment like');
    }
  };

  const handleReplyToComment = (commentId) => {
    setReplyingTo(commentId);
    // Focus the reply input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    }, 100);
  };

  const handleReplySubmit = async (commentId) => {
    const replyText = replyTexts[commentId];
    if (!replyText?.trim()) return;

    // Find the post that contains this comment
    const post = posts.find(p => p.comments.some(c => c._id === commentId));
    if (!post) return;

    try {
      const response = await fetch(`/api/posts/${post._id}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content: replyText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the posts state to reflect the new reply
        setPosts(prev => prev.map(p => 
          p._id === updatedPost._id ? updatedPost : p
        ));
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        setReplyingTo(null);
        toast.success('Reply added successfully!');
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          toast.error('Authentication expired. Please log in again.');
        } else {
          toast.error(errorData.message || 'Failed to add reply');
        }
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleCommentMenuClick = (event, comment) => {
    setCommentMenuAnchor(event.currentTarget);
    setSelectedComment(comment);
  };

  const handleCommentMenuClose = () => {
    setCommentMenuAnchor(null);
    setSelectedComment(null);
  };

  const handlePinComment = async () => {
    if (!selectedComment) return;

    // Find the post that contains this comment
    const post = posts.find(p => p.comments.some(c => c._id === selectedComment._id));
    if (!post) {
      toast.error('Post not found');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/posts/${post._id}/comments/${selectedComment._id}/pin`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(p => 
          p._id === updatedPost._id ? updatedPost : p
        ));
        const comment = updatedPost.comments.find(c => c._id === selectedComment._id);
        toast.success(comment?.pinned ? 'Comment pinned' : 'Comment unpinned');
      } else if (response.status === 403) {
        toast.error('Only the post author can pin comments');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to pin comment');
      }
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast.error('Failed to pin comment');
    }
    handleCommentMenuClose();
  };

  const handleReplyLike = async (commentId, replyId) => {
    // Find the post that contains this comment and reply
    const post = posts.find(p => p.comments.some(c => c._id === commentId));
    if (!post) {
      toast.error('Post not found');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/posts/${post._id}/comments/${commentId}/replies/${replyId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === post._id ? updatedPost : p
          )
        );
        if (selectedPost && selectedPost._id === post._id) {
          setSelectedPost(updatedPost);
        }
        
        // Update commentLikes state for the reply
        const updatedComment = updatedPost.comments.find(c => c._id === commentId);
        if (updatedComment) {
          const updatedReply = updatedComment.replies.find(r => r._id === replyId);
          if (updatedReply) {
            setCommentLikes(prev => ({
              ...prev,
              [replyId]: updatedReply.isLikedByUser || false
            }));
          }
        }
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          toast.error('Authentication expired. Please log in again.');
        } else {
          toast.error(errorData.message || 'Failed to update reply like');
        }
      }
    } catch (error) {
      console.error('Error updating reply like:', error);
      toast.error('Failed to update reply like');
    }
  };

  const handleReplyToReply = (commentId, replyId, replyUserName) => {
    setReplyingTo(commentId);
    setReplyTexts(prev => ({
      ...prev,
      [commentId]: `@${replyUserName} `
    }));
  };

  const handleReplyMenuClick = (event, commentId, replyId) => {
    setReplyMenuAnchor(event.currentTarget);
    setSelectedReply(replyId);
    setSelectedCommentForReply(commentId);
  };

  const handleReplyMenuClose = () => {
    setReplyMenuAnchor(null);
    setSelectedReply(null);
    setSelectedCommentForReply(null);
  };

  const handleDeleteReply = async () => {
    if (!selectedReply || !selectedCommentForReply) return;

    // Find the post that contains this comment and reply
    const post = posts.find(p => p.comments.some(c => c._id === selectedCommentForReply));
    if (!post) {
      toast.error('Post not found');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/posts/${post._id}/comments/${selectedCommentForReply}/replies/${selectedReply}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === post._id ? updatedPost : p
          )
        );
        if (selectedPost && selectedPost._id === post._id) {
          setSelectedPost(updatedPost);
        }
        toast.success('Reply deleted successfully');
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          toast.error('Authentication expired. Please log in again.');
        } else {
          toast.error(errorData.message || 'Failed to delete reply');
        }
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Failed to delete reply');
    }
    handleReplyMenuClose();
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) return;

    // Find the post that contains this comment
    const post = posts.find(p => p.comments.some(c => c._id === selectedComment._id));
    if (!post) return;

    try {
      const response = await fetch(`/api/posts/${post._id}/comments/${selectedComment._id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the posts state with the updated post
        setPosts(prev => prev.map(p => 
          p._id === updatedPost._id ? updatedPost : p
        ));
        toast.success('Comment deleted successfully');
      } else {
        toast.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
    handleCommentMenuClose();
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderMedia = (media) => {
    return (
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {media.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            {item.type === 'image' ? (
              <img
                src={`http://localhost:5001${item.url}`}
                alt="Post media"
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <video
                controls
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  maxHeight: '400px'
                }}
              >
                <source src={`http://localhost:5001${item.url}`} />
                Your browser does not support the video tag.
              </video>
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Create Post Bar - LinkedIn/Facebook Style */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          border: '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UserAvatar
             user={user}
             size={48}
             onClick={() => navigate('/profile/edit')}
           />
          <Box
            onClick={() => setCreatePostModalOpen(true)}
            sx={{
              flexGrow: 1,
              p: 2,
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              bgcolor: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#f1f5f9',
                borderColor: '#cbd5e0'
              }
            }}
          >
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 'normal' }}
            >
              What's on your mind, {user?.name?.split(' ')[0] || 'there'}?
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/my-posts')}
            sx={{
              borderColor: '#1a365d',
              color: '#1a365d',
              fontWeight: 'medium',
              '&:hover': {
                borderColor: '#2c5282',
                color: '#2c5282',
                bgcolor: 'rgba(26, 54, 93, 0.04)'
              }
            }}
          >
            My Posts
          </Button>
        </Box>
      </Paper>

      {/* Filter Section */}
      <Paper elevation={1} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: '#f8fafc', 
            borderBottom: filtersVisible ? '1px solid #e2e8f0' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setFiltersVisible(!filtersVisible)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon sx={{ color: '#1a365d' }} />
              <Typography variant="h6" sx={{ color: '#1a365d', fontWeight: 'bold' }}>
                Filter Posts
              </Typography>
              {(filters.instruments.length > 0 || filters.genres.length > 0) && (
                <Chip 
                  label={`${filters.instruments.length + filters.genres.length} active`}
                  size="small"
                  sx={{ 
                    bgcolor: '#1a365d', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>
            {filtersVisible ? <ExpandLessIcon sx={{ color: '#1a365d' }} /> : <ExpandMoreIcon sx={{ color: '#1a365d' }} />}
          </Box>
        </Box>
        
        <Collapse in={filtersVisible}>
          <Box sx={{ p: 3, bgcolor: 'white' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={instrumentOptions}
                  value={filters.instruments}
                  onChange={(event, newValue) => {
                    setFilters(prev => ({ ...prev, instruments: newValue }));
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        key={index} 
                        variant="filled" 
                        label={option} 
                        sx={{ 
                          bgcolor: '#1a365d', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'white' }
                        }}
                        {...getTagProps({ index })} 
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Instruments"
                      placeholder="Select instruments"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': { borderColor: '#1a365d' },
                          '&.Mui-focused fieldset': { borderColor: '#1a365d' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#1a365d' }
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={genreOptions}
                  value={filters.genres}
                  onChange={(event, newValue) => {
                    setFilters(prev => ({ ...prev, genres: newValue }));
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        key={index} 
                        variant="filled" 
                        label={option} 
                        sx={{ 
                          bgcolor: '#2c5282', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'white' }
                        }}
                        {...getTagProps({ index })} 
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Genres"
                      placeholder="Select genres"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': { borderColor: '#2c5282' },
                          '&.Mui-focused fieldset': { borderColor: '#2c5282' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2c5282' }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
            
            {/* Clear Filters Button */}
            {(filters.instruments.length > 0 || filters.genres.length > 0) && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFilters({ instruments: [], genres: [] })}
                  sx={{
                    color: '#718096',
                    borderColor: '#718096',
                    '&:hover': {
                      borderColor: '#1a365d',
                      color: '#1a365d'
                    }
                  }}
                >
                  Clear All Filters
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Create Post Modal */}
      <Dialog
        open={createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a365d', 
          color: 'white', 
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.5rem'
        }}>
          Create a Post
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmitPost} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What's on your mind? Share your musical journey..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              variant="outlined"
              sx={{ 
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': { borderColor: '#1a365d' },
                  '&.Mui-focused fieldset': { borderColor: '#1a365d' }
                },
                '& .MuiInputBase-input': {
                  fontSize: '1.1rem',
                  lineHeight: 1.6
                }
              }}
            />
            
            <Typography variant="h6" sx={{ mb: 2, color: '#1a365d', fontWeight: 'bold' }}>
              Tags (Optional)
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={instrumentOptions}
                  value={selectedInstruments}
                  onChange={(event, newValue) => setSelectedInstruments(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        key={index} 
                        variant="filled" 
                        label={option} 
                        sx={{ 
                          bgcolor: '#1a365d', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'white' }
                        }}
                        {...getTagProps({ index })} 
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Instruments"
                      placeholder="Select instruments"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#1a365d' },
                          '&.Mui-focused fieldset': { borderColor: '#1a365d' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#1a365d' }
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={genreOptions}
                  value={selectedGenres}
                  onChange={(event, newValue) => setSelectedGenres(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip 
                        key={index} 
                        variant="filled" 
                        label={option} 
                        sx={{ 
                          bgcolor: '#2c5282', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'white' }
                        }}
                        {...getTagProps({ index })} 
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genres"
                      placeholder="Select genres"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': { borderColor: '#2c5282' },
                          '&.Mui-focused fieldset': { borderColor: '#2c5282' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#2c5282' }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
            
            {/* File Upload Section */}
            <Typography variant="h6" sx={{ mb: 2, color: '#1a365d', fontWeight: 'bold' }}>
              Media (Optional)
            </Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                mb: 4, 
                border: '2px dashed #e2e8f0',
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: '#f8fafc',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#1a365d',
                  bgcolor: '#f1f5f9'
                }
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload-modal"
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                <label htmlFor="file-upload-modal">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                    sx={{
                      bgcolor: '#1a365d',
                      '&:hover': { bgcolor: '#2c5282' }
                    }}
                  >
                    Add Photos
                  </Button>
                </label>
                <label htmlFor="file-upload-modal">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<VideocamIcon />}
                    sx={{
                      borderColor: '#1a365d',
                      color: '#1a365d',
                      '&:hover': {
                        borderColor: '#2c5282',
                        color: '#2c5282',
                        bgcolor: 'rgba(26, 54, 93, 0.04)'
                      }
                    }}
                  >
                    Add Videos
                  </Button>
                </label>
              </Box>
              
              {selectedFiles.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Upload images or videos to share with your post
                </Typography>
              )}
              
              {selectedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#1a365d' }}>
                    Selected Files:
                  </Typography>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeFile(index)}
                      sx={{ 
                        mr: 1, 
                        mb: 1,
                        bgcolor: '#e2e8f0',
                        '& .MuiChip-deleteIcon': {
                          color: '#718096',
                          '&:hover': { color: '#1a365d' }
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', gap: 2 }}>
          <Button 
            onClick={() => setCreatePostModalOpen(false)}
            variant="outlined"
            size="large"
            sx={{
              color: '#718096',
              borderColor: '#e2e8f0',
              px: 3,
              py: 1.5,
              fontWeight: 'bold',
              '&:hover': {
                borderColor: '#1a365d',
                color: '#1a365d',
                bgcolor: 'rgba(26, 54, 93, 0.04)'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPost}
            variant="contained"
            disabled={submitting || (!postContent.trim() && selectedFiles.length === 0)}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            size="large"
            sx={{
              bgcolor: '#1a365d',
              px: 4,
              py: 1.5,
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)',
              '&:hover': {
                bgcolor: '#2c5282',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(26, 54, 93, 0.4)'
              },
              '&:disabled': {
                bgcolor: '#cbd5e0',
                color: '#a0aec0'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {submitting ? 'Posting...' : 'Share Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 3,
            border: '2px dashed #e2e8f0',
            bgcolor: '#f8fafc'
          }}
        >
          <Typography variant="h5" sx={{ color: '#1a365d', fontWeight: 'bold', mb: 2 }}>
            No posts found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Be the first to share something with the community! Click 'Create a Post' to get started.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setCreatePostModalOpen(true)}
            sx={{
              bgcolor: '#1a365d',
              px: 4,
              py: 1.5,
              fontWeight: 'bold',
              '&:hover': { bgcolor: '#2c5282' }
            }}
          >
            Create Your First Post
          </Button>
        </Paper>
      ) : (
        posts.map((post) => (
          <Card 
            key={post._id} 
            elevation={0}
            sx={{ 
              mb: 4,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(26, 54, 93, 0.1)',
                borderColor: '#cbd5e0'
              }
            }}
          >
            <CardHeader
              avatar={
                <UserAvatar 
                  user={post.author}
                  size={48}
                  onClick={() => navigate(`/profile/${post.author._id}`)}
                />
              }
              title={
                <Typography 
                    variant="h6" 
                    onClick={() => navigate(`/profile/${post.author._id}`)}
                    sx={{ 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      color: '#1a365d'
                    }}
                  >
                    {post.author.name}
                  </Typography>
              }
              subheader={
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </Typography>
              }
              action={
                post.author._id === user?.id && (
                  <IconButton
                    onClick={(event) => handlePostMenuClick(event, post)}
                    sx={{
                      color: '#718096',
                      '&:hover': {
                        color: '#1a365d',
                        bgcolor: 'rgba(26, 54, 93, 0.1)'
                      }
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )
              }
              sx={{ pb: 1 }}
            />
            
            <CardContent sx={{ pt: 0, px: 3, pb: 2 }}>
              <Typography 
                variant="body1" 
                component="p"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1rem',
                  color: '#2d3748',
                  mb: 3
                }}
              >
                {post.content}
              </Typography>
              
              {post.media && post.media.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {renderMedia(post.media)}
                </Box>
              )}
              
              {/* Display tags */}
              {(post.instruments?.length > 0 || post.genres?.length > 0) && (
                <Box sx={{ mt: 2 }}>
                  {post.instruments?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mb: 1.5, 
                          color: '#1a365d', 
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                      >
                        Instruments
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {post.instruments.map((instrument, index) => (
                          <Chip
                            key={`instrument-${index}`}
                            label={instrument}
                            size="small"
                            variant="filled"
                            sx={{
                              bgcolor: '#e2e8f0',
                              color: '#1a365d',
                              fontWeight: 'medium',
                              '&:hover': { bgcolor: '#cbd5e0' }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {post.genres?.length > 0 && (
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          mb: 1.5, 
                          color: '#1a365d', 
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                      >
                        Genres
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {post.genres.map((genre, index) => (
                          <Chip
                            key={`genre-${index}`}
                            label={genre}
                            size="small"
                            variant="filled"
                            sx={{
                              bgcolor: '#1a365d',
                              color: 'white',
                              fontWeight: 'medium',
                              '&:hover': { bgcolor: '#2c5282' }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>

            <CardActions disableSpacing>
              <IconButton
                onClick={() => handleLike(post._id, post.isLikedByUser)}
                color={post.isLikedByUser ? "error" : "default"}
              >
                {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {post.likesCount}
              </Typography>
              
              <IconButton onClick={() => toggleComments(post._id)}>
                <CommentIcon />
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {post.commentsCount}
              </Typography>
              
            </CardActions>

            <Collapse in={expandedComments[post._id]} timeout="auto" unmountOnExit>
              <CardContent>
                {/* Comment Input */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UserAvatar
                    user={user}
                    size={32}
                    sx={{ mr: 1 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Write a comment..."
                    value={commentTexts[post._id] || ''}
                    onChange={(e) => setCommentTexts(prev => ({
                      ...prev,
                      [post._id]: e.target.value
                    }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleComment(post._id);
                      }
                    }}
                  />
                  <IconButton
                    onClick={() => handleComment(post._id)}
                    disabled={!commentTexts[post._id]?.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>

                {/* Comments List */}
                {post.comments && post.comments.length > 0 && (
                  <List>
                    {post.comments
                      .sort((a, b) => {
                        const aIsPinned = a.pinned;
                        const bIsPinned = b.pinned;
                        if (aIsPinned && !bIsPinned) return -1;
                        if (!aIsPinned && bIsPinned) return 1;
                        // If both have same pin status, sort by creation date (newest first)
                        return new Date(b.createdAt) - new Date(a.createdAt);
                      })
                      .map((comment) => (
                      <Box key={comment._id}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <UserAvatar
                              user={comment.user}
                              size={32}
                              onClick={() => navigate(`/profile/${comment.user._id}`)}
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography 
                                  variant="subtitle2"
                                  onClick={() => navigate(`/profile/${comment.user._id}`)}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  {comment.user.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" sx={{ flex: 1, mr: 2 }}>
                                    {comment.content}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                    {comment.pinned && (
                                      <PushPinIcon fontSize="small" color="primary" />
                                    )}
                                    <IconButton
                                      size="small"
                                      onClick={() => handleCommentLike(post._id, comment._id)}
                                      color={commentLikes[comment._id] ? "error" : "default"}
                                      sx={{ p: 0.5 }}
                                    >
                                      {commentLikes[comment._id] ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                    </IconButton>
                                    <Typography variant="caption" sx={{ mr: 0.5, fontSize: '0.7rem' }}>
                                      {comment.likesCount || 0}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleCommentMenuClick(e, comment)}
                                      sx={{ p: 0.5 }}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Button
                                    size="small"
                                    onClick={() => handleReplyToComment(comment._id)}
                                    sx={{ 
                                      textTransform: 'none',
                                      minWidth: 'auto',
                                      padding: '2px 8px',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Reply
                                  </Button>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        
                        {/* Reply Input */}
                        {replyingTo === comment._id && (
                          <Box sx={{ ml: 6, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <UserAvatar
                                user={user}
                                size={24}
                              />
                              <TextField
                                ref={replyInputRef}
                                fullWidth
                                size="small"
                                placeholder="Write a reply..."
                                value={replyTexts[comment._id] || ''}
                                onChange={(e) => setReplyTexts(prev => ({
                                  ...prev,
                                  [comment._id]: e.target.value
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReplySubmit(comment._id);
                                  }
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleReplySubmit(comment._id)}
                                disabled={!replyTexts[comment._id]?.trim()}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                              <Button
                                size="small"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        )}
                        
                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <Box sx={{ ml: 4 }}>
                            {/* Show only first reply or all replies if expanded */}
                            {(expandedReplies[comment._id] ? comment.replies : comment.replies.slice(0, 1)).map((reply) => (
                              <ListItem key={reply._id} alignItems="flex-start">
                                <ListItemAvatar>
                                  <UserAvatar
                                    user={reply.user || { name: 'Unknown User', _id: null }}
                                    size={24}
                                    onClick={() => reply.user?._id && navigate(`/profile/${reply.user._id}`)}
                                  />
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography 
                                        variant="subtitle2"
                                        onClick={() => reply.user?._id && navigate(`/profile/${reply.user._id}`)}
                                        sx={{ cursor: reply.user?._id ? 'pointer' : 'default', fontSize: '0.875rem' }}
                                      >
                                        {reply.user?.name || 'Unknown User'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem', flex: 1 }}>
                                          {reply.content}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleReplyLike(comment._id, reply._id)}
                                            color={commentLikes[reply._id] ? "error" : "default"}
                                            sx={{ p: 0.5 }}
                                          >
                                            {commentLikes[reply._id] ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                          </IconButton>
                                          <Typography variant="caption" sx={{ mr: 0.5, fontSize: '0.7rem' }}>
                                            {reply.likesCount || 0}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => handleReplyMenuClick(e, comment._id, reply._id)}
                                            sx={{ p: 0.5 }}
                                          >
                                            <MoreVertIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Button
                                          size="small"
                                          onClick={() => handleReplyToReply(comment._id, reply._id, reply.user?.name || 'Unknown User')}
                                          sx={{ 
                                            textTransform: 'none',
                                            minWidth: 'auto',
                                            padding: '2px 8px',
                                            fontSize: '0.75rem',
                                            mt: 0.5
                                          }}
                                        >
                                          Reply
                                        </Button>
                                      </Box>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                            
                            {/* View more replies button */}
                            {comment.replies.length > 1 && !expandedReplies[comment._id] && (
                              <Box sx={{ ml: 6, mt: 1 }}>
                                <Button
                                  size="small"
                                  onClick={() => setExpandedReplies(prev => ({ ...prev, [comment._id]: true }))}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    color: 'text.secondary'
                                  }}
                                >
                                  View {comment.replies.length - 1} more {comment.replies.length - 1 === 1 ? 'reply' : 'replies'}
                                </Button>
                              </Box>
                            )}
                            
                            {/* Hide replies button */}
                            {comment.replies.length > 1 && expandedReplies[comment._id] && (
                              <Box sx={{ ml: 6, mt: 1 }}>
                                <Button
                                  size="small"
                                  onClick={() => setExpandedReplies(prev => ({ ...prev, [comment._id]: false }))}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    color: 'text.secondary'
                                  }}
                                >
                                  Hide replies
                                </Button>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </List>
                )}
              </CardContent>
            </Collapse>
          </Card>
        ))
      )}

      {/* Post Menu */}
      <Menu
        anchorEl={postMenuAnchor}
        open={Boolean(postMenuAnchor)}
        onClose={handlePostMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon sx={{ mr: 1, color: '#e53e3e' }} />
          Delete Post
        </MenuItem>
      </Menu>

      {/* Comment Menu */}
      <Menu
        anchorEl={commentMenuAnchor}
        open={Boolean(commentMenuAnchor)}
        onClose={handleCommentMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Only show pin option if current user is the post author */}
        {(() => {
          const post = posts.find(p => p.comments.some(c => c._id === selectedComment?._id));
          return post && post.author._id === user?.id && (
            <MenuItem onClick={handlePinComment}>
              <PushPinIcon sx={{ mr: 1, color: selectedComment?.pinned ? '#1976d2' : '#666' }} />
              {selectedComment?.pinned ? 'Unpin Comment' : 'Pin Comment'}
            </MenuItem>
          );
        })()}
        <MenuItem onClick={handleDeleteComment}>
          <DeleteIcon sx={{ mr: 1, color: '#e53e3e' }} />
          Delete Comment
        </MenuItem>
      </Menu>

      {/* Reply Menu */}
      <Menu
        anchorEl={replyMenuAnchor}
        open={Boolean(replyMenuAnchor)}
        onClose={handleReplyMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteReply}>
          <DeleteIcon sx={{ mr: 1, color: '#e53e3e' }} />
          Delete Reply
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this post? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePost} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Community;