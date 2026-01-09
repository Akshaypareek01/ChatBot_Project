const axios = require('axios');
const User = require('../models/User');

const SERVICE_ID = process.env.SERVICE_ID || 'service_u63q2vx';
const TEMPLATE_ID_ADMIN = process.env.TEMPLATE_ID_ADMIN || 'template_6w9fe0a';
const TEMPLATE_ID_USER = process.env.TEMPLATE_ID_USER || 'template_vbsiohq';
const PUBLIC_KEY = process.env.PUBLIC_KEY || '7Pf4DRId8nn1ZpzaW';
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY; // Optional if you use private key signing, but public key + REST often works for simple cases

/**
 * Send Low Balance Email via EmailJS
 * @param {string} userEmail 
 * @param {string} userName 
 * @param {number} currentBalance 
 */
const sendLowBalanceEmail = async (userEmail, userName, currentBalance) => {
    try {
        const data = {
            service_id: SERVICE_ID,
            template_id: TEMPLATE_ID_USER, // User template
            user_id: PUBLIC_KEY,
            template_params: {
                to_email: userEmail,
                to_name: userName,
                message: `Your chatbot token balance is low (${currentBalance} tokens). Please recharge soon to keep your bot active.`,
                action_url: "https://your-dashboard-url.com/recharge" // Update with real URL
            }
        };

        await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
        console.log(`Low balance email sent to ${userEmail}`);
    } catch (error) {
        console.error("EmailJS Error:", error.response?.data || error.message);
        // Don't throw, just log. Email failure shouldn't stop the bot.
    }
};

/**
 * Send Token Empty Alert (Bot Stopped)
 * @param {string} userEmail 
 * @param {string} userName 
 */
const sendEmptyBalanceEmail = async (userEmail, userName) => {
    try {
        const data = {
            service_id: SERVICE_ID,
            template_id: TEMPLATE_ID_ADMIN, // Using admin template or same user template with urgent msg
            user_id: PUBLIC_KEY,
            template_params: {
                to_email: userEmail,
                to_name: userName,
                message: "URGENT: Your chatbot tokens have EXPIRED. Your bot has stopped answering. Recharge immediately to reactivate.",
                status: "EXPIRED"
            }
        };

        await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
        console.log(`Empty balance email sent to ${userEmail}`);
    } catch (error) {
        console.error("EmailJS Error:", error.message);
    }
};

module.exports = {
    sendLowBalanceEmail,
    sendEmptyBalanceEmail
};
