import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as DocumentIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import moment from 'moment';
import AuthenticatedImage from './AuthenticatedImage';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`media-tabpanel-${index}`}
      aria-labelledby={`media-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MediaDocumentsLinks = ({ open, onClose, messages = [] }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Extract URLs from message content using regex
  const extractUrls = (text) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Categorize messages by type
  const categorizedContent = useMemo(() => {
    const media = [];
    const documents = [];
    const links = [];

    messages.forEach(message => {
      // Handle file attachments
      if (message.fileUrl && message.mimeType) {
        const fileData = {
          id: message._id,
          url: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
          timestamp: message.timestamp,
          sender: message.sender
        };

        if (message.mimeType.startsWith('image/')) {
          media.push({ ...fileData, type: 'image' });
        } else if (message.mimeType.startsWith('video/')) {
          media.push({ ...fileData, type: 'video' });
        } else if (message.mimeType.startsWith('audio/')) {
          media.push({ ...fileData, type: 'audio' });
        } else {
          documents.push(fileData);
        }
      }

      // Extract URLs from message content
      const urls = extractUrls(message.content);
      urls.forEach(url => {
        links.push({
          id: `${message._id}-${url}`,
          url,
          messageContent: message.content,
          timestamp: message.timestamp,
          sender: message.sender
        });
      });
    });

    return {
      media: media.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      documents: documents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      links: links.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };
  }, [messages]);

  const renderMediaItem = (item) => {
    return (
      <Grid item xs={6} sm={4} md={3} key={item.id}>
        <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => window.open(item.url, '_blank')}>
          {item.type === 'image' ? (
            <AuthenticatedImage
              src={item.url}
              alt={item.fileName}
              sx={{ 
                width: '100%',
                height: 120,
                objectFit: 'cover'
              }}
            />
          ) : item.type === 'video' ? (
            <Box sx={{ position: 'relative', height: 120, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoIcon sx={{ fontSize: 40, color: 'grey.600' }} />
            </Box>
          ) : (
            <Box sx={{ position: 'relative', height: 120, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AudioIcon sx={{ fontSize: 40, color: 'grey.600' }} />
            </Box>
          )}
          <CardContent sx={{ p: 1 }}>
            <Typography variant="caption" noWrap title={item.fileName}>
              {item.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {moment(item.timestamp).format('MMM DD, YYYY')}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDocumentItem = (item) => {
    return (
      <ListItem key={item.id} sx={{ px: 0 }}>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <DocumentIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={item.fileName}
          secondary={
            <Box>
              <Typography variant="caption" color="text.secondary">
                {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {moment(item.timestamp).format('MMM DD, YYYY HH:mm')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shared by {item.sender?.name || 'Unknown'}
              </Typography>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton onClick={() => window.open(item.url, '_blank')} size="small">
            <OpenInNewIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  const renderLinkItem = (item) => {
    return (
      <ListItem key={item.id} sx={{ px: 0 }}>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <LinkIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography 
              variant="body2" 
              sx={{ 
                wordBreak: 'break-all',
                color: 'primary.main',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onClick={() => window.open(item.url, '_blank')}
            >
              {item.url}
            </Typography>
          }
          secondary={
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                "{item.messageContent.substring(0, 100)}{item.messageContent.length > 100 ? '...' : ''}"
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {moment(item.timestamp).format('MMM DD, YYYY HH:mm')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shared by {item.sender?.name || 'Unknown'}
              </Typography>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton onClick={() => window.open(item.url, '_blank')} size="small">
            <OpenInNewIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '80vh',
          maxHeight: isMobile ? '100%' : '80vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6">Media, Documents & Links</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon fontSize="small" />
                Media ({categorizedContent.media.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocumentIcon fontSize="small" />
                Documents ({categorizedContent.documents.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon fontSize="small" />
                Links ({categorizedContent.links.length})
              </Box>
            } 
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        {/* Media Tab */}
        <TabPanel value={tabValue} index={0}>
          {categorizedContent.media.length > 0 ? (
            <Grid container spacing={2}>
              {categorizedContent.media.map(renderMediaItem)}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No media files shared yet
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={1}>
          {categorizedContent.documents.length > 0 ? (
            <List>
              {categorizedContent.documents.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderDocumentItem(item)}
                  {index < categorizedContent.documents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DocumentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No documents shared yet
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Links Tab */}
        <TabPanel value={tabValue} index={2}>
          {categorizedContent.links.length > 0 ? (
            <List>
              {categorizedContent.links.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderLinkItem(item)}
                  {index < categorizedContent.links.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LinkIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No links shared yet
              </Typography>
            </Box>
          )}
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};

export default MediaDocumentsLinks;