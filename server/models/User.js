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
        default: 500 // Free trial: 500 credits = 5 chats (see usageTracker.FREE_TRIAL_CREDITS)
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'reseller'],
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
    verificationOTPAttempts: { type: Number, default: 0 },
    resetOTP: String,
    resetOTPExpires: Date,
    resetOTPAttempts: { type: Number, default: 0 },
    tosAcceptedAt: Date,
    privacyAcceptedAt: Date,
    totpSecret: String,
    totpEnabled: { type: Boolean, default: false },
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
    },
    // Brute force protection: lock after 5 failed attempts for 15 min
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    // Phase 3.2: onboarding wizard completed
    onboardingCompletedAt: { type: Date, default: null },
    // Phase 3.3: widget installation verification (last ping from widget)
    lastWidgetPingAt: { type: Date, default: null },
    lastWidgetPingOrigin: { type: String, default: null },
    // Phase 3.4: notification preferences
    emailOnNewLead: { type: Boolean, default: true },
    emailOnLowBalance: { type: Boolean, default: true },
    emailSummary: { type: String, enum: ['none', 'daily', 'weekly'], default: 'weekly' },
    // Phase 3.2: onboarding email sequence (Day 1, 3, 7)
    onboardingEmailSent: {
        day1: { type: Date, default: null },
        day3: { type: Date, default: null },
        day7: { type: Date, default: null }
    },
    // Phase 4: subscription plan (ref Plan; null = free tier)
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    // Phase 4.2: GST for Indian businesses (optional; shown on invoice)
    gstin: { type: String, trim: true, default: null },
    // Phase 4.2: Referral program
    referralCode: { type: String, trim: true, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralCreditedAt: { type: Date, default: null }, // when referrer was credited for this user
    // Phase 5.5: White-label
    customDashboardDomain: { type: String, trim: true, default: null },
    customEmailFromName: { type: String, trim: true, default: null },
    customEmailReplyTo: { type: String, trim: true, default: null },
    resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Phase 5.8: Google OAuth
    googleId: { type: String, trim: true, unique: true, sparse: true, default: null }
});

module.exports = mongoose.model('User', userSchema);
