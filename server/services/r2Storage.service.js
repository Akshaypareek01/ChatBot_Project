const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload a file or text content to Cloudflare R2
 * @param {string} key - The object key (path) in R2
 * @param {Buffer|string} body - The content to upload
 * @param {string} contentType - MIME type of the content
 * @returns {Promise<string>} - The object key
 */
const uploadToR2 = async (key, body, contentType) => {
    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        await r2Client.send(command);
        console.log(`Successfully uploaded to R2: ${key}`);
        return key;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
};

/**
 * Delete a file from Cloudflare R2
 * @param {string} key - The object key (path) in R2
 * @returns {Promise<void>}
 */
const deleteFromR2 = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        await r2Client.send(command);
        console.log(`Successfully deleted from R2: ${key}`);
    } catch (error) {
        console.error('Error deleting from R2:', error);
        // We log but maybe don't throw to avoid breaking the main flow if delete fails?
        // But user wants them deleted. Throwing might be safer to notice errors.
        throw error;
    }
};

/**
 * Get a signed URL for reading a private file (if needed)
 * @param {string} key 
 * @returns {Promise<string>}
 */
const getSignedUrlForDownload = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });
        return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
};

/**
 * Get public URL (if bucket/object is public)
 * @param {string} key 
 * @returns {string}
 */
const getPublicUrl = (key) => {
    if (!R2_PUBLIC_URL) return null;
    return `${R2_PUBLIC_URL}/${key}`;
};

module.exports = {
    uploadToR2,
    deleteFromR2,
    getSignedUrlForDownload,
    getPublicUrl
};
