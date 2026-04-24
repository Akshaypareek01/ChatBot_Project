const nodemailer = require('nodemailer');
const { wrapEmailHtml, getEmailBranding } = require('./emailBranding');
const { getBrandingAttachments } = require('./email/emailAssets');
const { lowBalanceBody, emptyBalanceBody } = require('./email/templates/billingEmails');
const { verificationOtpBody, passwordResetOtpBody } = require('./email/templates/authEmails');
const { weeklyReportBody } = require('./email/templates/reportEmails');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_PORT == 465), // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// Zoho requires the 'from' email to ALWAYS match the authenticated 'user' email.
const safeFrom = `"ChatBot Support" <${process.env.SMTP_USER}>`;
const { logoUrl: EMAIL_LOGO_URL, logoCid: EMAIL_LOGO_CID, brandName: EMAIL_BRAND_NAME } = getEmailBranding();
const { logoCid: INLINE_LOGO_CID, attachments: BRAND_ATTACHMENTS } = getBrandingAttachments();

const User = require('../models/User');
const Plan = require('../models/Plan');

/** Phase 5.5: Get sender options for whitelabel user (custom From name, Reply-To). */
async function getSenderForUser(userId) {
    if (!userId) return { from: safeFrom, replyTo: undefined };
    const user = await User.findById(userId).select('planId customEmailFromName customEmailReplyTo').lean();
    if (!user) return { from: safeFrom, replyTo: undefined };
    let whitelabel = false;
    if (user.planId) {
        const plan = await Plan.findOne({ _id: user.planId, isActive: true }).select('whitelabel').lean();
        whitelabel = !!plan?.whitelabel;
    }
    if (!whitelabel || !user.customEmailFromName) return { from: safeFrom, replyTo: user.customEmailReplyTo || undefined };
    const fromName = user.customEmailFromName.trim();
    return {
        from: `"${fromName.replace(/"/g, '')}" <${process.env.SMTP_USER}>`,
        replyTo: user.customEmailReplyTo ? user.customEmailReplyTo.trim() : undefined
    };
}

/** Phase 5.5: Dashboard URL for user (custom domain if set). */
async function dashboardUrlForUser(userId) {
    const base = (process.env.Web_url || 'https://app.example.com').replace(/\/$/, '');
    if (!userId) return base + '/user';
    const user = await User.findById(userId).select('customDashboardDomain').lean();
    if (!user?.customDashboardDomain) return base + '/user';
    const domain = user.customDashboardDomain.trim().replace(/^https?:\/\//, '');
    return `https://${domain}/user`;
}

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error("❌ SMTP Connection Error:", error.message);
    } else {
        console.log("✅ SMTP Server is ready to take our messages");
    }
});

/**
 * Send Low Balance Email
 * @param {string} userEmail 
 * @param {string} userName 
 * @param {number} currentBalance 
 */
const sendLowBalanceEmail = async (userEmail, userName, currentBalance, userId = null) => {
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        const mailOptions = {
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: 'Low Token Balance Alert',
            attachments: BRAND_ATTACHMENTS,
            html: wrapEmailHtml({
                subject: 'Low Token Balance Alert',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                logoCid: EMAIL_LOGO_CID || INLINE_LOGO_CID,
                bodyHtml: lowBalanceBody({ userName, currentBalance, dashUrl })
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Low balance email sent to ${userEmail} via Zoho`);
    } catch (error) {
        console.error("❌ SMTP Low Balance Error:", error.message);
    }
};

/**
 * Send Token Empty Alert
 * @param {string} userEmail 
 * @param {string} userName 
 */
const sendEmptyBalanceEmail = async (userEmail, userName, userId = null) => {
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        const mailOptions = {
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: 'URGENT: Token Balance Empty',
            attachments: BRAND_ATTACHMENTS,
            html: wrapEmailHtml({
                subject: 'URGENT: Token Balance Empty',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                logoCid: EMAIL_LOGO_CID || INLINE_LOGO_CID,
                bodyHtml: emptyBalanceBody({ userName, dashUrl })
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Empty balance email sent to ${userEmail} via Zoho`);
    } catch (error) {
        console.error("❌ SMTP Empty Balance Error:", error.message);
    }
};

/**
 * Send Payment Success Email (Basic Invoice)
 */
const sendPaymentSuccessEmail = async (userEmail, userName, amount, tokens, orderId, userId = null) => {
    try {
        const sender = await getSenderForUser(userId);
        const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const mailOptions = {
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: `Invoice for Order #${orderId} - Payment Successful`,
            html: wrapEmailHtml({
                subject: `Invoice for Order #${orderId} - Payment Successful`,
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <div style="background-color: #27ae60; padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Payment Successful!</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Thank you for your business, ${userName}</p>
                    </div>
                    
                    <div style="padding: 30px; background-color: #ffffff;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #f8f9fa; padding-bottom: 15px;">
                            <div>
                                <p style="margin: 0; color: #7f8c8d; font-size: 12px; text-transform: uppercase;">Payment Reference</p>
                                <p style="margin: 5px 0; font-weight: bold; color: #2c3e50;">${orderId}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0; color: #7f8c8d; font-size: 12px; text-transform: uppercase;">Date</p>
                                <p style="margin: 5px 0; font-weight: bold; color: #2c3e50;">${currentDate}</p>
                            </div>
                        </div>

                        <h3 style="color: #2c3e50; margin-top: 0;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #7f8c8d;">Description</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #7f8c8d;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 12px; border-bottom: 1px solid #f8f9fa; font-size: 15px; color: #2c3e50;">
                                        <strong>Token Recharge</strong><br>
                                        <span style="font-size: 12px; color: #95a5a6;">${tokens.toLocaleString()} AI Chat Tokens</span>
                                    </td>
                                    <td style="padding: 12px; border-bottom: 1px solid #f8f9fa; text-align: right; font-weight: bold; color: #2c3e50;">₹${amount}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style="padding: 15px 12px; text-align: right; font-weight: bold; color: #7f8c8d; text-transform: uppercase; font-size: 13px;">Total Paid</td>
                                    <td style="padding: 15px 12px; text-align: right; font-size: 20px; font-weight: bold; color: #27ae60;">₹${amount}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div style="background-color: #fff9db; padding: 15px; border-radius: 8px; border-left: 4px solid #f1c40f;">
                            <p style="margin: 0; font-size: 14px; color: #856404;">
                                <strong>Tokens Credited:</strong> ${tokens.toLocaleString()} tokens have been added to your dashboard. You can continue using the chatbot services immediately.
                            </p>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #95a5a6; font-size: 12px;">
                        <p style="margin: 0;">If you have any questions regarding this invoice, please reply to this email.</p>
                        <p style="margin: 10px 0 0 0;">© 2026 Nvhotech Private Ltd. All rights reserved.</p>
                    </div>
                </div>
                `
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Success email (Invoice) sent to ${userEmail} via Zoho`);
    } catch (error) {
        console.error("❌ SMTP Success Email Error:", error.message);
    }
};

/**
 * Send Payment Failure Email
 */
const sendPaymentFailureEmail = async (userEmail, userName, amount, orderId) => {
    try {
        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: 'Payment Failed - Order Update',
            html: wrapEmailHtml({
                subject: 'Payment Failed - Order Update',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #e74c3c; margin: 0 0 12px;">Payment Failed</h2>
                        <p>Hello ${userName},</p>
                        <p>Your payment attempt of <strong>₹${amount}</strong> for Order ID <strong>${orderId}</strong> has failed or was cancelled.</p>
                        <p>If any money was deducted, it will be automatically refunded within 5-7 business days.</p>
                        <p>Please try again or contact support if you face issues.</p>
                    </div>
                `
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Failure email sent to ${userEmail} via Zoho`);
    } catch (error) {
        console.error("❌ SMTP Failure Email Error:", error.message);
    }
};

/**
 * Send Verification Email with OTP
 */
const sendVerificationEmail = async (userEmail, userName, otp) => {
    try {
        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: 'Verify Your Email - ChatBot',
            attachments: BRAND_ATTACHMENTS,
            html: wrapEmailHtml({
                subject: 'Verify Your Email - ChatBot',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                logoCid: EMAIL_LOGO_CID || INLINE_LOGO_CID,
                bodyHtml: verificationOtpBody({ userName, otp })
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${userEmail}`);
    } catch (error) {
        console.error("❌ SMTP Verification Email Error:", error.message);
    }
};

/**
 * Send Password Reset Email with OTP
 */
const sendPasswordResetEmail = async (userEmail, userName, otp) => {
    try {
        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: 'Password Reset Request - ChatBot',
            attachments: BRAND_ATTACHMENTS,
            html: wrapEmailHtml({
                subject: 'Password Reset Request - ChatBot',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                logoCid: EMAIL_LOGO_CID || INLINE_LOGO_CID,
                bodyHtml: passwordResetOtpBody({ userName, otp })
            })
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${userEmail}`);
    } catch (error) {
        console.error("❌ SMTP Password Reset Email Error:", error.message);
    }
};

/**
 * Notify chatbot owner when a new lead is captured via pre-chat form.
 */
const sendNewLeadEmail = async (ownerEmail, ownerName, lead) => {
    if (!ownerEmail) return;
    try {
        const parts = [];
        if (lead.name) parts.push(`<strong>Name:</strong> ${lead.name}`);
        if (lead.email) parts.push(`<strong>Email:</strong> ${lead.email}`);
        if (lead.phone) parts.push(`<strong>Phone:</strong> ${lead.phone}`);
        if (parts.length === 0) return;
        const mailOptions = {
            from: safeFrom,
            to: ownerEmail,
            subject: 'New lead captured from your chatbot',
            html: wrapEmailHtml({
                subject: 'New lead captured from your chatbot',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #2563eb; margin: 0 0 12px;">New lead</h2>
                        <p>Hello ${ownerName || 'there'},</p>
                        <p>A visitor just submitted their details on your chatbot:</p>
                        <div style="background: #f8fafc; padding: 14px; border-radius: 10px; margin: 14px 0; border: 1px solid #e2e8f0;">
                            ${parts.join('<br/>')}
                        </div>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">Check your Conversations in the dashboard to view the full chat.</p>
                    </div>
                `
            })
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ New lead email sent to ${ownerEmail}`);
    } catch (error) {
        console.error('❌ New lead email error:', error.message);
    }
};

/**
 * Phase 3.2: Onboarding email sequence — Day 1 (welcome + first steps).
 */
const sendOnboardingDay1Email = async (userEmail, userName, userId = null) => {
    if (!userEmail) return;
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        await transporter.sendMail({
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: 'Welcome! Here\'s how to get your chatbot live in 5 minutes',
            html: wrapEmailHtml({
                subject: 'Welcome! Here\'s how to get your chatbot live in 5 minutes',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #2563eb; margin: 0 0 12px;">Welcome, ${userName || 'there'}!</h2>
                        <p>Thanks for signing up. Your AI chatbot is ready — here’s how to get it on your site:</p>
                        <ol style="line-height: 1.8;">
                            <li><strong>Add your content</strong> — Scrape your website or upload a PDF in the Knowledge Base.</li>
                            <li><strong>Customize</strong> — Set your brand name, colors, and welcome message in Widget settings.</li>
                            <li><strong>Embed</strong> — Copy the script from your dashboard and paste it before &lt;/body&gt; on your site.</li>
                        </ol>
                        <p style="margin: 16px 0 0;">
                            <a href="${dashUrl}" style="background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 10px; display: inline-block;">Open dashboard</a>
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin-top: 18px; margin-bottom: 0;">If you need help, reply to this email.</p>
                    </div>
                `
            })
        });
        console.log(`✅ Onboarding Day 1 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 1 email error:', error.message);
    }
};

/**
 * Phase 3.2: Onboarding Day 3 — tips and best practices.
 */
const sendOnboardingDay3Email = async (userEmail, userName, userId = null) => {
    if (!userEmail) return;
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        await transporter.sendMail({
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: '3 tips to get more from your chatbot',
            html: wrapEmailHtml({
                subject: '3 tips to get more from your chatbot',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #2563eb; margin: 0 0 12px;">Hi ${userName || 'there'},</h2>
                        <p>Quick tips to make your chatbot more useful:</p>
                        <ul style="line-height: 1.8; margin: 10px 0 0; padding-left: 18px;">
                            <li><strong>Add suggested questions</strong> — In Widget settings, add 3–5 starter questions so visitors know what to ask.</li>
                            <li><strong>Turn on lead capture</strong> — Enable the pre-chat form to collect name and email before the conversation.</li>
                            <li><strong>Check Analytics</strong> — See chat volume, satisfaction, and top questions in the Analytics page.</li>
                        </ul>
                        <p style="margin: 16px 0 0;">
                            <a href="${dashUrl}" style="background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 10px; display: inline-block;">Go to dashboard</a>
                        </p>
                    </div>
                `
            })
        });
        console.log(`✅ Onboarding Day 3 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 3 email error:', error.message);
    }
};

/**
 * Phase 3.2: Onboarding Day 7 — check-in and support.
 */
const sendOnboardingDay7Email = async (userEmail, userName, userId = null) => {
    if (!userEmail) return;
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        await transporter.sendMail({
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            subject: 'How\'s your chatbot doing? We\'re here to help',
            html: wrapEmailHtml({
                subject: 'How\'s your chatbot doing? We\'re here to help',
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                bodyHtml: `
                    <div style="font-family: sans-serif;">
                        <h2 style="color: #2563eb; margin: 0 0 12px;">Hi ${userName || 'there'},</h2>
                        <p>You’ve been with us for a week. Here’s a quick checklist:</p>
                        <ul style="line-height: 1.8; margin: 10px 0 0; padding-left: 18px;">
                            <li>Is the widget live on your site? Check <strong>Domain Security</strong> if you restricted domains.</li>
                            <li>Review <strong>Conversations</strong> and <strong>Analytics</strong> to see how visitors are using the bot.</li>
                            <li>Need more credits? Top up anytime from <strong>Transactions</strong>.</li>
                        </ul>
                        <p style="margin: 16px 0 0;">
                            <a href="${dashUrl}" style="background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; border-radius: 10px; display: inline-block;">Open dashboard</a>
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin-top: 18px; margin-bottom: 0;">Reply to this email if you have questions — we’re happy to help.</p>
                    </div>
                `
            })
        });
        console.log(`✅ Onboarding Day 7 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 7 email error:', error.message);
    }
};

/**
 * Phase 3.4: Daily/weekly summary email (chat stats, leads).
 */
const sendSummaryEmail = async (userEmail, userName, summary, userId = null) => {
    if (!userEmail || !summary) return;
    try {
        const sender = await getSenderForUser(userId);
        const dashUrl = await dashboardUrlForUser(userId);
        const { period } = summary;
        await transporter.sendMail({
            from: sender.from,
            replyTo: sender.replyTo,
            to: userEmail,
            attachments: BRAND_ATTACHMENTS,
            subject: `Your chatbot summary (${period})`,
            html: wrapEmailHtml({
                subject: `Your chatbot summary (${period})`,
                brandName: EMAIL_BRAND_NAME,
                logoUrl: EMAIL_LOGO_URL,
                logoCid: EMAIL_LOGO_CID || INLINE_LOGO_CID,
                bodyHtml: weeklyReportBody(
                    { ...summary, userName: userName || summary.userName || 'there' },
                    { dashUrl }
                )
            })
        });
        console.log(`✅ Summary email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Summary email error:', error.message);
    }
};

module.exports = {
    sendLowBalanceEmail,
    sendEmptyBalanceEmail,
    sendPaymentSuccessEmail,
    sendPaymentFailureEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendNewLeadEmail,
    sendOnboardingDay1Email,
    sendOnboardingDay3Email,
    sendOnboardingDay7Email,
    sendSummaryEmail
};
