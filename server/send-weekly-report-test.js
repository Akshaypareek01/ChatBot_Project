require('dotenv').config();

const { sendSummaryEmail } = require('./services/email.service');

/**
 * Send a full weekly report template email for visual QA.
 *
 * @param {string} to
 * @returns {Promise<void>}
 */
async function sendWeeklyReportTest(to) {
    const summary = {
        period: 'Week of ' + new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        conversations: 142,
        messages: 1048,
        uniqueVisitors: 389,
        leadsCaptured: 27,
        satisfactionPercent: 92
    };

    await sendSummaryEmail(to, 'Akshay', summary, null);
}

sendWeeklyReportTest('akshay96102@gmail.com')
    .then(() => {
        console.log('✅ Weekly report test email triggered');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Weekly report test email failed:', err?.message || err);
        process.exit(1);
    });

