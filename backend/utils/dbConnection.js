const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Establishes connection to MongoDB
 * @param {boolean} verbose - Whether to log connection details
 * @returns {Promise<mongoose.Connection>} - MongoDB connection
 */
async function connectDB(verbose = true) {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    if (verbose) {
      console.log(`MongoDB connected: ${conn.connection.host}`);
    }

    return conn.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

/**
 * Closes MongoDB connection
 * @param {boolean} verbose - Whether to log disconnection
 */
async function disconnectDB(verbose = true) {
  try {
    await mongoose.connection.close();
    if (verbose) {
      console.log('MongoDB disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error.message);
  }
}

/**
 * Wrapper function for scripts that need database connection
 * @param {Function} scriptFunction - The main script function to execute
 * @param {boolean} verbose - Whether to log connection details
 */
async function withDBConnection(scriptFunction, verbose = true) {
  try {
    await connectDB(verbose);
    await scriptFunction();
  } catch (error) {
    console.error('Script execution error:', error.message);
  } finally {
    await disconnectDB(verbose);
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  withDBConnection
};