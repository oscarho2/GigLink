require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const gigRoutes = require('./routes/gigs');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profiles');
const uploadRoutes = require('./routes/upload');
const linkRoutes = require('./routes/links');

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
app.use('/api/upload', uploadRoutes);
app.use('/api/links', linkRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('GigLink API is running');
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    // First try Atlas connection
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log(`MongoDB Atlas connected successfully: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB Atlas connection error:', err.message);
    console.log('Attempting to connect to local MongoDB...');
    
    try {
      // Fallback to local MongoDB
      const localConn = await mongoose.connect('mongodb://localhost:27017/giglink', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`Local MongoDB connected successfully: ${localConn.connection.host}`);
    } catch (localErr) {
      console.error('Local MongoDB connection also failed:', localErr.message);
      console.log('Running without database connection - authentication will not work');
    }
  }
};

// Initialize MongoDB connection
connectDB();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));