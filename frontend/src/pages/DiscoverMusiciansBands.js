import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import TuneIcon from '@mui/icons-material/Tune';
import VerifiedIcon from '@mui/icons-material/Verified';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const performanceTypes = [
  'Bands',
  'Solo musicians',
  'DJs',
  'Acoustic acts',
  'Tribute acts',
  'Classical performers'
];

const eventTypes = [
  'Wedding',
  'Corporate event',
  'Private party',
  'Festival',
  'Pub or venue',
  'Birthday'
];

const filterGroups = [
  {
    title: 'Style',
    items: ['Rock', 'Pop', 'Soul', 'Jazz', 'Indie', 'Classical']
  },
  {
    title: 'Booking Details',
    items: ['Available now', 'Acoustic setup', 'Own PA', 'Travel available']
  },
  {
    title: 'Line-up',
    items: ['Solo', 'Duo', '3-5 piece', 'Large band']
  }
];

const bookingSteps = [
  {
    title: 'Search',
    copy: 'Pick the event, location, date and type of performer you need.',
    icon: <SearchIcon />
  },
  {
    title: 'Shortlist',
    copy: 'Compare profiles, styles, media, availability and booking details.',
    icon: <VerifiedIcon />
  },
  {
    title: 'Enquire',
    copy: 'Send the performer your event brief and continue the conversation.',
    icon: <ChatBubbleOutlineIcon />
  }
];

const DiscoverMusiciansBands = () => {
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100%' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 52%, #2c5282 100%)',
          color: 'white',
          py: { xs: 6, md: 9 }
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="Booking marketplace framework"
                sx={{
                  mb: 2,
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.24)'
                }}
              />
              <Typography
                variant="h2"
                component="h1"
                fontWeight={800}
                sx={{ fontSize: { xs: '2.25rem', md: '3.75rem' }, lineHeight: 1.05, mb: 2 }}
              >
                Find and book musicians or bands for your event
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 680, mb: 3 }}>
                A dedicated discovery page layout for event planners to search by act type, location, date, budget and performance style.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {performanceTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                component="form"
                onSubmit={handleSubmit}
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.96)',
                  color: 'text.primary',
                  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)'
                }}
              >
                <Typography variant="h5" component="h2" fontWeight={800} gutterBottom>
                  Start your search
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Form fields are in place for the future booking/search workflow. No performer data is hard-coded.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="What do you need?"
                      placeholder="Band, singer, DJ, violinist..."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MusicNoteIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Location"
                      placeholder="Town, city or postcode"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOnIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Event date"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EventIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Event type</InputLabel>
                      <Select label="Event type" defaultValue="">
                        <MenuItem value="">Any event</MenuItem>
                        {eventTypes.map((type) => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Budget" placeholder="Optional" />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<SearchIcon />}
                      sx={{
                        bgcolor: '#e53e3e',
                        py: 1.4,
                        fontWeight: 800,
                        '&:hover': { bgcolor: '#c53030' }
                      }}
                    >
                      Search performers
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {bookingSteps.map((step) => (
            <Grid item xs={12} md={4} key={step.title}>
              <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 12px 35px rgba(15, 23, 42, 0.08)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      mb: 2,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#1a365d',
                      bgcolor: 'rgba(26, 54, 93, 0.08)'
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography variant="h6" component="h2" fontWeight={800} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">{step.copy}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: { xs: 2, md: 4 } }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, borderRadius: 3, position: { md: 'sticky' }, top: { md: 96 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TuneIcon sx={{ color: '#1a365d' }} />
                <Typography variant="h6" fontWeight={800}>Filters</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {filterGroups.map((group) => (
                <Box key={group.title} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    {group.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.items.map((item) => (
                      <Chip key={item} label={item} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md>
                  <Typography variant="h5" component="h2" fontWeight={800}>
                    Performer Results
                  </Typography>
                  <Typography color="text.secondary">
                    This section is ready for real performer listings once the booking data source is connected.
                  </Typography>
                </Grid>
                <Grid item xs={12} md="auto">
                  <Button variant="outlined" startIcon={<RequestQuoteIcon />} sx={{ borderColor: '#1a365d', color: '#1a365d' }}>
                    Request quotes
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderStyle: 'dashed',
                borderColor: 'rgba(26, 54, 93, 0.35)',
                bgcolor: 'white'
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
                <MusicNoteIcon sx={{ fontSize: 56, color: '#1a365d', mb: 2 }} />
                <Typography variant="h5" component="h3" fontWeight={800} gutterBottom>
                  No mock performers added
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 620, mx: 'auto' }}>
                  Real musician and band cards can be rendered here with profile media, location, pricing, availability, reviews and booking actions when that dataset is ready.
                </Typography>
                <Grid container spacing={2} sx={{ mt: 3 }}>
                  {['Profile image slot', 'Act details slot', 'Availability slot', 'Booking CTA slot'].map((slot) => (
                    <Grid item xs={12} sm={6} md={3} key={slot}>
                      <Box
                        sx={{
                          py: 2,
                          px: 1,
                          borderRadius: 2,
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700
                        }}
                      >
                        {slot}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default DiscoverMusiciansBands;
