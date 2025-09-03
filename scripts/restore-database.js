#!/usr/bin/env node

/**
 * GigLink Database Restore Script
 * 
 * This script restores the GigLink MongoDB database from a backup
 * Usage: node scripts/restore-database.js [backup-directory]
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for confirmation
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * List available backups
 */
function listBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('giglink-backup-'))
      .map(file => {
        const fullPath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: fullPath,
          date: stats.mtime,
          size: stats.isDirectory() ? 'Directory' : `${(stats.size / 1024).toFixed(2)} KB`
        };
      })
      .sort((a, b) => b.date - a.date); // Sort by date, newest first

    return backups;
  } catch (error) {
    console.error('Error reading backup directory:', error.message);
    return [];
  }
}

/**
 * Display available backups
 */
function displayBackups(backups) {
  console.log('\n📁 Available Backups:');
  console.log('=====================');
  
  if (backups.length === 0) {
    console.log('No backups found in:', BACKUP_DIR);
    return;
  }
  
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   Date: ${backup.date.toLocaleString()}`);
    console.log(`   Size: ${backup.size}`);
    console.log('');
  });
}

/**
 * Restore database from backup
 */
function restoreDatabase(backupPath, targetUri) {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting database restore...');
    console.log('Backup source:', backupPath);
    console.log('Target database:', targetUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    
    // Find the giglink directory within the backup
    const gigLinkBackupPath = path.join(backupPath, 'giglink');
    
    if (!fs.existsSync(gigLinkBackupPath)) {
      reject(new Error(`GigLink database backup not found in: ${backupPath}`));
      return;
    }
    
    // Create mongorestore command
    const command = `mongorestore --uri="${targetUri}" --drop "${gigLinkBackupPath}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      console.log('✅ Database restore completed successfully!');
      if (stdout) console.log('Output:', stdout);
      if (stderr) console.log('Warnings:', stderr);
      
      resolve();
    });
  });
}

/**
 * Main restore process
 */
async function main() {
  console.log('🔄 GigLink Database Restore Tool');
  console.log('=================================');
  
  try {
    // Check if mongorestore is available
    await new Promise((resolve, reject) => {
      exec('mongorestore --version', (error) => {
        if (error) {
          reject(new Error('mongorestore is not installed or not in PATH'));
        } else {
          resolve();
        }
      });
    });
    
    // Get command line argument for backup path
    const backupArg = process.argv[2];
    let selectedBackupPath;
    
    if (backupArg) {
      // Use provided backup path
      selectedBackupPath = path.resolve(backupArg);
      if (!fs.existsSync(selectedBackupPath)) {
        throw new Error(`Backup path does not exist: ${selectedBackupPath}`);
      }
    } else {
      // List and select from available backups
      const backups = listBackups();
      
      if (backups.length === 0) {
        console.log('❌ No backups found. Please create a backup first using:');
        console.log('   npm run backup');
        process.exit(1);
      }
      
      displayBackups(backups);
      
      const selection = await askQuestion('\nSelect backup number (or press Enter to cancel): ');
      
      if (!selection || selection.trim() === '') {
        console.log('Restore cancelled.');
        process.exit(0);
      }
      
      const backupIndex = parseInt(selection) - 1;
      
      if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backups.length) {
        throw new Error('Invalid backup selection');
      }
      
      selectedBackupPath = backups[backupIndex].path;
    }
    
    console.log(`\n📦 Selected backup: ${path.basename(selectedBackupPath)}`);
    
    // Determine target database
    let targetUri = process.env.MONGO_URI;
    let targetType = 'MongoDB Atlas';
    
    if (!targetUri || targetUri.includes('localhost')) {
      targetUri = 'mongodb://localhost:27017/giglink';
      targetType = 'Local MongoDB';
    }
    
    console.log(`\n🎯 Target: ${targetType}`);
    
    // Warning about data loss
    console.log('\n⚠️  WARNING: This will REPLACE all existing data in the target database!');
    console.log('   All current data will be permanently lost.');
    
    const confirm1 = await askQuestion('\nDo you want to continue? (type "yes" to confirm): ');
    
    if (confirm1.toLowerCase() !== 'yes') {
      console.log('Restore cancelled.');
      process.exit(0);
    }
    
    const confirm2 = await askQuestion('\nAre you absolutely sure? This cannot be undone! (type "RESTORE" to confirm): ');
    
    if (confirm2 !== 'RESTORE') {
      console.log('Restore cancelled.');
      process.exit(0);
    }
    
    // Perform restore
    await restoreDatabase(selectedBackupPath, targetUri);
    
    console.log('\n🎉 Database restore completed successfully!');
    console.log('\n💡 Recommendations:');
    console.log('   - Restart your application servers');
    console.log('   - Verify data integrity');
    console.log('   - Test critical functionality');
    
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    
    if (error.message.includes('mongorestore')) {
      console.error('\nPlease install MongoDB Database Tools:');
      console.error('https://docs.mongodb.com/database-tools/installation/');
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { restoreDatabase, listBackups };