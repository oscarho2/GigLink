import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ApplicantSelectionModal = ({ 
  open, 
  onClose, 
  applicants = [], 
  onSelectApplicant, 
  gigTitle 
}) => {
  const handleSelectApplicant = (applicant) => {
    onSelectApplicant(applicant);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Select Applicant for "{gigTitle}"
        </Typography>
      </DialogTitle>
      <DialogContent>
        {applicants.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No applicants available for this gig.
          </Typography>
        ) : (
          <List>
            {applicants.map((applicant) => {
              const user = typeof applicant.user === 'object' ? applicant.user : { _id: applicant.user, name: 'Unknown User' };
              const isAccepted = applicant.status === 'accepted';
              
              return (
                <ListItem key={user._id} disablePadding>
                  <ListItemButton 
                    onClick={() => handleSelectApplicant(applicant)}
                    sx={{
                      border: isAccepted ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: isAccepted ? '#f1f8e9' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={user.profilePicture}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {user.name || user.username || 'Unknown User'}
                          </Typography>
                          {isAccepted && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Accepted"
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Applied: {new Date(applicant.date).toLocaleDateString()}
                          </Typography>
                          {applicant.message && (
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              "{applicant.message}"
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicantSelectionModal;