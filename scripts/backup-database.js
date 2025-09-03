#!/usr/bin/env node

/**
 * GigLink Database Backup Script
 * 
 * This script creates backups of the GigLink MongoDB database
 * Usage: node scripts/backup-database.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 7; // Keep last 7 backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('Created backup directory:', BACKUP_DIR);
}

/**
 * Create a timestamp for backup naming
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
         now.toTimeString().split(' ')[0].replace(/:/g, '-');
}

/**
 * Clean up old backups, keeping only the most recent ones
 */
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('giglink-backup-'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.time - a.time); // Sort by modification time, newest first

    // Remove old backups if we have more than MAX_BACKUPS
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        if (fs.statSync(file.path).isDirectory()) {
          fs.rmSync(file.path, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file.path);
        }
        console.log('Removed old backup:', file.name);
      });
    }
  } catch (error) {
    console.warn('Warning: Could not clean up old backups:', error.message);
  }
}

/**
 * Create database backup
 */
function createBackup() {
  const timestamp = getTimestamp();
  const backupName = `giglink-backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  console.log('Starting database backup...');
  console.log('Backup location:', backupPath);
  
  // Determine which MongoDB URI to use
  let mongoUri = process.env.MONGO_URI;
  let backupType = 'MongoDB Atlas';
  
  // If Atlas URI is not available or fails, try local
  if (!mongoUri || mongoUri.includes('localhost')) {
    mongoUri = 'mongodb://localhost:27017/giglink';
    backupType = 'Local MongoDB';
  }
  
  console.log(`Backing up from: ${backupType}`);
  
  // Create mongodump command
  const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Backup failed:', error.message);
      
      // If Atlas backup failed, try local as fallback
      if (backupType === 'MongoDB Atlas') {
        console.log('Attempting fallback to local MongoDB...');
        const localCommand = `mongodump --uri="mongodb://localhost:27017/giglink" --out="${backupPath}"`;
        
        exec(localCommand, (localError, localStdout, localStderr) => {
          if (localError) {
            console.error('❌ Local backup also failed:', localError.message);
            console.error('Please ensure MongoDB is running and accessible.');
            return;
          }
          
          console.log('✅ Local backup completed successfully!');
          console.log('Backup saved to:', backupPath);
          if (localStdout) console.log('Output:', localStdout);
          
          // Clean up old backups
          cleanupOldBackups();
        });
      }
      return;
    }
    
    console.log('✅ Backup completed successfully!');
    console.log('Backup saved to:', backupPath);
    if (stdout) console.log('Output:', stdout);
    
    // Clean up old backups
    cleanupOldBackups();
    
    // Show backup size
    try {
      const stats = fs.statSync(backupPath);
      if (stats.isDirectory()) {
        console.log('📁 Backup directory created');
      }
    } catch (statError) {
      console.warn('Could not get backup stats:', statError.message);
    }
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 GigLink Database Backup Tool');
  console.log('================================');
  
  // Check if mongodump is available
  exec('mongodump --version', (error) => {
    if (error) {
      console.error('❌ Error: mongodump is not installed or not in PATH');
      console.error('Please install MongoDB Database Tools:');
      console.error('https://docs.mongodb.com/database-tools/installation/');
      process.exit(1);
    }
    
    // Create backup
    createBackup();
  });
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createBackup, cleanupOldBackups };