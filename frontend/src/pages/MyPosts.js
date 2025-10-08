import React, { useState, useEffect } from 'react';
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
  Menu,
  MenuItem
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import { instrumentOptions, genreOptions } from '../constants/musicOptions';
import MentionInput from '../components/MentionInput';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '') || '').replace(/\/$/, '');

const encodeKey = (key) => key.split('/').map(segment => encodeURIComponent(segment)).join('/');

const convertR2PublicUrlToProxy = (url) => {
  if (!url) {
    return '';
  }

  const match = url.match(/\.r2\.dev\/[\w-]+\/(.+)$/);
  if (match && match[1]) {
    return `/api/media/r2/${encodeKey(match[1])}`;
  }

  return url;
};

const toAbsoluteUrl = (relativePath) => {
  if (!relativePath) {
    return '';
  }

  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const absolute = `${API_BASE_URL}${normalizedPath}`;
  return convertR2PublicUrlToProxy(absolute);
};

const MyPosts = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [postMenuAnchor, setPostMenuAnchor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [expandedTags, setExpandedTags] = useState({});
  const [mediaModal, setMediaModal] = useState({ open: false, mediaUrl: '', caption: '', currentIndex: 0, mediaType: 'image', postMedia: [] });
  const [imageDimensions, setImageDimensions] = useState({});

  // Options imported from centralized constants

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter to show only current user's posts
        const myPosts = data.filter(post => post.author._id === user?.id);
        setPosts(myPosts);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load your posts');
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

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const toggleTags = (postId) => {
    setExpandedTags(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Gallery modal functions
  const openMediaModal = (mediaUrl, caption = '', index, mediaType = 'image', postMedia = []) => {
    setMediaModal({ open: true, mediaUrl, caption, currentIndex: index, mediaType, postMedia });
  };

  const closeMediaModal = () => {
    setMediaModal({ open: false, mediaUrl: '', caption: '', currentIndex: 0, mediaType: 'image', postMedia: [] });
  };

  const navigateMedia = (direction) => {
    const postMedia = mediaModal.postMedia;
    if (!postMedia || postMedia.length <= 1) return;
    
    const newIndex = direction === 'next' 
      ? (mediaModal.currentIndex + 1) % postMedia.length
      : (mediaModal.currentIndex - 1 + postMedia.length) % postMedia.length;
    
    const newMedia = postMedia[newIndex];
    setMediaModal({
      ...mediaModal,
      mediaUrl: newMedia.url,
      caption: newMedia.caption || '',
      currentIndex: newIndex,
      mediaType: newMedia.type
    });
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

  const handleImageLoad = (postId, index, event) => {
    const img = event.target;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const uniqueKey = `${postId}-${index}`;
    setImageDimensions(prev => ({
      ...prev,
      [uniqueKey]: { aspectRatio, isVertical: aspectRatio < 1 }
    }));
  };

  // Helper function to normalize media URLs
  const normalizeMediaUrl = (url) => {
    if (!url) return '';
    
    let normalizedUrl;
    // If URL already starts with http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      normalizedUrl = convertR2PublicUrlToProxy(url);
      // For legacy relative paths stored as absolute URLs ensure they include images folder
      if (normalizedUrl.includes('/uploads/') && !normalizedUrl.includes('/uploads/images/') && !normalizedUrl.includes('/uploads/posts/')) {
        normalizedUrl = normalizedUrl.replace('/uploads/', '/uploads/images/');
      }
    } else if (url.startsWith('/')) {
      let path = url;
      if (path.includes('/uploads/') && !path.includes('/uploads/images/') && !path.includes('/uploads/posts/')) {
        path = path.replace('/uploads/', '/uploads/images/');
      }
      normalizedUrl = toAbsoluteUrl(path);
    } else {
      let path = url;
      if (path.startsWith('uploads/')) {
        path = `/${path}`;
      } else if (path.startsWith('images/') || path.startsWith('posts/')) {
        path = `/uploads/${path}`;
      } else {
        path = `/uploads/images/${path}`;
      }

      if (path.includes('/uploads/') && !path.includes('/uploads/images/') && !path.includes('/uploads/posts/')) {
        path = path.replace('/uploads/', '/uploads/images/');
      }

      normalizedUrl = toAbsoluteUrl(path);
    }

    return convertR2PublicUrlToProxy(normalizedUrl);
  };

  const renderPhotoGrid = (images, post) => {
    const imageCount = images.length;
    
    if (imageCount === 1) {
      // Single image - standardized size with better vertical support
      const normalizedUrl = normalizeMediaUrl(images[0].url);
      return (
        <Box sx={{ width: '100%', maxWidth: '500px', mx: 'auto' }}>
          <img
            src={normalizedUrl}
            alt="Post media"
            onClick={() => openMediaModal(normalizedUrl, images[0].caption || '', 0, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
            onLoad={(e) => handleImageLoad(post._id, 0, e)}
            onError={(e) => {
              console.error('Image failed to load:', normalizedUrl);
              e.target.style.display = 'none';
            }}
            style={{
              width: '100%',
              height: '500px',
              objectFit: 'cover',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          />
        </Box>
      );
    }
    
    if (imageCount === 2) {
      // Two images - side by side
      return (
        <Box sx={{ display: 'flex', gap: 1, maxWidth: '500px', mx: 'auto' }}>
          {images.map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index} sx={{ flex: 1 }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  onLoad={(e) => handleImageLoad(post._id, index, e)}
                  onError={(e) => {
                    console.error('Image failed to load:', normalizedUrl);
                    e.target.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    height: '250px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              </Box>
            );
          })}
        </Box>
      );
    }
    
    if (imageCount === 3) {
      // Three images - CSS grid layout for perfect alignment
      return (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gridTemplateRows: '1fr 1fr',
          gap: 1, 
          maxWidth: '500px', 
          mx: 'auto', 
          height: '300px' 
        }}>
          <Box sx={{ gridRow: '1 / 3', overflow: 'hidden', borderRadius: '8px' }}>
            <img
              src={normalizeMediaUrl(images[0].url)}
              alt="Post media"
              onClick={() => openMediaModal(normalizeMediaUrl(images[0].url), images[0].caption || '', 0, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
              onLoad={(e) => handleImageLoad(post._id, 0, e)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            />
          </Box>
          {images.slice(1).map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index + 1} sx={{ overflow: 'hidden', borderRadius: '8px' }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index + 1, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  onLoad={(e) => handleImageLoad(post._id, index + 1, e)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
              </Box>
            );
          })}
        </Box>
      );
    }
    
    if (imageCount === 4) {
      // Four images - 2x2 grid with better aspect ratio
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxWidth: '500px', mx: 'auto', aspectRatio: '1' }}>
          {images.map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index} sx={{ aspectRatio: '1', overflow: 'hidden', borderRadius: '8px' }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  onLoad={(e) => handleImageLoad(post._id, index, e)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
              </Box>
            );
          })}
        </Box>
      );
    }
    
    // Five or more images - 2 large on top, 3+ smaller below
    return (
      <Box sx={{ maxWidth: '500px', mx: 'auto' }}>
        {/* Top row - 2 large images */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {images.slice(0, 2).map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index} sx={{ flex: 1 }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  onLoad={(e) => handleImageLoad(post._id, index, e)}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              </Box>
            );
          })}
        </Box>
        
        {/* Bottom row - remaining images with consistent aspect ratio */}
        <Box sx={{ display: 'grid', gridTemplateColumns: imageCount === 5 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 1 }}>
          {images.slice(2, imageCount === 5 ? 5 : 6).map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            const actualIndex = index + 2;
            const isLast = actualIndex === 5 && imageCount > 6;
            
            return (
              <Box key={actualIndex} sx={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '8px' }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', actualIndex, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  onLoad={(e) => handleImageLoad(post._id, actualIndex, e)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    filter: isLast ? 'brightness(0.6)' : 'none',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => !isLast && (e.target.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => !isLast && (e.target.style.transform = 'scale(1)')}
                />
                {isLast && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '8px'
                    }}
                    onClick={() => openMediaModal(normalizedUrl, image.caption || '', actualIndex, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                  >
                    +{imageCount - 6}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderMedia = (post) => {
    if (!post.media || post.media.length === 0) return null;

    // Separate images from other media types
    const images = post.media.filter(item => item.type === 'image');
    const otherMedia = post.media.filter(item => item.type !== 'image');

    return (
      <Box>
        {/* Render photo grid for images */}
        {images.length > 0 && (
          <Box sx={{ mb: otherMedia.length > 0 ? 2 : 0 }}>
            {renderPhotoGrid(images, post)}
          </Box>
        )}
        
        {/* Render other media types (videos, etc.) individually */}
        {otherMedia.length > 0 && (
          <Grid container spacing={1} sx={{ justifyContent: 'center' }}>
            {otherMedia.map((item, index) => {
              const actualIndex = images.length + index;
              const normalizedUrl = normalizeMediaUrl(item.url);
              
              return (
                <Grid item xs={12} sm={8} md={6} key={actualIndex} sx={{ textAlign: 'center', position: 'relative' }}>
                  <video
                    controls
                    onClick={() => openMediaModal(normalizedUrl, item.caption || '', actualIndex, 'video', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}
                    style={{
                      width: '80%',
                      maxWidth: '400px',
                      height: 'auto',
                      borderRadius: '8px',
                      maxHeight: '300px',
                      objectFit: 'contain'
                    }}
                  >
                    <source src={normalizedUrl} />
                    Your browser does not support the video tag.
                  </video>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
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
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/community')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          My Posts
        </Typography>
      </Box>

      {/* Create Post Bar */}
      <Paper
        elevation={1}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UserAvatar
              user={user}
              size={48}
              onClick={() => navigate(`/profile/${user?._id || user?.id}`)}
            />
            <Box
              onClick={() => setCreatePostModalOpen(true)}
              sx={{
                flexGrow: 1,
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 4, sm: 6 },
                border: '1px solid #e2e8f0',
                bgcolor: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: { xs: 44, sm: 48 },
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                  borderColor: '#cbd5e0'
                }
              }}
            >
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#718096',
                  fontSize: { xs: '0.95rem', sm: '1rem' }
                }}
              >
                What's on your mind? Share your musical journey...
              </Typography>
            </Box>
          </Box>
        </Box>
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
            <MentionInput
              fullWidth
              multiline
              rows={4}
              placeholder="What's on your mind? Share your musical journey..."
              value={postContent}
              onChange={(e) => {
                setPostContent(e.target.value);
              }}
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
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={instrumentOptions}
                  value={selectedInstruments}
                  onChange={(event, newValue) => setSelectedInstruments(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Instruments"
                      placeholder="Select instruments"
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
                      <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genres"
                      placeholder="Select genres"
                    />
                  )}
                />
              </Grid>
            </Grid>
            
            {/* Media Upload Section */}
            <Typography variant="h6" sx={{ mb: 2, color: '#1a365d', fontWeight: 'bold' }}>
              Media (Optional)
            </Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                mb: 3, 
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
                accept="image/*,video/*,audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="media-upload"
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                <label htmlFor="media-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<AddIcon />}
                    sx={{
                      bgcolor: '#1a365d',
                      '&:hover': { bgcolor: '#2c5282' }
                    }}
                  >
                    Add Media
                  </Button>
                </label>
              </Box>
              
              {selectedFiles.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Upload images, videos, or audio files to share with your post
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
        <DialogActions>
          <Button onClick={() => setCreatePostModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitPost}
            variant="contained"
            disabled={submitting || (!postContent.trim() && selectedFiles.length === 0)}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
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
            You haven't created any posts yet. Share your musical journey with the community!
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
              }
              sx={{ pb: 1 }}
            />
            
            <CardContent sx={{ pt: 0, px: 3, pb: 2 }}>
              <Typography 
                variant="body1" 
                component="div"
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
                  {renderMedia(post)}
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
              
              {(post.instruments?.length > 0 || post.genres?.length > 0) && (
                <IconButton
                  onClick={() => toggleTags(post._id)}
                  aria-expanded={expandedTags[post._id]}
                  aria-label="show tags"
                >
                  {expandedTags[post._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </CardActions>

            <Collapse in={expandedTags[post._id]} timeout="auto" unmountOnExit>
              <CardContent>
                {post.instruments?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Instruments:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {post.instruments.map((instrument, index) => (
                        <Chip
                          key={`instrument-${index}`}
                          label={instrument}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {post.genres?.length > 0 && (
                  <Box sx={{ mt: post.instruments?.length > 0 ? 2 : 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Genres:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {post.genres.map((genre, index) => (
                        <Chip
                          key={`genre-${index}`}
                          label={genre}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Collapse>

            <Collapse in={expandedComments[post._id]} timeout="auto" unmountOnExit>
              <CardContent>
                {/* Comment Input */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UserAvatar
                    user={user}
                    size={32}
                    sx={{ mr: 1 }}
                  />
                  <MentionInput
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
                    {post.comments.map((comment) => (
                      <ListItem key={comment._id} alignItems="flex-start">
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
                              <Typography variant="subtitle2">
                                {comment.user.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                          secondary={comment.content}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Collapse>
          </Card>
        ))
      )}

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

        {/* Media Gallery Modal */}
        <Dialog
          open={mediaModal.open}
          onClose={closeMediaModal}
          maxWidth="lg"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              color: 'white'
            }
          }}
        >
          <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <IconButton
              onClick={closeMediaModal}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                zIndex: 1
              }}
            >
              <CloseIcon />
            </IconButton>
            
            {/* Navigation arrows */}
            {mediaModal.postMedia && mediaModal.postMedia.length > 1 && (
              <>
                <IconButton
                  onClick={() => navigateMedia('prev')}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                    zIndex: 1
                  }}
                >
                  <ArrowBackIosIcon />
                </IconButton>
                <IconButton
                  onClick={() => navigateMedia('next')}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                    zIndex: 1
                  }}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </>
            )}
            
            {mediaModal.mediaType === 'image' ? (
              <Box
                component="img"
                src={mediaModal.mediaUrl}
                alt={mediaModal.caption || 'Post media'}
                sx={{
                  width: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 2
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '80vh',
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <video
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                >
                  <source src={mediaModal.mediaUrl} />
                  Your browser does not support the video tag.
                </video>
              </Box>
            )}
            
            {mediaModal.caption && mediaModal.mediaType === 'image' && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  p: 2,
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8
                }}
              >
                <Typography variant="body1">
                  {mediaModal.caption}
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>

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
      </Container>
    );
};

export default MyPosts;
