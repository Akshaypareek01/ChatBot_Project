const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    website: {
        type: String,
        trim: true
    },
    brandName: {
        type: String,
        trim: true,
        default: "ChatBot"
    },
    websiteData: { type: String, default: "" },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    totalChats: {
        type: Number,
        default: 0
    },
    tokenBalance: {
        type: Number,
        default: 25000 // Strategic Trial: 25k tokens (~15 chats)
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    verificationOTP: String,
    verificationOTPExpires: Date,
    resetOTP: String,
    resetOTPExpires: Date,
    lastAlertThreshold: {
        type: Number,
        default: 100
    },
    autoRecharge: {
        type: Boolean,
        default: false
    },
    autoRechargeAmount: {
        type: Number,
        default: 199
    },
    allowedDomains: {
        type: [String],
        default: []
    },
    knowledgeVersion: {
        type: Number,
        default: 1
    }
});

module.exports = mongoose.model('User', userSchema);
