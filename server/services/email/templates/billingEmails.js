/**
 * @param {{ userName: string, currentBalance: number, dashUrl: string }} params
 * @returns {string}
 */
function lowBalanceBody({ userName, currentBalance, dashUrl }) {
    return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
            <h2 style="margin: 0 0 10px; color:#0f172a;">Low Token Balance</h2>
            <p style="margin: 0 0 10px; color:#334155;">Hello ${userName},</p>
            <p style="margin: 0 0 14px; color:#334155;">
                Your chatbot token balance is running low. You currently have <strong>${Number(currentBalance || 0).toLocaleString()}</strong> tokens remaining.
            </p>
            <a href="${dashUrl}/transactions" style="background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 800;">Recharge now</a>
        </div>
    `;
}

/**
 * @param {{ userName: string, dashUrl: string }} params
 * @returns {string}
 */
function emptyBalanceBody({ userName, dashUrl }) {
    return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
            <h2 style="margin: 0 0 10px; color:#ef4444;">Token Balance Empty</h2>
            <p style="margin: 0 0 10px; color:#334155;">Hello ${userName},</p>
            <p style="margin: 0 0 14px; color:#334155;">
                Your chatbot tokens have expired. Your bot has <strong>stopped answering</strong>. Recharge now to reactivate services.
            </p>
            <a href="${dashUrl}/transactions" style="background: #ef4444; color: white; padding: 12px 18px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 800;">Recharge immediately</a>
        </div>
    `;
}

module.exports = { lowBalanceBody, emptyBalanceBody };

