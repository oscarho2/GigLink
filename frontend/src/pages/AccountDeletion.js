import React from 'react';
import { Container, Typography, Box, List, ListItem, ListItemText, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AccountDeletion = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        GigLink Account Deletion Instructions
      </Typography>
      <Typography variant="body1" paragraph>
        These steps explain how to permanently delete your GigLink account. The guidance below references
        the GigLink app and the GigLink Social developer account as shown on the Google Play Store listing.
      </Typography>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          How to request account deletion from inside GigLink
        </Typography>
        <List sx={{ listStyleType: 'decimal', pl: 3 }}>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText
              primary="Sign in to the GigLink app or web experience with the account you want to remove."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText
              primary="Open the main menu (your avatar in the top-right corner) and select Settings."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText
              primary="Scroll to the Account section and tap Delete Account."
              secondary="A two-step confirmation dialog will explain what is removed."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText
              primary="Review the warning, then press Continue."
              secondary="The final confirmation asks you to type “DELETE” in capital letters."
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText
              primary="Type DELETE and choose Delete Account to finish."
              secondary="Your session will end immediately and the account removal process will begin."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary">
          If you cannot sign in, please contact our support team via the <RouterLink to="/contact">GigLink contact form</RouterLink>
          {' '}using the email address associated with the account you need removed.
        </Typography>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          What happens to your data
        </Typography>
        <Typography variant="body1" paragraph>
          Once you complete the in-app deletion request, GigLink removes the following data from our production systems immediately:
        </Typography>
        <List sx={{ listStyleType: 'disc', pl: 3 }}>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Profile information (name, biography, instruments, genres, location, profile media)." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Gig postings you created and any gig applications tied to your account." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Community posts, comments, likes, and uploaded media owned by your account." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Direct messages, link requests, and accepted connections involving your account." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Your user record and authentication credentials." />
          </ListItem>
        </List>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Need extra help?
        </Typography>
        <Typography variant="body1" paragraph>
          If you have questions about data handling or need to follow up on a deletion request, contact the GigLink support team through the in-app support channel
          or submit a request via the <RouterLink to="/contact">GigLink contact form</RouterLink>. Please include the email address associated with the account so we can verify ownership.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You can also review our <RouterLink to="/privacy-policy">Privacy Policy</RouterLink> for more details about how GigLink Social handles user data.
        </Typography>
      </Paper>
    </Container>
  );
};

export default AccountDeletion;
