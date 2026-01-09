const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    cfPaymentId: { // Cashfree Payment ID
        type: String,
        unique: true,
        sparse: true
    },
    transactionId: { // Gateway Transaction ID
        type: String,
        unique: true,
        sparse: true
    },
    bankReference: { // Bank Reference ID
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: { // Updated status values
        type: String,
        enum: ['initiated', 'processing', 'success', 'failed', 'pending', 'refunded'],
        default: 'initiated'
    },
    isCaptured: { // Whether payment was captured
        type: Boolean,
        default: false
    },
    paymentMethod: { type: Object },
    paymentDetails: {
        type: Object
    },
    paymentSignature: {
        type: String
    },
    paymentGateway: {
        type: String,
        default: 'cashfree'
    },
    gatewayOrderId: { // Gateway's Order ID
        type: String,
        default: null
    },
    paymentTime: { // Payment initiated time
        type: Date
    },
    paymentCompletionTime: { // Payment completion timestamp
        type: Date
    },
    invoiceNumber: {
        type: String
    },
    invoiceGenerated: {
        type: Boolean,
        default: false
    },
    cfToken: { // Cashfree Session Token
        type: String
    },
    paymentSession: {
        type: Object
    },
    customerDetails: {
        name: String,
        email: String,
        phone: String
    },
    receiptUrl: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
