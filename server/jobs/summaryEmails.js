/**
 * Phase 3.4: Daily/weekly summary email (chat stats, leads).
 * Run daily; for weekly summary send only on configured weekday (e.g. Monday).
 */

const User = require('../models/User');
const emailService = require('../services/email.service');
const analyticsService = require('../services/analytics.service');

const SUMMARY_WEEKDAY = 1; // 0 = Sunday, 1 = Monday

async function runSummaryEmails() {
    const now = new Date();
    const isWeeklyDay = now.getUTCDay() === SUMMARY_WEEKDAY;

    const dailyUsers = await User.find({
        role: 'user',
        isActive: true,
        emailSummary: 'daily'
    }).select('_id email name').lean();

    const weeklyUsers = isWeeklyDay
        ? await User.find({
              role: 'user',
              isActive: true,
              emailSummary: 'weekly'
          }).select('_id email name').lean()
        : [];

    for (const u of dailyUsers) {
        try {
            const data = await analyticsService.getUserAnalytics(u._id, '7d');
            const leadConv = data.leadConversion || {};
            await emailService.sendSummaryEmail(u.email, u.name, {
                period: 'Last 7 days',
                conversations: data.totalConversations,
                messages: data.totalMessages,
                uniqueVisitors: data.uniqueVisitors,
                leadsCaptured: leadConv.leadsCaptured,
                satisfactionPercent: data.satisfactionScore?.satisfactionScore ?? data.satisfactionScore?.percentPositive ?? null
            });
        } catch (err) {
            console.error('Summary email (daily) failed for', u.email, err.message);
        }
    }

    for (const u of weeklyUsers) {
        try {
            const data = await analyticsService.getUserAnalytics(u._id, '30d');
            const leadConv = data.leadConversion || {};
            await emailService.sendSummaryEmail(u.email, u.name, {
                period: 'Last 30 days',
                conversations: data.totalConversations,
                messages: data.totalMessages,
                uniqueVisitors: data.uniqueVisitors,
                leadsCaptured: leadConv.leadsCaptured,
                satisfactionPercent: data.satisfactionScore?.satisfactionScore ?? data.satisfactionScore?.percentPositive ?? null
            });
        } catch (err) {
            console.error('Summary email (weekly) failed for', u.email, err.message);
        }
    }

    if (dailyUsers.length || weeklyUsers.length) {
        console.log(`Summary emails: daily=${dailyUsers.length} weekly=${weeklyUsers.length}`);
    }
}

module.exports = { runSummaryEmails };
