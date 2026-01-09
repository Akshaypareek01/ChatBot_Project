const { Cashfree } = require("cashfree-pg");

const initCashfree = () => {
    Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID || "TEST105251470bc8511b567e6c3fb7c174152501";
    Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET || "cfsk_ma_test_6b8005ab482ad695ebb7fb462f15f992_cc7f650f";
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
