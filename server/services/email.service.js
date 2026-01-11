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

module.exports = {
    sendLowBalanceEmail,
    sendEmptyBalanceEmail,
    sendPaymentSuccessEmail,
    sendPaymentFailureEmail
};
