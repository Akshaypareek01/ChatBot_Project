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
        default: 50000 // Free trial: 50k tokens (~10 chats)
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
    resetOTPExpires: Date
});

module.exports = mongoose.model('User', userSchema);
