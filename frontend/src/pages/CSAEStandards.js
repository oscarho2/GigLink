import React from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const CSAEStandards = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        GigLink Standards Against Child Sexual Abuse and Exploitation
      </Typography>
      <Typography variant="body1" paragraph>
        GigLink Social maintains a zero-tolerance policy toward child sexual abuse and exploitation (CSAE). The standards below apply to all
        use of the GigLink platform, including the GigLink mobile apps published under the GigLink Social developer account on Google Play.
      </Typography>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Prohibited Content and Conduct
        </Typography>
        <Typography variant="body1" paragraph>
          The following content and behavior are strictly forbidden on GigLink. Violations result in immediate account removal and may be reported
          to the National Center for Missing &amp; Exploited Children (NCMEC) or law enforcement.
        </Typography>
        <List sx={{ listStyleType: 'disc', pl: 3 }}>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Any imagery, audio, video, or text that depicts, promotes, or normalizes the sexual abuse or exploitation of minors." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Solicitation, grooming, or attempts to arrange contact with minors for sexual purposes." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Using GigLink to distribute links, files, or instructions for obtaining CSAE material." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Threats, coercion, or extortion that involve minors or CSAE content." />
          </ListItem>
        </List>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Detection and Enforcement
        </Typography>
        <Typography variant="body1" paragraph>
          GigLink combines automated monitoring, user reporting, and dedicated safety reviews to identify CSAE violations. When a report is received:
        </Typography>
        <List sx={{ listStyleType: 'decimal', pl: 3 }}>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Flagged material is immediately removed from public view while the safety team investigates." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Accounts involved in CSAE activity are suspended or permanently banned." />
          </ListItem>
          <ListItem sx={{ display: 'list-item', pl: 0 }}>
            <ListItemText primary="Confirmed CSAE content is preserved securely and reported to NCMEC and appropriate law-enforcement agencies." />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary">
          Investigation records are retained only as long as required by law-enforcement requests and platform safety obligations.
        </Typography>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Reporting CSAE Concerns
        </Typography>
        <Typography variant="body1" paragraph>
          If you encounter content or behavior that may violate these standards, report it immediately through the in-app reporting tools or submit
          a detailed message via the <RouterLink to="/contact">GigLink contact form</RouterLink>. Include any relevant profile links, timestamps, or screenshots
          so the safety team can act quickly.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Individuals in immediate danger should contact local law enforcement before notifying GigLink. We cooperate fully with legal authorities on CSAE matters.
        </Typography>
      </Paper>
    </Container>
  );
};

export default CSAEStandards;
