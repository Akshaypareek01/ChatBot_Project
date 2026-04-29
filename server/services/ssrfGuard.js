/**
 * SSRF guard for the API action executor.
 *
 * The flow runtime calls outbound HTTP using URLs that clients author. Without
 * a guard, a client could point a flow at:
 *   - http://localhost/...                  -> hit our own internal services
 *   - http://169.254.169.254/...            -> AWS/GCP/Azure metadata service
 *   - http://10.0.0.5/...                   -> private network reconnaissance
 *
 * This module blocks all of the above by default while allowing the world.
 *
 * Defense-in-depth checks:
 *   1. Scheme allow-list      \u2014 only http(s).
 *   2. Hostname pre-check     \u2014 reject literal IPs in private ranges and
 *                                 obvious internal hostnames before DNS.
 *   3. DNS-resolved IP check  \u2014 the host's resolved A/AAAA records must
 *                                 not be in any private/reserved range
 *                                 (TOCTOU note below).
 *   4. Per-workspace allow    \u2014 future work; today it's a hard deny-list.
 *
 * TOCTOU caveat: the resolved IP check happens at validation time, but the
 * actual axios connect resolves DNS again. A malicious DNS record could
 * change between calls. Production hardening would be to resolve once,
 * connect via the pinned IP with a Host header. For now we accept the small
 * residual risk \u2014 the strict pre-check still blocks the common cases.
 */

const dns = require('dns').promises;
const net = require('net');

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

const FORBIDDEN_HOSTS = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata',
    'instance-data'
]);

/** RFC1918 private + loopback + link-local + CGNAT + reserved IPv4 ranges. */
const PRIVATE_IPV4_RANGES = [
    ['10.0.0.0', '10.255.255.255'],
    ['100.64.0.0', '100.127.255.255'],
    ['127.0.0.0', '127.255.255.255'],
    ['169.254.0.0', '169.254.255.255'],
    ['172.16.0.0', '172.31.255.255'],
    ['192.0.0.0', '192.0.0.255'],
    ['192.168.0.0', '192.168.255.255'],
    ['198.18.0.0', '198.19.255.255'],
    ['224.0.0.0', '255.255.255.255']
];

function ipv4ToInt(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip) {
    const n = ipv4ToInt(ip);
    if (n == null) return false;
    return PRIVATE_IPV4_RANGES.some(([lo, hi]) => {
        const loN = ipv4ToInt(lo);
        const hiN = ipv4ToInt(hi);
        return n >= loN && n <= hiN;
    });
}

function isPrivateIPv6(ip) {
    if (!ip) return false;
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;                  // loopback
    if (lower === '::') return true;                   // unspecified
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
    if (lower.startsWith('fe80')) return true;         // link-local
    if (lower.startsWith('::ffff:')) {
        // IPv4-mapped: re-check the embedded IPv4
        const v4 = lower.slice('::ffff:'.length);
        if (net.isIPv4(v4)) return isPrivateIPv4(v4);
    }
    return false;
}

/**
 * Validate a URL and return either { ok: true, url, hostname } or
 * { ok: false, reason }. Performs DNS resolution.
 *
 * @param {string} input - raw URL string.
 * @returns {Promise<{ ok: true, url: URL, hostname: string, ips: string[] } | { ok: false, reason: string }>}
 */
async function validateOutboundUrl(input) {
    if (typeof input !== 'string' || input.length === 0) {
        return { ok: false, reason: 'URL is empty' };
    }

    let url;
    try {
        url = new URL(input);
    } catch {
        return { ok: false, reason: 'URL is not a valid absolute URL' };
    }

    if (!ALLOWED_SCHEMES.has(url.protocol)) {
        return { ok: false, reason: `Scheme "${url.protocol}" is not allowed (only http/https)` };
    }

    const host = url.hostname.toLowerCase();
    if (!host) return { ok: false, reason: 'URL has no host' };

    if (FORBIDDEN_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) {
        return { ok: false, reason: `Host "${host}" is on the SSRF deny-list` };
    }

    // Literal IP fast path.
    if (net.isIPv4(host)) {
        if (isPrivateIPv4(host)) {
            return { ok: false, reason: `Host IP ${host} is in a private/reserved range` };
        }
        return { ok: true, url, hostname: host, ips: [host] };
    }
    if (net.isIPv6(host)) {
        if (isPrivateIPv6(host)) {
            return { ok: false, reason: `Host IPv6 ${host} is in a private/reserved range` };
        }
        return { ok: true, url, hostname: host, ips: [host] };
    }

    // DNS resolution path.
    let ips;
    try {
        const records = await dns.lookup(host, { all: true, verbatim: true });
        ips = records.map((r) => r.address);
    } catch (e) {
        return { ok: false, reason: `DNS lookup failed for ${host}: ${e.message}` };
    }
    if (ips.length === 0) {
        return { ok: false, reason: `No A/AAAA records for ${host}` };
    }
    for (const ip of ips) {
        if (net.isIPv4(ip) && isPrivateIPv4(ip)) {
            return { ok: false, reason: `Host ${host} resolves to private IP ${ip}` };
        }
        if (net.isIPv6(ip) && isPrivateIPv6(ip)) {
            return { ok: false, reason: `Host ${host} resolves to private IPv6 ${ip}` };
        }
    }
    return { ok: true, url, hostname: host, ips };
}

module.exports = {
    validateOutboundUrl,
    isPrivateIPv4,
    isPrivateIPv6,
    PRIVATE_IPV4_RANGES,
    FORBIDDEN_HOSTS
};
