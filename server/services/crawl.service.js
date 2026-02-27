const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Get same-origin links from a page for crawling.
 * @param {string} baseUrl - Page URL (e.g. https://example.com/page)
 * @param {cheerio.Root} $ - Cheerio root
 * @returns {string[]} Absolute URLs
 */
function getLinksFromPage(baseUrl, $) {
    const base = new URL(baseUrl);
    const seen = new Set();
    $('a[href]').each((_, el) => {
        let href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
        try {
            const absolute = new URL(href, baseUrl).href;
            if (new URL(absolute).origin !== base.origin) return;
            const withoutHash = absolute.split('#')[0];
            if (withoutHash && !seen.has(withoutHash)) seen.add(withoutHash);
        } catch (e) { /* ignore */ }
    });
    return Array.from(seen);
}

/**
 * Fetch sitemap.xml and extract URLs (supports sitemap index and plain url list).
 * @param {string} siteOrigin - e.g. https://example.com
 * @returns {Promise<string[]>}
 */
async function getSitemapUrls(siteOrigin) {
    const sitemapUrl = `${siteOrigin.replace(/\/$/, '')}/sitemap.xml`;
    try {
        const res = await axios.get(sitemapUrl, { timeout: 10000, responseType: 'text' });
        const $ = cheerio.load(res.data, { xmlMode: true });
        const urls = [];
        $('url loc').each((_, el) => {
            const loc = $(el).text().trim();
            if (loc) urls.push(loc);
        });
        $('sitemap loc').each((_, el) => {
            const loc = $(el).text().trim();
            if (loc) urls.push(loc);
        });
        return urls;
    } catch (e) {
        return [];
    }
}

/**
 * Crawl from entry URL with BFS up to maxDepth (1 = entry only, 2 = entry + its links, etc.).
 * Optionally use sitemap to discover URLs first (same origin only).
 * @param {string} entryUrl
 * @param {number} maxDepth - 1 to 3
 * @param {boolean} useSitemap
 * @returns {Promise<string[]>} Unique URLs to scrape
 */
async function discoverUrls(entryUrl, maxDepth = 1, useSitemap = true) {
    const base = new URL(entryUrl);
    const origin = base.origin;
    let toVisit = [entryUrl];
    const visited = new Set([entryUrl]);

    if (useSitemap && maxDepth > 1) {
        const sitemapUrls = await getSitemapUrls(origin);
        const sameOrigin = sitemapUrls.filter((u) => {
            try {
                return new URL(u).origin === origin;
            } catch (e) {
                return false;
            }
        });
        sameOrigin.slice(0, 50).forEach((u) => {
            const clean = u.split('#')[0];
            if (!visited.has(clean)) {
                visited.add(clean);
                toVisit.push(clean);
            }
        });
    }

    if (maxDepth === 1) {
        return toVisit.slice(0, 1);
    }

    let currentLevel = toVisit;
    for (let depth = 1; depth < maxDepth && currentLevel.length > 0; depth++) {
        const nextLevel = [];
        for (const url of currentLevel) {
            try {
                const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                const $ = cheerio.load(res.data);
                const links = getLinksFromPage(url, $);
                for (const link of links) {
                    const clean = link.split('#')[0];
                    if (!visited.has(clean) && visited.size < 30) {
                        visited.add(clean);
                        nextLevel.push(clean);
                    }
                }
            } catch (e) {
                // skip failed page
            }
        }
        toVisit = toVisit.concat(nextLevel);
        currentLevel = nextLevel;
    }

    return Array.from(visited).slice(0, 30);
}

module.exports = { getLinksFromPage, getSitemapUrls, discoverUrls };
