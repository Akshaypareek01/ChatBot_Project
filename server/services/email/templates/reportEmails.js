/**
 * Minimal weekly report: title, period, and a compact stats table only.
 *
 * @param {{
 *  period: string,
 *  userName?: string,
 *  conversations?: number,
 *  messages?: number,
 *  uniqueVisitors?: number,
 *  leadsCaptured?: number,
 *  satisfactionPercent?: number
 * }} summary
 * @param {{ dashUrl: string }} ctx
 * @returns {string}
 */
function weeklyReportBody(summary, ctx) {
    const {
        period,
        userName,
        conversations = 0,
        messages = 0,
        uniqueVisitors = 0,
        leadsCaptured = 0,
        satisfactionPercent
    } = summary || {};

    const row = (label, value) => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">${label}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">${value}</td>
        </tr>
    `;

    return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a;">
            <div style="text-align: center; margin: 0 0 20px;">
                <div style="font-size: 18px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 6px;">Weekly report</div>
                <div style="font-size: 13px; color: #64748b; line-height: 1.45; margin: 0;">${escapeHtml(period || 'This week')}</div>
            </div>
            <p style="margin: 0 0 16px; font-size: 14px; color: #334155; text-align: center;">
                Hi ${escapeHtml(userName || 'there')},
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                ${row('Conversations', conversations)}
                ${row('Messages', messages)}
                ${row('Unique visitors', uniqueVisitors)}
                ${row('Leads captured', leadsCaptured)}
                ${satisfactionPercent != null ? row('Satisfaction', `${satisfactionPercent}%`) : ''}
            </table>
            <div style="text-align: center; margin-top: 22px;">
                <a href="${ctx.dashUrl}/analytics" style="color: #2563eb; font-size: 14px; font-weight: 600; text-decoration: underline;">View analytics</a>
            </div>
        </div>
    `;
}

/**
 * Minimal escaping for user/content fields inside HTML.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = { weeklyReportBody };
