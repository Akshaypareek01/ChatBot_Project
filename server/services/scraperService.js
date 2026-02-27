const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const r2Storage = require('./r2Storage.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const Source = require('../models/Source');
const { discoverUrls } = require('./crawl.service');

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
            status: 'indexed',
            lastScrapedAt: new Date()
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
        await usageTracker.trackWebsiteScrape(userId);
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

/**
 * Multi-page crawl: discover URLs (sitemap + link following) up to maxDepth, scrape each, combine and index.
 * @param {string} userId
 * @param {string} entryUrl
 * @param {number} maxDepth - 1 to 3
 * @param {(data: { pagesFound: number, pagesScraped: number, status: string }) => void} [onProgress]
 */
const processWebsiteMulti = async (userId, entryUrl, maxDepth = 1, onProgress) => {
    await planGuard.canAddWebsite(userId);
    const depth = Math.min(3, Math.max(1, parseInt(maxDepth, 10) || 1));
    const urls = await discoverUrls(entryUrl, depth, true);
    if (onProgress) onProgress({ pagesFound: urls.length, pagesScraped: 0, status: 'scraping' });

    const allTexts = [];
    let scraped = 0;
    for (const url of urls) {
        try {
            const { text } = await scrapeContent(url);
            if (text && text.length >= 50) {
                allTexts.push(`[Source: ${url}]\n${text}`);
                scraped++;
                if (onProgress) onProgress({ pagesFound: urls.length, pagesScraped: scraped, status: 'scraping' });
            }
        } catch (e) {
            // skip failed page
        }
    }

    if (allTexts.length === 0) {
        throw new Error('No content could be scraped from the given URL(s).');
    }

    const combined = allTexts.join('\n\n---\n\n');
    const urlSafe = entryUrl.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const r2TextKey = `chatbot-data/${userId}/website/${urlSafe}_${Date.now()}.txt`;

    if (onProgress) onProgress({ pagesFound: urls.length, pagesScraped: scraped, status: 'indexing' });

    await r2Storage.uploadToR2(r2TextKey, combined, 'text/plain');
    const chunks = await embeddingService.chunkText(combined);
    const embeddings = [];
    for (const chunk of chunks) {
        const vec = await embeddingService.generateEmbedding(chunk);
        embeddings.push(vec);
    }

    const source = await Source.create({
        userId,
        type: 'website',
        url: entryUrl,
        pageCount: scraped,
        r2TextKey,
        status: 'indexed',
        lastScrapedAt: new Date()
    });

    await vectorService.storeVectors({
        userId,
        sourceId: source._id,
        sourceType: 'website',
        r2TextKey,
        chunks,
        embeddings
    });

    await usageTracker.trackWebsiteScrape(userId);
    if (onProgress) onProgress({ pagesFound: urls.length, pagesScraped: scraped, status: 'done' });
    return source;
};

/**
 * Re-scrape a website source and replace its vectors (for scheduled refresh).
 * @param {Object} source - Source document with url, userId, _id
 */
const reScrapeSource = async (source) => {
    if (source.type !== 'website' || !source.url) throw new Error('Invalid source for re-scrape.');
    const { url, userId, _id: sourceId } = source;
    const { text } = await scrapeContent(url);
    if (!text || text.length < 50) throw new Error('Re-scrape produced no content.');
    const r2TextKey = `chatbot-data/${userId}/website/${sourceId}_${Date.now()}.txt`;
    await r2Storage.uploadToR2(r2TextKey, text, 'text/plain');
    const chunks = await embeddingService.chunkText(text);
    const embeddings = [];
    for (const chunk of chunks) {
        const vec = await embeddingService.generateEmbedding(chunk);
        embeddings.push(vec);
    }
    await vectorService.deleteVectorsBySourceId(sourceId);
    await vectorService.storeVectors({
        userId: source.userId,
        sourceId,
        sourceType: 'website',
        r2TextKey,
        chunks,
        embeddings
    });
    return { chunks: chunks.length };
};

module.exports = { processWebsite, processWebsiteMulti, scrapeContent, reScrapeSource };
