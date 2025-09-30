require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getStorageConfig } = require('../utils/r2Config');

const config = getStorageConfig();

console.log('R2 is configured:', config.isR2Configured);