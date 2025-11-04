import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

const UserLinks = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [user, setUser] = useState(null);
  const [links, setLinks] = useState([]);
  const [mutualLinks, setMutualLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getEntityId = (entity) => {
    if (!entity) {
      return null;
    }
    if (typeof entity === 'string') {
      return entity;
    }
    return entity._id || entity.id || null;
  };

  const ensureUserObject = (entity) => {
    if (!entity) {
      return null;
    }

    if (typeof entity === 'string') {
      return {
        _id: getEntityId(entity),
        avatar: '',
        profilePicture: ''
      };
    }

    const avatar = entity.avatar || entity.profilePicture || '';

    return {
      ...entity,
      avatar,
      profilePicture: entity.profilePicture || avatar
    };
  };

  useEffect(() => {
    fetchUserAndLinks();
  }, [userId, token]);

  const fetchUserAndLinks = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('token');
      
      // Fetch user profile
      const userResponse = await fetch(`/api/users/${userId}`);
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const userData = await userResponse.json();
      setUser(userData);
 
      // Fetch user's links (the viewed user's connections)
      const linksResponse = await fetch(`/api/links/user/${userId}`, {
        headers: {
          'x-auth-token': authToken
        }
      });
      
      if (!linksResponse.ok) {
        throw new Error('Failed to fetch user links');
      }
      
      const linksData = await linksResponse.json();
      setLinks(linksData);

      // Fetch current (authenticated) user's links to compute mutual links
      let myLinksData = { links: [] };
      try {
        const myLinksResponse = await fetch(`/api/links/links`, {
          headers: {
            'x-auth-token': authToken
          }
        });
        if (myLinksResponse.ok) {
          myLinksData = await myLinksResponse.json();
        }
      } catch (e) {
        // If this fails, we can still render the page without mutual links
        console.warn('Failed to fetch current user links for mutual calculation:', e);
      }

      // Build sets of connection ids for intersection
      const normalizedUserId = userId?.toString();
      const targetConnections = linksData
        .map(link => {
          const requester = ensureUserObject(link.requester);
          const recipient = ensureUserObject(link.recipient);
          const requesterId = getEntityId(requester);
          const recipientId = getEntityId(recipient);
          if (requesterId && requesterId === normalizedUserId) {
            return recipient;
          }
          if (recipientId && recipientId === normalizedUserId) {
            return requester;
          }
          return requester;
        })
        .filter(Boolean);

      const myLinkIds = new Set(
        (myLinksData.links || [])
          .map(item => getEntityId(item.link))
          .filter(Boolean)
          .map(id => id.toString())
      );
      const mutualCandidates = targetConnections.filter(u => {
        const connectionId = getEntityId(u);
        return connectionId && myLinkIds.has(connectionId.toString());
      });

      const seenMutualIds = new Set();
      const dedupedMutual = [];

      mutualCandidates.forEach((candidate) => {
        const ensuredCandidate = ensureUserObject(candidate);
        const candidateId = getEntityId(ensuredCandidate);
        if (!candidateId) {
          return;
        }
        const key = candidateId.toString();
        if (seenMutualIds.has(key)) {
          return;
        }
        seenMutualIds.add(key);
        dedupedMutual.push(ensuredCandidate);
      });

      setMutualLinks(dedupedMutual);
    } catch (error) {
      console.error('Error fetching user links:', error);
      setError(error.message);
      toast.error('Failed to load user links');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (target) => {
    const id = getEntityId(target);
    if (id) {
      navigate(`/profile/${id}`);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const mutualIdSet = new Set(
    mutualLinks
      .map((m) => getEntityId(m))
      .filter(Boolean)
      .map((id) => id.toString())
  );

  const normalizedViewedUserId = userId?.toString();
  const seenLinkUserIds = new Set();
  const filteredLinks = links.reduce((acc, link) => {
    const requester = ensureUserObject(link.requester);
    const recipient = ensureUserObject(link.recipient);
    const displayUser = (getEntityId(requester)?.toString() === normalizedViewedUserId)
      ? recipient
      : requester;
    if (!displayUser) {
      return acc;
    }
    const displayUserId = getEntityId(displayUser);

    if (displayUserId) {
      const idKey = displayUserId.toString();
      if (mutualIdSet.has(idKey) || seenLinkUserIds.has(idKey)) {
        return acc;
      }
      seenLinkUserIds.add(idKey);
    }

    acc.push({
      link,
      displayUser,
      displayUserId
    });
    return acc;
  }, []);

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
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            {user?.name}'s Links
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Mutual Links section */}
        {mutualLinks.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Mutual Links ({mutualLinks.length})
            </Typography>
            <List>
              {mutualLinks.map((m) => {
                const mutualUser = ensureUserObject(m);
                if (!mutualUser) {
                  return null;
                }
                const mutualId = getEntityId(mutualUser);
                return (
                  <ListItem
                    key={mutualId || mutualUser?.email || mutualUser?.name}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'grey.50'
                      }
                    }}
                    onClick={() => handleUserClick(mutualUser)}
                  >
                    <ListItemAvatar>
                      <UserAvatar
                        user={mutualUser}
                        size={40}
                        mobileSize={32}
                        onClick={() => handleUserClick(mutualUser)}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {mutualUser.name}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Links list */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Links ({filteredLinks.length})
        </Typography>

        {filteredLinks.length === 0 ? (
          <Alert severity="info">
            {links.length === 0
              ? `${user?.name} doesn't have any connections yet.`
              : `${user?.name}'s other connections are already mutual with you.`}
          </Alert>
        ) : (
          <List>
            {filteredLinks.map(({ link, displayUser, displayUserId }, index) => (
              <ListItem
                key={link._id || displayUserId || link.id || displayUser?.email || displayUser?.name || `link-${index}`}
                sx={{
                  border: '1px solid',
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'grey.50'
                  }
                }}
                onClick={() => handleUserClick(displayUser)}
              >
                <ListItemAvatar>
                  <UserAvatar
                    user={displayUser}
                    size={40}
                    mobileSize={32}
                    onClick={() => handleUserClick(displayUser)}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="medium">
                      {displayUser?.name}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default UserLinks;
