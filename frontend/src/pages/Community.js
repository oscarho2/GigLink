import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PushPin as PushPinIcon,
  Close as CloseIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import MentionRenderer from '../components/MentionRenderer';
import MentionInput from '../components/MentionInput';

import { instrumentOptions, genreOptions } from '../constants/musicOptions';

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

const Community = () => {
  const { user, token } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loadedCount, setLoadedCount] = useState(20);
  const loadStep = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const postsRef = useRef([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  const scrollDebounceRef = useRef(null);
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
  const [expandedTags, setExpandedTags] = useState({}); // Added
  const [mediaModal, setMediaModal] = useState({ open: false, mediaUrl: '', caption: '', currentIndex: 0, mediaType: 'image', postMedia: [] });
  const [imageDimensions, setImageDimensions] = useState({});
  const replyInputRef = useRef(null);

  const sortPostsByPin = useCallback((list = []) => {
    return [...list].sort((a, b) => {
      const aPinned = Boolean(a?.pinned);
      const bPinned = Boolean(b?.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      const aDate = aPinned ? new Date(a?.pinnedAt || a?.createdAt || 0) : new Date(a?.createdAt || 0);
      const bDate = bPinned ? new Date(b?.pinnedAt || b?.createdAt || 0) : new Date(b?.createdAt || 0);
      return bDate - aDate;
    });
  }, []);

  const updatePostsState = useCallback((updater) => {
    setPosts(prevPosts => {
      const basePosts = Array.isArray(prevPosts) ? prevPosts : [];
      const nextRaw = typeof updater === 'function' ? updater(basePosts) : updater;
      const normalized = Array.isArray(nextRaw) ? [...nextRaw] : [];
      const sorted = sortPostsByPin(normalized);
      postsRef.current = sorted;
      return sorted;
    });
  }, [sortPostsByPin, postsRef]);

  const isPostAuthor = (post) => {
    const author = post?.author || {};
    const authorId = typeof author === 'string'
      ? author
      : author._id || author.id || '';
    const currentUserId = user?._id || user?.id || '';
    return Boolean(authorId && currentUserId && authorId === currentUserId);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setHasMore(true);

      const queryParams = new URLSearchParams();
      
      if (filters.instruments.length > 0) {
        queryParams.append('instruments', filters.instruments.join(','));
      }
      if (filters.genres.length > 0) {
        queryParams.append('genres', filters.genres.join(','));
      }
      
      const url = `/api/posts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const serverPosts = Array.isArray(data) ? data : [];
        const sortedPosts = sortPostsByPin(serverPosts);
        setPosts(sortedPosts);
        postsRef.current = sortedPosts;
        setLoadedCount(Math.min(sortedPosts.length, loadStep));
        setPage(1);
        initCommentLikes(sortedPosts);
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
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Initialize commentLikes map helper
  const initCommentLikes = (postsArr) => {
    const initialCommentLikes = {};
    (postsArr || []).forEach(post => {
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
    });
    setCommentLikes(initialCommentLikes);
  };



  // Infinite scroll: observe sentinel to load more
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      const total = postsRef.current.length;
      if (loadingMore) return;
      setLoadingMore(true);
      // If we still have hidden items, just reveal next chunk
      if (loadedCount < total) {
        setTimeout(() => {
          setLoadedCount((prev) => Math.min(total, prev + loadStep));
          setLoadingMore(false);
        }, 150);
        return;
      }
      // Otherwise attempt to fetch/append more posts (like social feeds)
      loadMorePosts();
    }, { root: null, rootMargin: '600px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadedCount, loadingMore]);

  // Fallback window scroll listener for robustness across browsers
  useEffect(() => {
    const onScroll = () => {
      if (scrollDebounceRef.current) return;
      scrollDebounceRef.current = setTimeout(() => {
        scrollDebounceRef.current = null;
        const scrollY = window.scrollY || window.pageYOffset;
        const viewport = window.innerHeight || document.documentElement.clientHeight;
        const full = document.documentElement.scrollHeight || document.body.scrollHeight;
        if (full - (scrollY + viewport) < 800) {
          if (!loadingMore) {
            const total = postsRef.current.length;
            if (loadedCount < total) {
              setLoadingMore(true);
              setTimeout(() => {
                setLoadedCount((prev) => Math.min(total, prev + loadStep));
                setLoadingMore(false);
              }, 100);
            } else {
              setLoadingMore(true);
              loadMorePosts();
            }
          }
        }
      }, 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, [loadedCount, loadingMore]);

  const dedupeById = (items) => {
    const seen = new Set();
    const res = [];
    for (const it of items) {
      const id = it && (it._id || it.id);
      if (!id) { res.push(it); continue; }
      if (seen.has(id)) continue;
      seen.add(id);
      res.push(it);
    }
    return res;
  };

  const loadMorePosts = async () => {
    if (!hasMore) {
      setLoadingMore(false);
      return;
    }
    try {
      const nextPage = page + 1;
      const url = `/api/posts?page=${nextPage}&limit=${pageSize}`;
      const resp = await fetch(url, { headers: { 'x-auth-token': token } });
      let newItems = [];
      if (resp.ok) {
        const data = await resp.json();
        newItems = Array.isArray(data) ? data : [];
      }

      if (newItems.length === 0) {
        setHasMore(false);
      }

      const combined = dedupeById([...postsRef.current, ...newItems]);
      const sortedCombined = sortPostsByPin(combined);
      postsRef.current = sortedCombined;
      setPosts(sortedCombined);
      setPage(nextPage);
      setLoadedCount((prev) => Math.min(sortedCombined.length, prev + loadStep));
    } catch (e) {
      console.error('Error loading more posts:', e);
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (selectedFiles.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 photos.');
      return;
    }
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
        updatePostsState(prev => [newPost, ...prev]);
        setPostContent('');
        setSelectedFiles([]);
        setSelectedInstruments([]);
        setSelectedGenres([]);
        setCreatePostModalOpen(false);
        toast.success('Post created successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create post');
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
        updatePostsState(prev => prev.map(post => 
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
        updatePostsState(prev => prev.map(post => 
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
        updatePostsState(prev => prev.filter(post => post._id !== postToDelete));
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
    if (!selectedPost) return;
    setPostToDelete(selectedPost._id);
    setDeleteDialogOpen(true);
    handlePostMenuClose();
  };

  const handleTogglePinPost = async () => {
    if (!selectedPost) return;

    try {
      const response = await fetch(`/api/posts/${selectedPost._id}/pin`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        updatePostsState(prev => prev.map(post =>
          post._id === updatedPost._id ? updatedPost : post
        ));
        setSelectedPost(updatedPost);
        toast.success(updatedPost.pinned ? 'Post pinned' : 'Post unpinned');
      } else if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Not authorized to pin this post');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to update post pin state');
      }
    } catch (error) {
      console.error('Error toggling post pin:', error);
      toast.error('Failed to update post pin state');
    } finally {
      handlePostMenuClose();
    }
  };

  const handleCommentLike = async (postId, commentId) => {
    try {
      const isLiked = commentLikes[commentId];
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
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
        updatePostsState(prevPosts => 
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
        updatePostsState(prev => prev.map(p => 
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

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
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
      const response = await fetch(`/api/posts/${post._id}/comments/${selectedComment._id}/pin`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        updatePostsState(prev => prev.map(p => 
          p._id === updatedPost._id ? updatedPost : p
        ));
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

  const handleReplyLike = async (commentId, replyId) => {
    // Find the post that contains this comment and reply
    const post = posts.find(p => p.comments.some(c => c._id === commentId));
    if (!post) {
      toast.error('Post not found');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post._id}/comments/${commentId}/replies/${replyId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        updatePostsState(prevPosts => 
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
      const response = await fetch(`/api/posts/${post._id}/comments/${selectedCommentForReply}/replies/${selectedReply}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        updatePostsState(prevPosts => 
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
        updatePostsState(prev => prev.map(p => 
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

  const toggleTags = (postId) => { // Added
    setExpandedTags(prev => ({ // Added
      ...prev, // Added
      [postId]: !prev[postId] // Added
    })); // Added
  }; // Added

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

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Create Post Bar & Filter Section - Merged */}
      <Paper
        elevation={1}
        sx={{
          mb: 4,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Create Post Section */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UserAvatar
               user={user}
               size={48}
               mobileSize={40}
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
                color="text.secondary"
                sx={{ 
                  fontWeight: 'normal',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  lineHeight: { xs: 1.4, sm: 1.5 }
                }}
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
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.2 },
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                minHeight: { xs: 36, sm: 40 },
                minWidth: { xs: 'auto', sm: 'auto' },
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
        </Box>

        {/* Filter Section */}
        <Box 
          sx={{ 
            p: 1.5, 
            bgcolor: 'white', 
            borderTop: '1px solid #e2e8f0',
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
            <MentionInput
              fullWidth
              multiline
              minRows={4}
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
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload-modal"
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                <label htmlFor="file-upload-modal">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<AddIcon />}
                    sx={{
                      bgcolor: '#1a365d',
                      '&:hover': { bgcolor: '#2c5282' }
                    }}
                  >
                    Photo
                  </Button>
                </label>
              </Box>
              
              {selectedFiles.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Upload images to share with your post
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
        posts.slice(0, loadedCount).map((post) => {
          const author = post?.author || {};
          const authorId = author._id || author.id || '';
          const currentUserId = user?._id || user?.id || '';
          const canManagePost = isPostAuthor(post) || isAdmin;
          const authorProfileLink = authorId ? `/profile/${authorId}` : null;
          const authorName = author.name || 'Unknown User';
          const postTimestamp = post.createdAt ? new Date(post.createdAt) : null;

          return (
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
              {post.pinned && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 3, pt: 2 }}>
                  <Chip
                    icon={<PushPinIcon fontSize="small" />}
                    label="Pinned"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 600, '& .MuiChip-icon': { color: '#b7791f !important' } }}
                  />
                </Box>
              )}
              <CardHeader
                avatar={
                  <UserAvatar 
                    user={author}
                    size={48}
                    mobileSize={40}
                    onClick={() => authorProfileLink && navigate(authorProfileLink)}
                  />
                }
                title={
                  <Typography 
                    variant="h6" 
                    onClick={() => authorProfileLink && navigate(authorProfileLink)}
                    sx={{ 
                      cursor: authorProfileLink ? 'pointer' : 'default',
                      fontWeight: 'bold',
                      color: '#1a365d'
                    }}
                  >
                    {authorName}
                  </Typography>
                }
                subheader={
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                    {postTimestamp ? formatDistanceToNow(postTimestamp, { addSuffix: true }) : 'Just now'}
                  </Typography>
                }
                action={
                  canManagePost ? (
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
                  ) : null
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
                  <MentionRenderer 
                    content={post.parsedContent || post.content}
                    mentions={post.mentions || []}
                    variant="link"
                  />
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
                    {post.comments
                      .sort((a, b) => {
                        const aIsPinned = a.pinned;
                        const bIsPinned = b.pinned;
                        if (aIsPinned && !bIsPinned) return -1;
                        if (!aIsPinned && bIsPinned) return 1;
                        // If both have same pin status, sort by creation date (newest first)
                        return new Date(b.createdAt) - new Date(a.createdAt);
                      })
                      .map((comment) => {
                        const commentUser = comment?.user || {};
                        const commentUserId = commentUser._id || commentUser.id || '';
                        const commentProfileLink = commentUserId ? `/profile/${commentUserId}` : null;
                        const commentUserName = commentUser.name || 'Unknown User';
                        const commentTimestamp = comment.createdAt ? new Date(comment.createdAt) : null;

                        return (
                          <Box key={comment._id}>
                            <ListItem alignItems="flex-start">
                              <ListItemAvatar>
                                <UserAvatar
                                  user={commentUser}
                                  size={32}
                                  onClick={() => commentProfileLink && navigate(commentProfileLink)}
                                />
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                      variant="subtitle2"
                                      onClick={() => commentProfileLink && navigate(commentProfileLink)}
                                      sx={{ cursor: commentProfileLink ? 'pointer' : 'default' }}
                                    >
                                      {commentUserName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {commentTimestamp ? formatDistanceToNow(commentTimestamp, { addSuffix: true }) : 'Just now'}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                      <Typography variant="body2" component="div" sx={{ fontSize: '1.1rem', mr: 2 }}>
                                        <MentionRenderer 
                                          content={comment.parsedContent || comment.content}
                                          mentions={comment.mentions || []}
                                          variant="link"
                                        />
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
                              <MentionInput
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
                            {(expandedReplies[comment._id] ? comment.replies : comment.replies.slice(0, 1)).map((reply) => {
                              const replyUser = reply?.user || {};
                              const replyUserId = replyUser._id || replyUser.id || '';
                              const replyProfileLink = replyUserId ? `/profile/${replyUserId}` : null;
                              const replyUserName = replyUser.name || 'Unknown User';
                              const replyTimestamp = reply.createdAt ? new Date(reply.createdAt) : null;

                              return (
                                <ListItem key={reply._id} alignItems="flex-start">
                                  <ListItemAvatar>
                                    <UserAvatar
                                      user={replyUser}
                                      size={24}
                                      onClick={() => replyProfileLink && navigate(replyProfileLink)}
                                    />
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography 
                                          variant="subtitle2"
                                          onClick={() => replyProfileLink && navigate(replyProfileLink)}
                                          sx={{ cursor: replyProfileLink ? 'pointer' : 'default', fontSize: '0.875rem' }}
                                        >
                                          {replyUserName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {replyTimestamp ? formatDistanceToNow(replyTimestamp, { addSuffix: true }) : 'Just now'}
                                        </Typography>
                                      </Box>
                                    }
                                    secondary={
                                      <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                          <Typography variant="body2" component="div" sx={{ fontSize: '0.875rem', flex: 1 }}>
                                            <MentionRenderer 
                                              content={reply.parsedContent || reply.content}
                                              mentions={reply.mentions || []}
                                              variant="link"
                                            />
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
                                            onClick={() => handleReplyToReply(comment._id, reply._id, replyUserName)}
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
                              );
                            })}
                            
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
                        );
                      })}
                  </List>
                )}
              </CardContent>
            </Collapse>
          </Card>
        );
        })
      )}
      {/* Infinite scroll sentinel */}
      <Box ref={sentinelRef} sx={{ height: 1 }} />
      {loadingMore && hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
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
        {selectedPost && (isPostAuthor(selectedPost) || isAdmin) && (
          <MenuItem onClick={handleTogglePinPost}>
            <PushPinIcon sx={{ mr: 1, color: selectedPost.pinned ? '#1a365d' : '#666' }} />
            {selectedPost.pinned ? 'Unpin Post' : 'Pin Post'}
          </MenuItem>
        )}
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
        {/* Only show pin option if current user is the post author or admin */}
        {(() => {
          const post = posts.find(p => p.comments.some(c => c._id === selectedComment?._id));
          const canPinComment = post && (isPostAuthor(post) || isAdmin);
          return canPinComment && (
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

      {/* Media Gallery Modal */}
      <Dialog
        open={mediaModal.open}
        onClose={closeMediaModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible'
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={closeMediaModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          {(() => {
            const postMedia = mediaModal.postMedia || [];
            return postMedia.length > 1 && (
              <>
                <IconButton
                  onClick={() => navigateMedia('prev')}
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)'
                    }
                  }}
                >
                  <ArrowBackIosIcon />
                </IconButton>
                <IconButton
                  onClick={() => navigateMedia('next')}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)'
                    }
                  }}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </>
            );
          })()} 
          
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
