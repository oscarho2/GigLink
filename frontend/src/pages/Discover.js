import { Link } from 'react-router-dom';
 import { useAuth } from '../context/AuthContext';
 import axios from 'axios';
 import { useState, useEffect } from 'react';


import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Discover = () => {
  const { user } = useAuth();
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMusicians, setFilteredMusicians] = useState([]);



  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/profiles');
        setMusicians(res.data);
        setFilteredMusicians(res.data); // Initialize filteredMusicians with all musicians
      } catch (err) {
        console.error(err);
        setError('Failed to fetch musicians.');
      } finally {
        setLoading(false);
      }
    };

    fetchMusicians();
  }, []);

  const handleSearch = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    const filtered = musicians.filter(musician =>
      musician.user.name.toLowerCase().includes(term.toLowerCase()) ||
      (musician.skills && musician.skills.some(skill => skill.toLowerCase().includes(term.toLowerCase()))) ||
      (musician.instruments && musician.instruments.some(instrument => instrument.toLowerCase().includes(term.toLowerCase()))) ||
      (musician.genres && musician.genres.some(genre => genre.toLowerCase().includes(term.toLowerCase())))
    );
    setFilteredMusicians(filtered);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Discover Musicians
      </Typography>
      <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary">
        Find talented musicians for your next collaboration
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <TextField
          variant="outlined"
          placeholder="Search by name, instrument, genre, or skills..."
          value={searchTerm}
          onChange={handleSearch}
          sx={{ width: { xs: '100%', md: '500px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Musicians Grid */}
      <Grid container spacing={3}>
          {filteredMusicians.map((musician) => (
            <Grid item xs={12} sm={6} md={4} key={musician._id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {musician.user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {musician.bio || 'No bio available'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    {musician.location || 'Location not specified'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Experience: {musician.experience || 'Not specified'}
                </Typography>
              </Box>
              
              <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                {musician.instruments && musician.instruments.length > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Instruments:
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {musician.instruments.map((instrument, index) => (
                        <Chip
                          key={index}
                          label={instrument}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}
                
                {musician.genres && musician.genres.length > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Genres:
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {musician.genres.map((genre, index) => (
                        <Chip
                          key={index}
                          label={genre}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}
                
                {musician.skills && musician.skills.length > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Skills:
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {musician.skills.map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="info"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Latest Experience: {musician.latestExperience || 'Not specified'}
                </Typography>
                
                <Button
                  component={Link}
                  to={user ? `/profile/${musician.user._id}` : `/login?redirect=/profile/${musician.user._id}`}
                  variant="contained"
                  fullWidth
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </Grid>
          ))}
        </Grid>

      {filteredMusicians.length === 0 && !loading && !error && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No musicians found matching your search.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Discover;