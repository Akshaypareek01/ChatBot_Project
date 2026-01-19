const { Cashfree } = require("cashfree-pg");

const initCashfree = () => {
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
        throw new Error('CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET must be set in .env file');
    }

    Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
    Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
    Cashfree.XEnvironment = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
        ? Cashfree.Environment.PRODUCTION
        : Cashfree.Environment.SANDBOX;
};

const createOrder = async (request) => {
    initCashfree();
    return await Cashfree.PGCreateOrder("2025-01-01", request);
};

const fetchPayments = async (orderId) => {
    initCashfree();
    return await Cashfree.PGOrderFetchPayments("2025-01-01", orderId);
};

module.exports = { createOrder, fetchPayments };
