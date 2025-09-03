import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ProfileSetup from './pages/ProfileSetup';
import Discover from './pages/Discover';
import Gigs from './pages/Gigs';
import GigDetail from './pages/GigDetail';
import CreateGig from './pages/CreateGig';
import EditGig from './pages/EditGig';
import Messages from './pages/Messages';
import NotFound from './pages/NotFound';

// Route protection


const theme = createTheme({
  palette: {
    primary: {
      main: '#475569',
    },
    secondary: {
      main: '#64748b',
    },
    error: {
      main: '#e53e3e', // Red accent color
    },
    accent: {
      main: '#e53e3e', // Red accent color for the Join Now button
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
});

function App() {


  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh'
            }}
          >
            <Navbar />
            <Box sx={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/gigs" element={<Gigs />} />
                <Route path="/gigs/:id" element={<GigDetail />} />
                <Route path="/gigs/:id/edit" element={<EditGig />} />
                <Route path="/create-gig" element={<CreateGig />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Box>
            <Footer />
          </Box>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;