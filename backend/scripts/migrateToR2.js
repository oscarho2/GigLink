require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const {
  uploadFileFromDiskToR2,
  getStorageConfig,
  uploadsDir
} = require('../utils/r2Config');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const { isR2Configured } = getStorageConfig();

if (!isR2Configured) {
  console.log('R2 is not configured. Aborting migration.');
  process.exit(1);
}

const directoriesToMigrate = ['group-avatars', 'images', 'messages', 'posts', 'videos'];

async function migrate() {
  console.log('Starting migration of local uploads to R2...');

  for (const dir of directoriesToMigrate) {
    const localDir = path.join(uploadsDir, dir);
    if (!fs.existsSync(localDir)) {
      console.log(`Directory ${localDir} does not exist, skipping.`);
      continue;
    }

    console.log(`Migrating directory: ${dir}`);
    const files = await readdir(localDir);

    for (const file of files) {
      const localPath = path.join(localDir, file);
      const fileStat = await stat(localPath);

      if (fileStat.isDirectory()) {
        continue;
      }

      const r2Key = `${dir}/${file}`;

      console.log(`- Uploading ${file} to R2 with key ${r2Key}...`);
      try {
        await uploadFileFromDiskToR2(localPath, r2Key);
        console.log(`  ...Success: ${r2Key}`);
      } catch (error) {
        console.error(`  ...Failed to upload ${r2Key}:`, error);
      }
    }
  }
  console.log('Migration finished.');
}

migrate().catch(console.error);
