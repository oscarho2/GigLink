const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const downloadImage = async (url, directory) => {
  try {
    const response = await axios({ url, responseType: 'stream' });

    const extension = response.headers['content-type'].split('/')[1];
    const filename = `${uuidv4()}.${extension}`;
    const imagePath = path.join(directory, filename);

    const writer = fs.createWriteStream(imagePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/${path.join('uploads', 'images', filename)}`));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
};

module.exports = { downloadImage };
