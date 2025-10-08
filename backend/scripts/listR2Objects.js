require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

(async () => {
  try {
    const client = new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      region: 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    let continuationToken;
    let count = 0;

    do {
      const response = await client.send(new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        ContinuationToken: continuationToken
      }));

      const contents = response.Contents || [];
      contents.forEach(obj => {
        console.log(obj.Key);
        count += 1;
      });

      continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
    } while (continuationToken);

    console.log(`Total objects: ${count}`);
  } catch (error) {
    console.error('Error listing objects:', error);
    process.exit(1);
  }
})();
