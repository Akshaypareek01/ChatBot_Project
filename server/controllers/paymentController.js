const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createOrder: createCashfreeOrder, fetchPayments } = require('../services/cashfreeService');
const usageTracker = require('../services/usageTracker.service');
const emailService = require('../services/email.service');

const createOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ message: 'Minimum recharge amount is ₹100' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);

        const tokens = amount * usageTracker.TOKENS_PER_INR;
        const transaction = new Transaction({
            userId: user._id,
            orderId,
            amount,
            tokens,
            status: 'initiated'
        });

        await transaction.save();

        const baseUrl = process.env.BASE_URL.endsWith('/')
            ? process.env.BASE_URL.slice(0, -1)
            : process.env.BASE_URL;
        const returnUrl = `${baseUrl}/api/payments/callback?orderId=${orderId}`;

        // Cashfree Production requires HTTPS return_url
        if (process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' && !returnUrl.startsWith('https://')) {
            console.warn('CRITICAL: CASHFREE_ENVIRONMENT is PRODUCTION but return_url is NOT HTTPS. This WILL result in a 400 Bad Request error.');
        }

        const request = {
            "order_amount": amount,
            "order_currency": "INR",
            "order_id": orderId,
            "customer_details": {
                "customer_name": user.name,
                "customer_id": user._id.toString(),
                "customer_email": user.email,
                "customer_phone": user.phone || "9999999999" // Fallback number for Cashfree requirement
            },
            "order_meta": {
                "return_url": returnUrl
            }
        };

        const cashfreeResponse = await createCashfreeOrder(request);

        return res.status(200).json({
            success: true,
            order: cashfreeResponse.data,
            transaction: {
                id: transaction._id,
                orderId: transaction.orderId,
                amount: transaction.amount
            }
        });
    } catch (error) {
        console.error('Payment order creation error:', error);

        // Enhanced error reporting for Cashfree specific errors
        const errorMessage = error.response?.data?.message || error.message;
        const errorCode = error.response?.data?.code || 'internal_error';

        return res.status(error.response?.status || 500).json({
            message: 'Error creating payment order',
            error: errorMessage,
            code: errorCode
        });
    }
};

const saveTransaction = async (paymentData) => {
    try {
        if (!paymentData || paymentData.length === 0) return null;

        // Try to find a SUCCESS payment first
        let payment = paymentData.find(p => p.payment_status === "SUCCESS") || paymentData[0];

        const {
            order_id,
            cf_payment_id,
            payment_time,
            payment_completion_time,
            is_captured,
            payment_method,
            payment_status
        } = payment;

        let transaction = await Transaction.findOne({ orderId: order_id });

        if (transaction) {
            transaction.status = payment_status.toLowerCase();
            transaction.isCaptured = is_captured || transaction.isCaptured;
            transaction.paymentTime = payment_time ? new Date(payment_time) : transaction.paymentTime;
            transaction.paymentCompletionTime = payment_completion_time ? new Date(payment_completion_time) : transaction.paymentCompletionTime;
            transaction.updatedAt = Date.now();
            transaction.cfPaymentId = cf_payment_id;
            transaction.paymentMethod = payment_method;

            await transaction.save();
            return payment_status; // Return the status string
        }
        return null;
    } catch (error) {
        console.error('Error saving transaction:', error);
        return null;
    }
};

const callback = async (req, res) => {
    try {
        const { orderId } = req.query;
        let WEB_URL = process.env.Web_url || process.env.WEB_URL || 'http://localhost:8080';
        if (WEB_URL.endsWith('/')) {
            WEB_URL = WEB_URL.slice(0, -1);
        }

        console.log(`Processing callback for Order ID: ${orderId}`);

        const txData = await fetchPayments(orderId);

        if (!txData || !txData.data) {
            console.error(`No transaction data found for Order ID: ${orderId}`);
            return res.redirect(`${WEB_URL}/payment/failed?orderId=${orderId}&error=no_data`);
        }

        const transaction = await Transaction.findOne({ orderId }).populate('userId');

        if (!transaction) {
            console.error(`Transaction record not found in DB for Order ID: ${orderId}`);
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const paymentStatus = await saveTransaction(txData.data);

        if (paymentStatus) {
            console.log(`Final Payment Status for ${orderId}: ${paymentStatus}`);

            if (paymentStatus.toUpperCase() === "SUCCESS") {
                // **TOKEN RECHARGE LOGIC**
                await usageTracker.rechargeTokens(transaction.userId, transaction.amount);

                transaction.tokens = transaction.amount * usageTracker.TOKENS_PER_INR;
                transaction.status = 'success';
                await transaction.save();

                // **SEND EMAIL NOTIFICATION**
                if (transaction.userId && transaction.userId.email) {
                    await emailService.sendPaymentSuccessEmail(
                        transaction.userId.email,
                        transaction.userId.name,
                        transaction.amount,
                        transaction.tokens,
                        orderId
                    );
                }

                console.log(`✅ Success: Recharged tokens and sent email for user ${transaction.userId?._id}`);
                return res.redirect(`${WEB_URL}/payment/success?orderId=${orderId}`);
            }

            if (paymentStatus.toUpperCase() === "FAILED" || paymentStatus.toUpperCase() === "CANCELLED") {
                console.log(`❌ Payment ${paymentStatus} for ${orderId}`);
                transaction.status = paymentStatus.toLowerCase();
                await transaction.save();

                // **SEND FAILURE EMAIL**
                if (transaction.userId && transaction.userId.email) {
                    await emailService.sendPaymentFailureEmail(
                        transaction.userId.email,
                        transaction.userId.name,
                        transaction.amount,
                        orderId
                    );
                }

                return res.redirect(`${WEB_URL}/payment/failed?orderId=${orderId}&status=${paymentStatus}`);
            }

            return res.redirect(`${WEB_URL}/payment/failed?orderId=${orderId}&status=${paymentStatus}`);
        } else {
            return res.redirect(`${WEB_URL}/payment/failed?orderId=${orderId}&error=save_failed`);
        }
    } catch (error) {
        console.error('Payment callback error:', error);
        return res.status(500).json({ message: 'Error processing payment callback', error: error.message });
    }
};

const simulatePayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.query;

        const transaction = await Transaction.findOne({ orderId });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        transaction.transactionId = 'sim_tx_' + Date.now();
        transaction.status = status === 'failed' ? 'failed' : 'success';
        transaction.paymentMethod = 'SIMULATION';
        transaction.paymentDetails = { orderId, simulatedStatus: status };
        transaction.updatedAt = Date.now();

        await transaction.save();

        if (transaction.status === 'success') {
            // **TOKEN RECHARGE LOGIC**
            await usageTracker.rechargeTokens(transaction.userId, transaction.amount);
            transaction.tokens = transaction.amount * usageTracker.TOKENS_PER_INR;
            await transaction.save();
            return res.json({ success: true, message: 'Payment simulation successful', transaction });
        } else {
            return res.json({ success: false, message: 'Payment simulation failed', transaction });
        }
    } catch (error) {
        console.error('Payment simulation error:', error);
        return res.status(500).json({ message: 'Error simulating payment', error: error.message });
    }
};

const getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId })
            .sort({ createdAt: -1 });

        return res.status(200).json(transactions);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

const getTransactionByOrderId = async (req, res) => {
    const transaction = await Transaction.findOne({ orderId: req.params.orderId });
    res.json(transaction);
};

// Admin Routes (Simplified for now)
const adminGetTransactions = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const transactions = await Transaction.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        return res.status(200).json(transactions);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

module.exports = {
    createOrder,
    callback,
    simulatePayment,
    getUserTransactions,
    getTransactionByOrderId,
    adminGetTransactions
};
