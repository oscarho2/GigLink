require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const gigRoutes = require('./routes/gigs');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profiles');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profiles', profileRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('GigLink API is running');
});

// // Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Continuing without MongoDB connection for demonstration...');
  // Don't exit the process, continue running for demo purposes
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));