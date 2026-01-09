const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createOrder: createCashfreeOrder, fetchPayments } = require('../services/cashfreeService');
const usageTracker = require('../services/usageTracker.service');

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

        const transaction = new Transaction({
            userId: user._id,
            orderId,
            amount,
            status: 'initiated'
        });

        await transaction.save();

        const request = {
            "order_amount": amount,
            "order_currency": "INR",
            "order_id": orderId,
            "customer_details": {
                "customer_name": user.name,
                "customer_id": user._id.toString(),
                "customer_email": user.email,
                "customer_phone": "8290918154" // Should ideally be user.phone if available
            },
            "order_meta": {
                "return_url": `${process.env.BASE_URL}/api/payments/callback?orderId=${orderId}`
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
        return res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

const saveTransaction = async (paymentData) => {
    try {
        for (const payment of paymentData) {
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
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error saving transaction:', error);
        return false;
    }
};

const callback = async (req, res) => {
    try {
        const { orderId } = req.query;

        const txData = await fetchPayments(orderId);

        if (orderId && txData && txData.data) {
            const transaction = await Transaction.findOne({ orderId });

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found' });
            }

            const resData = await saveTransaction(txData.data);

            if (resData === true) {
                if (txData.data[0].payment_status === "SUCCESS") {
                    // **TOKEN RECHARGE LOGIC**
                    await usageTracker.rechargeTokens(transaction.userId, transaction.amount);
                    console.log(`Recharged tokens for user ${transaction.userId} Amount: ${transaction.amount}`);
                }

                if (txData.data[0].payment_status === "FAILED") {
                    return res.redirect(`${process.env.Web_url}/payment/failed?orderId=${orderId}`);
                }
                return res.redirect(`${process.env.Web_url}/payment/success?orderId=${orderId}`);
            }
        } else {
            return res.redirect(`${process.env.Web_url}/payment/failed?orderId=${orderId}`);
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
