/**
 * User-facing analytics: aggregates Conversation, Usage, and feedback data
 * for the analytics dashboard (Phase 3.1).
 */

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Usage = require('../models/Usage');

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Get start date for a period (days ago from now, start of day UTC).
 */
function getStartDate(period) {
    const days = PERIODS[period] || 30;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Chat volume over time: buckets by day. Returns { date, conversations, messages }.
 */
async function getChatVolumeOverTime(userId, period, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const convs = await Conversation.find(match).select('startedAt messages').lean();

    const byDay = {};
    convs.forEach((c) => {
        const day = new Date(c.startedAt).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { date: day, conversations: 0, messages: 0 };
        byDay[day].conversations += 1;
        byDay[day].messages += (c.messages && c.messages.length) || 0;
    });

    const sorted = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    return sorted;
}

/**
 * Totals: conversations, messages, unique visitors in period.
 */
async function getTotals(userId, period, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
    const matchAgg = { userId: uid, startedAt: { $gte: start } };
    if (botId) matchAgg.botId = botId;
    const [convs, uniqueVisitors] = await Promise.all([
        Conversation.find(match).select('visitorId messages').lean(),
        Conversation.aggregate([
            { $match: matchAgg },
            { $group: { _id: '$visitorId' } },
            { $count: 'count' }
        ])
    ]);

    const totalMessages = convs.reduce((sum, c) => sum + (c.messages && c.messages.length || 0), 0);
    return {
        totalConversations: convs.length,
        totalMessages,
        uniqueVisitors: uniqueVisitors[0]?.count ?? 0
    };
}

/**
 * Average response time: median/avg time from user message to next assistant message (ms).
 * Uses message timestamps; returns null if no data.
 */
async function getAverageResponseTime(userId, period, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const convs = await Conversation.find(match).select('messages').lean();

    const deltas = [];
    convs.forEach((c) => {
        const msgs = c.messages || [];
        for (let i = 0; i < msgs.length - 1; i++) {
            if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant' && msgs[i].timestamp && msgs[i + 1].timestamp) {
                const d = new Date(msgs[i + 1].timestamp).getTime() - new Date(msgs[i].timestamp).getTime();
                if (d > 0 && d < 300000) deltas.push(d); // cap 5 min
            }
        }
    });
    if (deltas.length === 0) return null;
    const sum = deltas.reduce((a, b) => a + b, 0);
    return Math.round(sum / deltas.length);
}

/**
 * Most asked questions: first user message per conversation, normalized and counted.
 */
async function getMostAskedQuestions(userId, period, limit = 10, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const convs = await Conversation.find(match).select('messages').lean();

    const counts = {};
    convs.forEach((c) => {
        const firstUser = (c.messages || []).find((m) => m.role === 'user');
        const text = (firstUser?.content || '').trim().slice(0, 200);
        if (!text) return;
        const key = text.length > 80 ? text.slice(0, 80) + '…' : text;
        counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([question, count]) => ({ question, count }));
}

/**
 * Unanswered / escalated: count and sample of conversation ids.
 * Unanswered = conversations where user message count > assistant message count.
 */
async function getUnansweredEscalated(userId, period, sampleLimit = 20, botId = null) {
    const start = getStartDate(period);
    const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
    const match = { userId: uid, startedAt: { $gte: start } };
    if (botId) match.botId = botId;

    const escalated = await Conversation.find({
        ...match,
        status: 'escalated'
    }).select('_id startedAt').sort({ startedAt: -1 }).limit(sampleLimit).lean();

    const matchEscalated = { userId, startedAt: { $gte: start }, status: 'escalated' };
    if (botId) matchEscalated.botId = botId;
    const escalatedCount = await Conversation.countDocuments(matchEscalated);

    const unansweredAgg = await Conversation.aggregate([
        { $match: match },
        { $project: { startedAt: 1, userCount: { $size: { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'user'] } } } }, assistantCount: { $size: { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'assistant'] } } } } } },
        { $match: { $expr: { $gt: ['$userCount', '$assistantCount'] } } },
        { $sort: { startedAt: -1 } },
        { $limit: sampleLimit },
        { $project: { _id: 1, startedAt: 1 } }
    ]);
    const unansweredCountAgg = await Conversation.aggregate([
        { $match: match },
        { $project: { userCount: { $size: { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'user'] } } } }, assistantCount: { $size: { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'assistant'] } } } } } },
        { $match: { $expr: { $gt: ['$userCount', '$assistantCount'] } } },
        { $count: 'count' }
    ]);
    const unansweredCount = unansweredCountAgg[0]?.count ?? 0;

    return {
        escalatedCount,
        unansweredCount,
        sampleEscalated: escalated.map((c) => ({ id: c._id, startedAt: c.startedAt })),
        sampleUnanswered: unansweredAgg.map((c) => ({ id: c._id, startedAt: c.startedAt }))
    };
}

/**
 * Lead capture conversion: conversations with leadInfo / total in period.
 */
async function getLeadConversionRate(userId, period, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const [total, withLead] = await Promise.all([
        Conversation.countDocuments(match),
        Conversation.countDocuments({
            ...match,
            $or: [
                { 'leadInfo.email': { $exists: true, $ne: '' } },
                { 'leadInfo.phone': { $exists: true, $ne: '' } },
                { 'leadInfo.name': { $exists: true, $ne: '' } }
            ]
        })
    ]);
    return {
        totalConversations: total,
        leadsCaptured: withLead,
        conversionRate: total ? Math.round((100 * withLead) / total) : 0
    };
}

/**
 * Token usage breakdown by type (chat, upload, scrape) in period.
 */
async function getTokenUsageBreakdown(userId, period) {
    const start = getStartDate(period);
    const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
    const agg = await Usage.aggregate([
        { $match: { userId: uid, createdAt: { $gte: start } } },
        { $group: { _id: '$type', tokensUsed: { $sum: '$tokensUsed' }, count: { $sum: 1 } } }
    ]);
    const breakdown = { chat: 0, upload: 0, scrape: 0 };
    agg.forEach((r) => {
        if (r._id in breakdown) breakdown[r._id] = r.tokensUsed;
    });
    return breakdown;
}

/**
 * Peak hours: conversations per hour (0-23) in period.
 */
async function getPeakHoursHeatmap(userId, period, botId = null) {
    const start = getStartDate(period);
    const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId);
    const matchAgg = { userId: uid, startedAt: { $gte: start } };
    if (botId) matchAgg.botId = botId;
    const agg = await Conversation.aggregate([
        { $match: matchAgg },
        { $project: { hour: { $hour: '$startedAt' } } },
        { $group: { _id: '$hour', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const byHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    agg.forEach((r) => {
        if (r._id >= 0 && r._id <= 23) byHour[r._id].count = r.count;
    });
    return byHour;
}

/**
 * Satisfaction score from feedback (thumbs up/down). Reuses same logic as getFeedbackStats.
 */
async function getSatisfactionScore(userId, period, botId = null) {
    const start = getStartDate(period);
    const match = { userId, startedAt: { $gte: start } };
    if (botId) match.botId = botId;
    const convs = await Conversation.find(match).select('messages').lean();

    let positive = 0;
    let negative = 0;
    convs.forEach((c) => {
        (c.messages || []).forEach((m) => {
            if (m.feedback === 1) positive++;
            if (m.feedback === -1) negative++;
        });
    });
    const total = positive + negative;
    return {
        positive,
        negative,
        total,
        percentPositive: total ? Math.round((100 * positive) / total) : null,
        satisfactionScore: total ? Math.round((100 * positive) / total) : null
    };
}

/**
 * Full analytics payload for the user dashboard.
 */
async function getUserAnalytics(userId, period = '30d', botId = null) {
    const start = getStartDate(period);
    const [
        chatVolumeOverTime,
        totals,
        avgResponseTime,
        mostAskedQuestions,
        unansweredEscalated,
        leadConversion,
        tokenUsageBreakdown,
        peakHoursHeatmap,
        satisfactionScore
    ] = await Promise.all([
        getChatVolumeOverTime(userId, period, botId),
        getTotals(userId, period, botId),
        getAverageResponseTime(userId, period, botId),
        getMostAskedQuestions(userId, period, 10, botId),
        getUnansweredEscalated(userId, period, 20, botId),
        getLeadConversionRate(userId, period, botId),
        getTokenUsageBreakdown(userId, period),
        getPeakHoursHeatmap(userId, period, botId),
        getSatisfactionScore(userId, period, botId)
    ]);

    return {
        period,
        startDate: start.toISOString(),
        chatVolumeOverTime,
        ...totals,
        avgResponseTimeMs: avgResponseTime,
        mostAskedQuestions,
        unansweredEscalated,
        leadConversion,
        tokenUsageBreakdown,
        peakHoursHeatmap,
        satisfactionScore
    };
}

module.exports = {
    getUserAnalytics,
    getStartDate,
    PERIODS
};
