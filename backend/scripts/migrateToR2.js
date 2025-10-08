require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { migrateLocalUploadsToR2 } = require('../utils/r2Migration');

(async () => {
  try {
    console.log('[R2 Migration] Starting migration of local uploads to R2...');
    const { migrated, skipped } = await migrateLocalUploadsToR2();
    if (skipped) {
      console.log('[R2 Migration] R2 not configured. Migration skipped.');
    } else {
      console.log(`[R2 Migration] Completed. Uploaded ${migrated} files.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('[R2 Migration] Migration failed:', error);
    process.exit(1);
  }
})();
