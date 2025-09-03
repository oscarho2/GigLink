#!/usr/bin/env node

/**
 * GigLink Scheduled Backup Service
 * 
 * This script runs a backup service that automatically creates database backups
 * at scheduled intervals.
 * 
 * Usage: node scripts/schedule-backups.js
 */

const { createBackup, cleanupOldBackups } = require('./backup-database');
const path = require('path');

// Configuration
const BACKUP_INTERVAL_HOURS = 24; // Backup every 24 hours
const CLEANUP_INTERVAL_HOURS = 168; // Cleanup weekly (7 days * 24 hours)

/**
 * Log with timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Schedule regular backups
 */
function scheduleBackups() {
  log('🔄 Starting GigLink Backup Scheduler');
  log(`📅 Backup interval: ${BACKUP_INTERVAL_HOURS} hours`);
  log(`🧹 Cleanup interval: ${CLEANUP_INTERVAL_HOURS} hours`);
  
  // Create initial backup
  log('Creating initial backup...');
  createBackup();
  
  // Schedule regular backups
  setInterval(() => {
    log('⏰ Scheduled backup starting...');
    createBackup();
  }, BACKUP_INTERVAL_HOURS * 60 * 60 * 1000);
  
  // Schedule cleanup
  setInterval(() => {
    log('🧹 Running scheduled cleanup...');
    cleanupOldBackups();
  }, CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);
  
  log('✅ Backup scheduler is running');
  log('Press Ctrl+C to stop the scheduler');
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  log('🛑 Backup scheduler stopping...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Backup scheduler terminated');
  process.exit(0);
});

// Start the scheduler
if (require.main === module) {
  scheduleBackups();
}

module.exports = { scheduleBackups };