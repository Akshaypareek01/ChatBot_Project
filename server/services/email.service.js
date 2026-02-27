const nodemailer = require('nodemailer');

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
const sendLowBalanceEmail = async (userEmail, userName, currentBalance) => {
    try {
        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: 'Low Token Balance Alert',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f39c12;">Low Token Balance!</h2>
                    <p>Hello ${userName},</p>
                    <p>Your chatbot token balance is running low. You currently have <strong>${currentBalance.toLocaleString()}</strong> tokens remaining.</p>
                    <p>Please recharge soon to ensure your chatbot remains active without interruption.</p>
                    <div style="margin-top: 20px;">
                        <a href="${process.env.Web_url}/user/transactions" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Recharge Now</a>
                    </div>
                </div>
            `
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
const sendEmptyBalanceEmail = async (userEmail, userName) => {
    try {
        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: 'URGENT: Token Balance Empty',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #e74c3c;">Out of Tokens!</h2>
                    <p>Hello ${userName},</p>
                    <p>URGENT: Your chatbot tokens have expired. Your bot has <strong>stopped answering</strong>.</p>
                    <p>Please recharge immediately to reactivate your AI services.</p>
                    <div style="margin-top: 20px;">
                        <a href="${process.env.Web_url}/user/transactions" style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Recharge Immediately</a>
                    </div>
                </div>
            `
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
const sendPaymentSuccessEmail = async (userEmail, userName, amount, tokens, orderId) => {
    try {
        const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const mailOptions = {
            from: safeFrom,
            to: userEmail,
            subject: `Invoice for Order #${orderId} - Payment Successful`,
            html: `
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
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #e74c3c;">Payment Failed</h2>
                    <p>Hello ${userName},</p>
                    <p>Your payment attempt of <strong>₹${amount}</strong> for Order ID <strong>${orderId}</strong> has failed or was cancelled.</p>
                    <p>If any money was deducted, it will be automatically refunded within 5-7 business days.</p>
                    <p>Please try again or contact support if you face issues.</p>
                </div>
            `
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
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2>Welcome to ChatBot!</h2>
                    <p>Hello ${userName},</p>
                    <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
                    <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3498db; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
            `
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
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2>Password Reset Request</h2>
                    <p>Hello ${userName},</p>
                    <p>We received a request to reset your password. Use the following OTP to proceed:</p>
                    <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #e74c3c; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 10 minutes. If you did not request a password reset, please secure your account.</p>
                </div>
            `
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
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">New lead</h2>
                    <p>Hello ${ownerName || 'there'},</p>
                    <p>A visitor just submitted their details on your chatbot:</p>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        ${parts.join('<br/>')}
                    </div>
                    <p style="color: #64748b; font-size: 14px;">Check your Conversations in the dashboard to view the full chat.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ New lead email sent to ${ownerEmail}`);
    } catch (error) {
        console.error('❌ New lead email error:', error.message);
    }
};

const dashboardUrl = () => (process.env.Web_url || 'https://app.example.com').replace(/\/$/, '') + '/user';
const loginUrl = () => (process.env.Web_url || 'https://app.example.com').replace(/\/$/, '') + '/login';

/**
 * Phase 3.2: Onboarding email sequence — Day 1 (welcome + first steps).
 */
const sendOnboardingDay1Email = async (userEmail, userName) => {
    if (!userEmail) return;
    try {
        await transporter.sendMail({
            from: safeFrom,
            to: userEmail,
            subject: 'Welcome! Here\'s how to get your chatbot live in 5 minutes',
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 560px;">
                    <h2 style="color: #2563eb;">Welcome, ${userName || 'there'}!</h2>
                    <p>Thanks for signing up. Your AI chatbot is ready — here’s how to get it on your site:</p>
                    <ol style="line-height: 1.8;">
                        <li><strong>Add your content</strong> — Scrape your website or upload a PDF in the Knowledge Base.</li>
                        <li><strong>Customize</strong> — Set your brand name, colors, and welcome message in Widget settings.</li>
                        <li><strong>Embed</strong> — Copy the script from your dashboard and paste it before &lt;/body&gt; on your site.</li>
                    </ol>
                    <p><a href="${dashboardUrl()}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Open dashboard</a></p>
                    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">If you need help, reply to this email.</p>
                </div>
            `
        });
        console.log(`✅ Onboarding Day 1 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 1 email error:', error.message);
    }
};

/**
 * Phase 3.2: Onboarding Day 3 — tips and best practices.
 */
const sendOnboardingDay3Email = async (userEmail, userName) => {
    if (!userEmail) return;
    try {
        await transporter.sendMail({
            from: safeFrom,
            to: userEmail,
            subject: '3 tips to get more from your chatbot',
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 560px;">
                    <h2 style="color: #2563eb;">Hi ${userName || 'there'},</h2>
                    <p>Quick tips to make your chatbot more useful:</p>
                    <ul style="line-height: 1.8;">
                        <li><strong>Add suggested questions</strong> — In Widget settings, add 3–5 starter questions so visitors know what to ask.</li>
                        <li><strong>Turn on lead capture</strong> — Enable the pre-chat form to collect name and email before the conversation.</li>
                        <li><strong>Check Analytics</strong> — See chat volume, satisfaction, and top questions in the Analytics page.</li>
                    </ul>
                    <p><a href="${dashboardUrl()}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to dashboard</a></p>
                </div>
            `
        });
        console.log(`✅ Onboarding Day 3 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 3 email error:', error.message);
    }
};

/**
 * Phase 3.2: Onboarding Day 7 — check-in and support.
 */
const sendOnboardingDay7Email = async (userEmail, userName) => {
    if (!userEmail) return;
    try {
        await transporter.sendMail({
            from: safeFrom,
            to: userEmail,
            subject: 'How\'s your chatbot doing? We\'re here to help',
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 560px;">
                    <h2 style="color: #2563eb;">Hi ${userName || 'there'},</h2>
                    <p>You’ve been with us for a week. Here’s a quick checklist:</p>
                    <ul style="line-height: 1.8;">
                        <li>Is the widget live on your site? Check <strong>Domain Security</strong> if you restricted domains.</li>
                        <li>Review <strong>Conversations</strong> and <strong>Analytics</strong> to see how visitors are using the bot.</li>
                        <li>Need more credits? Top up anytime from <strong>Transactions</strong>.</li>
                    </ul>
                    <p><a href="${dashboardUrl()}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Open dashboard</a></p>
                    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Reply to this email if you have questions — we’re happy to help.</p>
                </div>
            `
        });
        console.log(`✅ Onboarding Day 7 email sent to ${userEmail}`);
    } catch (error) {
        console.error('❌ Onboarding Day 7 email error:', error.message);
    }
};

/**
 * Phase 3.4: Daily/weekly summary email (chat stats, leads).
 */
const sendSummaryEmail = async (userEmail, userName, summary) => {
    if (!userEmail || !summary) return;
    try {
        const { period, conversations, messages, uniqueVisitors, leadsCaptured, satisfactionPercent } = summary;
        await transporter.sendMail({
            from: safeFrom,
            to: userEmail,
            subject: `Your chatbot summary (${period})`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 560px;">
                    <h2 style="color: #2563eb;">${period} summary</h2>
                    <p>Hello ${userName || 'there'},</p>
                    <p>Here’s how your chatbot performed:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Conversations</td><td style="text-align: right; font-weight: 600;">${conversations ?? 0}</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Messages</td><td style="text-align: right; font-weight: 600;">${messages ?? 0}</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Unique visitors</td><td style="text-align: right; font-weight: 600;">${uniqueVisitors ?? 0}</td></tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0;">Leads captured</td><td style="text-align: right; font-weight: 600;">${leadsCaptured ?? 0}</td></tr>
                        ${satisfactionPercent != null ? `<tr><td style="padding: 8px 0;">Satisfaction</td><td style="text-align: right; font-weight: 600;">${satisfactionPercent}%</td></tr>` : ''}
                    </table>
                    <p><a href="${dashboardUrl()}/analytics" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View analytics</a></p>
                </div>
            `
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
