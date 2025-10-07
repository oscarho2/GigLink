const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const streamPipeline = promisify(pipeline);

const downloadImage = async (url, directory) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const subtype = contentType.split('/')[1] || '';
    const extension = subtype.split(';')[0] || 'jpg';
    const filename = `${uuidv4()}.${extension}`;
    const imagePath = path.join(directory, filename);

    await streamPipeline(response.body, fs.createWriteStream(imagePath));

    return `/${path.join('uploads', 'images', filename)}`;
  } catch (error) {
    console.error('Error downloading image:', error.message || error);
    return null;
  }
};

module.exports = { downloadImage };
