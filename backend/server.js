require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const gigRoutes = require('./routes/gigs');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profiles');
const uploadRoutes = require('./routes/upload');
const linkRoutes = require('./routes/links');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static uploads (public)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/links', linkRoutes);

// DB Health endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const stateCode = mongoose.connection.readyState;
    const info = {
      connected: stateCode === 1,
      state: states[stateCode] || stateCode,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    };
    if (stateCode === 1 && mongoose.connection.db) {
      try {
        await mongoose.connection.db.admin().command({ ping: 1 });
        info.ping = true;
      } catch (e) {
        info.ping = false;
        info.error = e.message;
      }
    }
    res.json(info);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('GigLink API is running');
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not set; skipping Atlas connection and attempting local.');
      throw new Error('MONGO_URI not set');
    }
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

// Socket.IO authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  // Join user to their personal room
  socket.join(socket.userId);
  
  // Handle joining conversation rooms
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });
  
  // Handle leaving conversation rooms
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });
  
  // Handle typing indicators
  socket.on('typing_start', ({ conversationId, recipientId }) => {
    socket.to(conversationId).emit('user_typing', {
      userId: socket.userId,
      isTyping: true
    });
  });
  
  socket.on('typing_stop', ({ conversationId, recipientId }) => {
    socket.to(conversationId).emit('user_typing', {
      userId: socket.userId,
      isTyping: false
    });
  });
  
  // Handle message status updates
  socket.on('message_delivered', ({ messageId, conversationId }) => {
    socket.to(conversationId).emit('message_status_update', {
      messageId,
      status: 'delivered'
    });
  });
  
  socket.on('message_read', ({ messageId, conversationId }) => {
    socket.to(conversationId).emit('message_status_update', {
      messageId,
      status: 'read'
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Make io accessible to routes
app.set('io', io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));