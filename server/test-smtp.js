require('dotenv').config();
const nodemailer = require('nodemailer');

const testSMTP = async () => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.zoho.in',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: (process.env.SMTP_PORT == 465),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const safeFrom = `"ChatBot Support" <${process.env.SMTP_USER}>`;

    const mailOptions = {
        from: safeFrom,
        to: 'akshay96102@gmail.com',
        subject: 'SMTP Test Mail',
        text: 'This is a test email to verify that your Zoho SMTP is working correctly.',
        html: '<b>Hello!</b><p>This is a test email to verify that your Zoho SMTP is working correctly.</p>'
    };

    try {
        console.log('Attempting to send test email...');
        console.log('Using SMTP User:', process.env.SMTP_USER);
        console.log('Using From Address:', safeFrom);

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Test failed!');
        console.error('Error Details:', error.message);
    }
};

testSMTP();
