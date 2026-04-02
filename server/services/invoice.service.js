/**
 * Phase 4.2: Generate invoice PDF for successful payments. GST support when user has gstin.
 */

const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const GST_RATE = 0.18; // 18% GST (CGST 9% + SGST 9% for intra-state)

/**
 * Get next invoice number for current year. Format: INV-YYYY-NNNN.
 */
async function getNextInvoiceNumber() {
    const y = new Date().getFullYear();
    const prefix = `INV-${y}-`;
    const last = await Transaction.findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
        .sort({ invoiceNumber: -1 })
        .select('invoiceNumber')
        .lean();
    let next = 1;
    if (last?.invoiceNumber) {
        const num = parseInt(last.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(num)) next = num + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Generate invoice PDF buffer for a successful transaction. Optionally include GST if user has gstin.
 * @param {Object} transaction - Transaction doc (with userId populated or id)
 * @param {Object} user - User doc (name, email, gstin)
 * @returns {Promise<{ buffer: Buffer, invoiceNumber: string }>}
 */
async function generateInvoiceBuffer(transaction, user) {
    const invoiceNumber = transaction.invoiceNumber || await getNextInvoiceNumber();
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const bufferPromise = new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const date = (transaction.paymentCompletionTime || transaction.updatedAt || new Date()).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    doc.fontSize(18).text('TAX INVOICE', { continued: false });
    doc.fontSize(10).fillColor('#666').text(`Invoice # ${invoiceNumber}`, { continued: false });
    doc.text(`Date: ${date}`, { continued: false });
    doc.moveDown();

    doc.fontSize(10).fillColor('#000');
    doc.text('Bill To:', { continued: false });
    doc.text(user?.name || 'Customer', { continued: false });
    doc.text(user?.email || '', { continued: false });
    if (user?.gstin) doc.text(`GSTIN: ${user.gstin}`, { continued: false });
    doc.moveDown();

    doc.fontSize(10);
    const amount = transaction.amount || 0;
    const hasGst = user?.gstin && amount > 0;
    const taxableAmount = hasGst ? (amount / (1 + GST_RATE)) : amount;
    const gstAmount = hasGst ? (amount - taxableAmount) : 0;
    const cgst = hasGst ? gstAmount / 2 : 0;
    const sgst = hasGst ? gstAmount / 2 : 0;

    doc.text('Description', 50, doc.y, { continued: false });
    doc.text('Amount (₹)', 400, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    doc.text('AI Token Recharge', 50, doc.y, { continued: false });
    doc.text(taxableAmount.toFixed(2), 400, doc.y, { align: 'right' });
    if (hasGst) {
        doc.moveDown(0.5);
        doc.text('CGST 9%', 50, doc.y, { continued: false });
        doc.text(cgst.toFixed(2), 400, doc.y, { align: 'right' });
        doc.moveDown(0.5);
        doc.text('SGST 9%', 50, doc.y, { continued: false });
        doc.text(sgst.toFixed(2), 400, doc.y, { align: 'right' });
    }
    doc.moveDown(0.5);
    doc.fontSize(11).text('Total (₹)', 50, doc.y, { continued: false });
    doc.text(amount.toFixed(2), 400, doc.y, { align: 'right' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text(`Order ID: ${transaction.orderId}`, { continued: false });
    doc.text('Thank you for your payment.', { continued: false });

    doc.end();
    const buffer = await bufferPromise;
    return { buffer, invoiceNumber };
}

/**
 * Assign invoice number to transaction and mark as generated (call after payment success).
 */
async function assignInvoiceNumber(transactionId) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.invoiceGenerated) return transaction?.invoiceNumber;
    const invoiceNumber = await getNextInvoiceNumber();
    await Transaction.findByIdAndUpdate(transactionId, {
        $set: { invoiceNumber, invoiceGenerated: true }
    });
    return invoiceNumber;
}

module.exports = {
    getNextInvoiceNumber,
    generateInvoiceBuffer,
    assignInvoiceNumber
};
