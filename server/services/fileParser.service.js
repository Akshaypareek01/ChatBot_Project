const pdfParse = require('pdf-parse-new');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const r2Storage = require('./r2Storage.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const Source = require('../models/Source');

const ALLOWED_MIMES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
]);
const DANGEROUS_MIMES = new Set([
    'application/x-msdownload', 'application/x-msdos-program', 'application/x-executable',
    'application/x-sh', 'application/x-shellscript', 'application/bat', 'application/x-bat',
    'application/vnd.microsoft.portable-executable', 'application/octet-stream'
]);

function sanitizeFilename(name) {
    if (!name || typeof name !== 'string') return 'unnamed';
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_').slice(0, 200) || 'unnamed';
}

/**
 * Extract text from file buffer
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @returns {Promise<string>}
 */
const extractText = async (buffer, mimeType) => {
    let text = '';

    if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        text = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // docx
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
    } else if (mimeType === 'text/plain') {
        text = buffer.toString('utf-8');
    } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Basic cleaning
    return text.replace(/\s+/g, ' ').trim();
};

/**
 * Process uploaded file: Upload -> Extract -> Embed -> Index
 * @param {string} userId 
 * @param {Object} file - { buffer, originalname, mimetype, size }
 */
const processFile = async (userId, file) => {
    if (!file || !file.mimetype) throw new Error('Invalid file.');
    if (DANGEROUS_MIMES.has(file.mimetype)) throw new Error('Executables and binaries are not allowed.');
    if (!ALLOWED_MIMES.has(file.mimetype)) throw new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT.`);

    await planGuard.canUploadFile(userId);

    const safeName = sanitizeFilename(file.originalname);
    const fileId = uuidv4();
    const fileExtension = safeName.split('.').pop() || 'bin';

    // R2 Keys
    const r2FileKey = `chatbot-data/${userId}/uploads/${fileId}.${fileExtension}`;
    const r2TextKey = `chatbot-data/${userId}/text/${fileId}.txt`;

    try {
        // 2. Upload Raw File to R2
        await r2Storage.uploadToR2(r2FileKey, file.buffer, file.mimetype);

        // 3. Extract Text
        const cleanText = await extractText(file.buffer, file.mimetype);
        if (!cleanText || cleanText.length < 50) {
            throw new Error("Extracted text is too short or empty.");
        }

        // 4. Upload Extracted Text to R2
        await r2Storage.uploadToR2(r2TextKey, cleanText, 'text/plain');

        // 5. Chunk Text
        const chunks = await embeddingService.chunkText(cleanText);

        // 6. Generate Embeddings (Batch processing recommended, but simple loop here)
        // OpenAI limits might apply, so doing sequentially or small batches is safer
        const embeddings = [];
        for (const chunk of chunks) {
            const vec = await embeddingService.generateEmbedding(chunk);
            embeddings.push(vec);
        }

        // 7. Store in Source (MongoDB)
        // We log the keys initially, but we will mark them as deleted/transient or just update later.
        // Actually, if we delete them immediately, we shouldn't store them as "valid" in MongoDB if lookups depend on them.
        // We'll store them for the record of "what was passed", but clarify they are deleted.
        const source = await Source.create({
            userId,
            type: 'file',
            fileName: safeName,
            fileSize: file.size,
            r2FileKey: r2FileKey, // Reference to what WAS used
            r2TextKey: r2TextKey, // Reference to what WAS used
            status: 'processed_and_deleted' // New status
        });

        // 8. Store Vectors
        await vectorService.storeVectors({
            userId,
            sourceId: source._id,
            sourceType: 'file',
            r2TextKey, // Still passing this reference even if file is gone, as a link
            chunks,
            embeddings
        });

        // 9. Track Usage
        await usageTracker.trackFileUpload(userId);

        // 10. CLEANUP: Delete from R2 as requested
        // "we dont need to store the files delete them as there work is done"
        // Deleting both Raw File and Extracted Text File
        await r2Storage.deleteFromR2(r2FileKey);
        await r2Storage.deleteFromR2(r2TextKey);

        console.log(`Cleanup complete: Deleted ${r2FileKey} and ${r2TextKey}`);

        return source;

    } catch (error) {
        console.error("File processing failed:", error);
        // TODO: Cleanup R2 if failed? Or mark Source as failed
        await Source.create({
            userId,
            type: 'file',
            fileName: safeName,
            status: 'failed',
            error: error.message
        });
        throw error;
    }
};

module.exports = {
    processFile,
    extractText
};
