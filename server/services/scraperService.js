const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const r2Storage = require('./r2Storage.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const Source = require('../models/Source');

/**
 * Scrape content from a URL
 * @param {string} url 
 * @returns {Promise<Object>} { text, title, pageCount }
 */
const scrapeContent = async (url) => {
    // Basic implementation - single page
    const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);

    // Remove scripts, styles
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();

    const title = $('title').text().trim();
    // Get main content
    // Tweak selectors based on broad compatibility
    const content = $('body').text().replace(/\s+/g, ' ').trim();

    return {
        text: content,
        title: title || url,
        pageCount: 1
    };
};

/**
 * Process website scraping flow
 * @param {string} userId 
 * @param {string} url 
 */
const processWebsite = async (userId, url) => {
    // 1. Validate Plan
    // Check if website limit reached (if new website) OR page limit
    // Assuming 'url' is a new source. If updating, logic differs. 
    // For MVP, treat as new source.
    await planGuard.canAddWebsite(userId);
    await planGuard.canScrapePages(userId, 1);

    const sourceId = uuidv4(); // or use UUID for R2 key part
    // R2 Key
    // URL safe filename
    const urlSafe = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const r2TextKey = `chatbot-data/${userId}/website/${urlSafe}_${Date.now()}.txt`;

    try {
        // 2. Scrape
        const { text, title, pageCount } = await scrapeContent(url);

        if (!text || text.length < 100) {
            throw new Error("Scraped content too short.");
        }

        // 3. Upload Cleaned Text to R2
        await r2Storage.uploadToR2(r2TextKey, text, 'text/plain');

        // 4. Chunk
        const chunks = await embeddingService.chunkText(text);

        // 5. Generate Embeddings
        const embeddings = [];
        for (const chunk of chunks) {
            const vec = await embeddingService.generateEmbedding(chunk);
            embeddings.push(vec);
        }

        // 6. Save MongoDB Reference
        const source = await Source.create({
            userId,
            type: 'website',
            url,
            pageCount,
            r2TextKey,
            status: 'indexed'
        });

        // 7. Store Vectors
        await vectorService.storeVectors({
            userId,
            sourceId: source._id,
            sourceType: 'website',
            r2TextKey,
            chunks,
            embeddings
        });

        // 8. Track Usage
        await usageTracker.trackWebsiteAdd(userId);
        // await usageTracker.trackPagesScraped(userId, pageCount); // If we added that tracker

        return source;

    } catch (error) {
        console.error("Website processing failed:", error);
        await Source.create({
            userId,
            type: 'website',
            url,
            status: 'failed',
            error: error.message
        });
        throw error;
    }
};

module.exports = { processWebsite, scrapeContent };
