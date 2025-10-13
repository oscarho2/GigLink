# GigLink Data Cleanup Scripts

This directory contains scripts to clean up orphaned data in MongoDB Atlas for users that have been deleted from the system.

## Prerequisites

1. Node.js installed
2. MongoDB Atlas connection string
3. Proper environment variables set up

## Setup

1. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your MongoDB Atlas connection string

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### 1. Dry Run Analysis (Recommended First Step)

Before actually deleting any data, run the dry-run analysis to see what would be deleted:

```bash
npm run dry-run
```

This will show you:
- Count of orphaned records in each collection
- Sample IDs of orphaned records
- Summary of total orphaned data

### 2. Actual Cleanup

After reviewing the dry-run results, perform the actual cleanup:

```bash
npm run cleanup
```

This will:
- Connect to MongoDB Atlas
- Identify all active users
- Delete all data associated with deleted users
- Show progress and final statistics

## What Gets Cleaned Up

The script cleans up data in the following collections:
- Profiles
- Posts
- Gigs
- Messages
- Links
- Notifications

All documents in these collections that reference deleted users will be removed.

## Safety Features

1. **Dry Run Mode**: See what would be deleted before actually deleting
2. **Zero User Protection**: If no users are found, the script exits to prevent accidental deletion of all data
3. **Selective Deletion**: Only deletes data associated with deleted users, preserving all data for active users
4. **Detailed Logging**: Shows exactly what's being deleted

## Environment Variables

- `MONGO_URI` or `MONGO_ATLAS_URI`: MongoDB Atlas connection string

## Troubleshooting

If you encounter connection issues:
1. Verify your MongoDB Atlas connection string
2. Ensure your IP address is whitelisted in MongoDB Atlas
3. Check that your username/password is correct
4. Make sure the database name in the connection string is correct