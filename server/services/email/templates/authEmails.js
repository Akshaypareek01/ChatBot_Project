/**
 * @param {{ userName: string, otp: string }} params
 * @returns {string}
 */
function verificationOtpBody({ userName, otp }) {
    return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
            <h2 style="margin: 0 0 12px; color:#0f172a;">Welcome!</h2>
            <p style="margin: 0 0 10px;">Hello ${userName},</p>
            <p style="margin: 0 0 14px;">Please use the following OTP to verify your email address:</p>
            <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 6px; color: #2563eb; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0;">
                ${otp}
            </div>
            <p style="margin: 0; color:#64748b; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
    `;
}

/**
 * @param {{ userName: string, otp: string }} params
 * @returns {string}
 */
function passwordResetOtpBody({ userName, otp }) {
    return `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
            <h2 style="margin: 0 0 12px; color:#0f172a;">Password Reset Request</h2>
            <p style="margin: 0 0 10px;">Hello ${userName},</p>
            <p style="margin: 0 0 14px;">Use the following OTP to proceed with your password reset:</p>
            <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 6px; color: #ef4444; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0;">
                ${otp}
            </div>
            <p style="margin: 0; color:#64748b; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request a password reset, please secure your account.</p>
        </div>
    `;
}

module.exports = { verificationOtpBody, passwordResetOtpBody };

