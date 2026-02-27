const Source = require('../models/Source');
const scraperService = require('../services/scraperService');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Find website sources that are due for re-scrape and run them.
 * Called periodically (e.g. every hour).
 */
async function runScheduledScrapes() {
    const now = Date.now();
    const due = await Source.find({
        type: 'website',
        url: { $exists: true, $ne: '' },
        scrapeSchedule: { $in: ['daily', 'weekly'] },
        status: 'indexed'
    }).lean();

    for (const src of due) {
        const last = src.lastScrapedAt ? new Date(src.lastScrapedAt).getTime() : 0;
        const interval = src.scrapeSchedule === 'weekly' ? MS_PER_WEEK : MS_PER_DAY;
        if (now - last < interval) continue;

        try {
            await scraperService.reScrapeSource(src);
            await Source.updateOne(
                { _id: src._id },
                { $set: { lastScrapedAt: new Date(), updatedAt: new Date() } }
            );
            console.log(`Scheduled re-scrape done: ${src.url}`);
        } catch (err) {
            console.error(`Scheduled re-scrape failed for ${src.url}:`, err.message);
        }
    }
}

module.exports = { runScheduledScrapes };
