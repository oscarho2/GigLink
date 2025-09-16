const mongoose = require('mongoose');
const { createNotification } = require('../routes/notifications');
const User = require('../models/User');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Make io available globally
global.io = io;

async function testRealTimeNotification() {
  try {
    console.log('Creating real-time notification...');
    
    // Use the currently connected user ID from the logs
     const targetUserId = '68c3a622306290ce4b6683a2';
     const senderId = '68b89a5999b81d03bd126e8a'; // Jane's ID
     
     // Create a mock request object for socket.io access
     const mockReq = {
       app: {
         get: (key) => {
           if (key === 'io') {
             return io;
           }
           return null;
         }
       }
     };
     
     // Call the createNotification function with proper parameters
     const notification = await createNotification(
       targetUserId,
       senderId,
       'message',
       'Jane Smith sent you a test message for real-time testing',
       senderId, // Using sender ID as related ID
       'Message',
       mockReq
     );
     
     console.log('Notification created with ID:', notification._id);
    
    console.log('Check the frontend notifications page for real-time update!');
    
  } catch (error) {
    console.error('Error creating notification:', error);
  } finally {
    // Close connections
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Start the test
testRealTimeNotification();