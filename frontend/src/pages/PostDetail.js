import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Avatar,
  Chip,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Collapse,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  Grid
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon,
  PushPin as PushPinIcon,
  Close as CloseIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import MentionRenderer from '../components/MentionRenderer';
import MentionInput from '../components/MentionInput';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Added
import ExpandLessIcon from '@mui/icons-material/ExpandLess'; // Added

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

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [replyMenuAnchor, setReplyMenuAnchor] = useState(null);
  const [selectedReply, setSelectedReply] = useState(null);
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);
  const [postMenuAnchor, setPostMenuAnchor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [mediaModal, setMediaModal] = useState({ open: false, mediaUrl: '', caption: '', currentIndex: 0, mediaType: 'image', postMedia: [] });
  const [imageDimensions, setImageDimensions] = useState({});
  const [commentLikes, setCommentLikes] = useState({});

  const isAdmin = Boolean(user?.isAdmin);

  const isPostAuthor = (post) => {
    const author = post?.author || {};
    const authorId = typeof author === 'string'
      ? author
      : author._id || author.id || '';
    const currentUserId = user?._id || user?.id || '';
    return Boolean(authorId && currentUserId && authorId === currentUserId);
  };

  const initCommentLikes = (post) => {
    const initialCommentLikes = {};
    (post.comments || []).forEach(comment => {
      initialCommentLikes[comment._id] = comment.isLikedByUser || false;
      if (comment.replies) {
        comment.replies.forEach(reply => {
          if (reply.isLikedByUser !== undefined) {
            initialCommentLikes[reply._id] = reply.isLikedByUser;
          }
        });
      }
    });
    setCommentLikes(initialCommentLikes);
  };

  const [expandedTags, setExpandedTags] = useState(false); // Added

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const postData = await response.json();
        setPost(postData);
        initCommentLikes(postData);
      } else if (response.status === 404) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const toggleTags = () => { // Added
    setExpandedTags(prev => !prev); // Added
  }; // Added

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

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
        setPost(updatedPost);
        setCommentText('');
        toast.success('Comment added successfully!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to update comment like');
    }
  };

  const handleReply = async (commentId) => {
    const replyText = replyTexts[commentId];
    if (!replyText?.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content: replyText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        setReplyingTo(null);
        toast.success('Reply added successfully!');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleReplyLike = async (commentId, replyId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking reply:', error);
      toast.error('Failed to update reply like');
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleCommentMenuClick = (event, comment) => {
    setMenuAnchor(event.currentTarget);
    setSelectedComment(comment);
  };

  const handleCommentMenuClose = () => {
    setMenuAnchor(null);
    setSelectedComment(null);
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${selectedComment._id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
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

  const handlePinComment = async () => {
    if (!selectedComment) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${selectedComment._id}/pin`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        const comment = updatedPost.comments.find(c => c._id === selectedComment._id);
        toast.success(comment?.pinned ? 'Comment pinned' : 'Comment unpinned');
      } else if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Only the post author or an admin can pin comments');
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
        toast.success('Post deleted successfully');
        navigate('/community');
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const normalizeMediaUrl = (url) => {
    if (!url) return '';
    
    let normalizedUrl;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      normalizedUrl = convertR2PublicUrlToProxy(url);
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

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${selectedCommentForReply}/replies/${selectedReply}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
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



  const handleImageLoad = (postId, index, event) => {
    const img = event.target;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const uniqueKey = `${postId}-${index}`;
    setImageDimensions(prev => ({
      ...prev,
      [uniqueKey]: { aspectRatio, isVertical: aspectRatio < 1 }
    }));
  };

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

  const renderPhotoGrid = (images, post) => {
    const imageCount = images.length;

    if (imageCount === 1) {
      const normalizedUrl = normalizeMediaUrl(images[0].url);
      return (
        <Box sx={{ width: '100%', maxWidth: '500px', mx: 'auto' }}>
          <img
            src={normalizedUrl}
            alt="Post media"
            onClick={() => openMediaModal(normalizedUrl, images[0].caption || '', 0, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}            onLoad={(e) => handleImageLoad(post._id, 0, e)}
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
      return (
        <Box sx={{ display: 'flex', gap: 1, maxWidth: '500px', mx: 'auto' }}>
          {images.map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index} sx={{ flex: 1 }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}                  onLoad={(e) => handleImageLoad(post._id, index, e)}
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
              onClick={() => openMediaModal(normalizeMediaUrl(images[0].url), images[0].caption || '', 0, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}              onLoad={(e) => handleImageLoad(post._id, 0, e)}
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
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index + 1, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}                  onLoad={(e) => handleImageLoad(post._id, index + 1, e)}
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
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxWidth: '500px', mx: 'auto', aspectRatio: '1' }}>
          {images.map((image, index) => {
            const normalizedUrl = normalizeMediaUrl(image.url);
            return (
              <Box key={index} sx={{ aspectRatio: '1', overflow: 'hidden', borderRadius: '8px' }}>
                <img
                  src={normalizedUrl}
                  alt="Post media"
                  onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}                  onLoad={(e) => handleImageLoad(post._id, index, e)}
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

    if (imageCount >= 5) {
      const displayImages = images.slice(0, 5);
      const remainingCount = imageCount - 5;

      return (
        <Box sx={{ maxWidth: '500px', mx: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
            {displayImages.slice(0, 2).map((image, index) => {
              const normalizedUrl = normalizeMediaUrl(image.url);
              return (
                <Box key={index} sx={{ aspectRatio: '1.5', overflow: 'hidden', borderRadius: '8px' }}>
                  <img
                    src={normalizedUrl}
                    alt="Post media"
                    onClick={() => openMediaModal(normalizedUrl, image.caption || '', index, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                  />
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            {displayImages.slice(2, 5).map((image, index) => {
              const actualIndex = index + 2;
              const isOverlay = actualIndex === 4 && remainingCount > 0;
              const normalizedUrl = normalizeMediaUrl(image.url);

              return (
                <Box key={actualIndex} sx={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '8px' }}>
                  <img
                    src={normalizedUrl}
                    alt="Post media"
                    onClick={() => openMediaModal(normalizedUrl, image.caption || '', actualIndex, 'image', post.media.map(m => ({ ...m, url: normalizeMediaUrl(m.url), caption: m.caption || '' })))}                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      filter: isOverlay ? 'brightness(0.5)' : 'none',
                    }}
                  />
                  {isOverlay && (
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
                        fontSize: '2rem',
                        fontWeight: 'bold',
                      }}
                    >
                      +{remainingCount}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    }

    return null;
  };

  const renderMedia = (post) => {
    if (!post.media || post.media.length === 0) return null;

    const images = post.media.filter(item => item.type === 'image');
    const otherMedia = post.media.filter(item => item.type !== 'image');

    return (
      <Box>
        {images.length > 0 && (
          <Box sx={{ mb: otherMedia.length > 0 ? 2 : 0 }}>
            {renderPhotoGrid(images, post)}
          </Box>
        )}
        
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
                      objectFit: 'contain',
                      cursor: 'pointer'
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

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Post not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card>
        <CardContent>
          {/* Post Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <UserAvatar
              user={post.author}
              size={40}
              sx={{ mr: 2 }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                {post.author.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
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
          </Box>

          {/* Post Content */}
          {post.content && (
            <Typography variant="body1" component="div" sx={{ mb: 2 }}>
              <MentionRenderer 
                content={post.parsedContent || post.content}
                mentions={post.mentions || []}
                variant="link"
              />
            </Typography>
          )}

          {/* Post Media */}
          {post.media && post.media.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {renderMedia(post)}
            </Box>
          )}


        </CardContent>

        <CardActions disableSpacing>
          <IconButton
            onClick={handleLike}
            color={post.isLikedByUser ? "error" : "default"}
          >
            {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {post.likesCount}
          </Typography>
          
          <IconButton>
            <CommentIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {post.commentsCount}
          </Typography>

          {(post.instruments?.length > 0 || post.genres?.length > 0) && (
            <IconButton
              onClick={toggleTags}
              aria-expanded={expandedTags}
              aria-label="show tags"
            >
              {expandedTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </CardActions>

        <Collapse in={expandedTags} timeout="auto" unmountOnExit>
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
              <Box sx={{ mt: 2 }}>
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

        {/* Comments Section */}
        <CardContent>
          {/* Comment Input */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <UserAvatar
              user={user}
              size={32}
              sx={{ mr: 1 }}
            />
            <MentionInput
              fullWidth
              size="small"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <IconButton
              onClick={handleComment}
              disabled={!commentText.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 && (
            <List>
              {post.comments
                .sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return new Date(a.createdAt) - new Date(b.createdAt);
                })
                .map((comment) => (
                  <ListItem key={comment._id} alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <UserAvatar
                        user={comment.user}
                        size={32}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {comment.user.name}
                          </Typography>
                          {comment.pinned && (
                            <Chip
                              icon={<PushPinIcon fontSize="small" />}
                              label="Pinned"
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontWeight: 600, 
                                color: 'grey', 
                                borderColor: 'grey',
                                '& .MuiChip-icon': { color: 'grey !important' } 
                              }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography component="div" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                            <MentionRenderer 
                              content={comment.parsedContent || comment.content}
                              mentions={comment.mentions || []}
                              variant="link"
                            />
                          </Typography>
                          
                          {/* Comment Actions */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleCommentLike(comment._id)}
                              color={comment.isLikedByUser ? "error" : "default"}
                            >
                              {comment.isLikedByUser ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                            <Typography variant="caption">
                              {comment.likesCount}
                            </Typography>

                            <IconButton
                              size="small"
                              onClick={(e) => handleCommentMenuClick(e, comment)}
                              sx={{ p: 0.5 }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                            
                            <IconButton
                              size="small"
                              onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            >
                              <ReplyIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="caption">
                              Reply
                            </Typography>
                            
                            {comment.replies?.length > 0 && (
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment._id)}
                                sx={{ ml: 1 }}
                              >
                                {expandedReplies[comment._id] ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                              </Button>
                            )}
                          </Box>

                          {/* Reply Input */}
                          <Collapse in={replyingTo === comment._id} timeout="auto" unmountOnExit>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, ml: 4 }}>
                              <UserAvatar
                                user={user}
                                size={24}
                                sx={{ mr: 1 }}
                              />
                              <MentionInput
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
                                    handleReply(comment._id);
                                  }
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleReply(comment._id)}
                                disabled={!replyTexts[comment._id]?.trim()}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Collapse>

                          {/* Replies */}
                          <Collapse in={expandedReplies[comment._id]} timeout="auto" unmountOnExit>
                            <Box sx={{ ml: 4, mt: 2 }}>
                              {comment.replies?.map((reply) => (
                                <Box key={reply._id} sx={{ display: 'flex', mb: 2 }}>
                                  <UserAvatar
                                    user={reply.user}
                                    size={24}
                                    sx={{ mr: 1 }}
                                  />
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="caption" fontWeight="bold">
                                        {reply.user.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.875rem' }}>
                                      {reply.content}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleReplyLike(comment._id, reply._id)}
                                        color={reply.isLikedByUser ? "error" : "default"}
                                      >
                                        {reply.isLikedByUser ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                      </IconButton>
                                      <Typography variant="caption">
                                        {reply.likesCount}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleReplyMenuClick(e, comment._id, reply._id)}
                                        sx={{ p: 0.5, ml: 1 }}
                                      >
                                        <MoreVertIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    <Button
                                      size="small"
                                      onClick={() => handleReplyToReply(comment._id, reply._id, reply.user.name)}
                                      sx={{ textTransform: 'none', minWidth: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}
                                    >
                                      Reply
                                    </Button>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          </Collapse>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </CardContent>
      </Card>

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

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCommentMenuClose}
      >
        <MenuItem onClick={handlePinComment}>
          <PushPinIcon sx={{ mr: 1 }} />
          {selectedComment?.pinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem onClick={handleDeleteComment} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={replyMenuAnchor}
        open={Boolean(replyMenuAnchor)}
        onClose={handleReplyMenuClose}
      >
        <MenuItem onClick={handleDeleteReply} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={postMenuAnchor}
        open={Boolean(postMenuAnchor)}
        onClose={handlePostMenuClose}
      >
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Post
        </MenuItem>
      </Menu>

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

export default PostDetail;
