const bcrypt = require('bcrypt');
const User = require('../models/User');
const emailService = require('../services/email.service');
const jwt = require('jsonwebtoken');
const tokenService = require('../services/token.service');
const totpService = require('../services/totp.service');
const audit = require('../services/audit.service');
const { validatePassword } = require('../utils/passwordPolicy');
const googleAuth = require('../services/googleAuth.service');
const crypto = require('crypto');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min
const MAX_OTP_ATTEMPTS = 3;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/** Check if account is locked; clear lock if expired. Returns true if still locked. */
async function checkLock(user) {
    if (!user.lockUntil || user.lockUntil < new Date()) {
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }
        return false;
    }
    return true;
}

/** Record failed login; lock if exceeds max. */
async function recordFailedLogin(user) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
}

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.role !== 'admin') {
            audit.log('admin_login_failed', { actorEmail: email, ...audit.getReqMeta(req) });
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        if (await checkLock(user)) {
            return res.status(423).json({
                message: 'Account locked due to too many failed attempts. Try again in 15 minutes.'
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await recordFailedLogin(user);
            audit.log('admin_login_failed', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        if (user.totpEnabled && user.totpSecret) {
            const challengeToken = jwt.sign(
                { userId: user._id, purpose: 'totp_challenge' },
                process.env.JWT_SECRET,
                { expiresIn: '2m' }
            );
            return res.status(200).json({
                requiresTotp: true,
                challengeToken,
                message: 'Enter your 2FA code from your authenticator app.'
            });
        }

        audit.log('admin_login', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
        const { accessToken, refreshToken, expiresIn } = await tokenService.issueTokenPair(user._id, true);
        return res.status(200).json({
            token: accessToken,
            refreshToken,
            expiresIn,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** 2FA setup: generate secret and return QR. Admin only. */
const get2FASetup = async (req, res) => {
    try {
        if (!req.isAdmin) return res.status(403).json({ message: 'Admin only.' });
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        const secret = totpService.generateSecret(user.email);
        user.totpSecret = secret.base32;
        user.totpEnabled = false;
        await user.save();
        const qrDataUrl = await totpService.getQRDataURL(secret);
        return res.status(200).json({ secret: secret.base32, qrDataUrl });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** 2FA verify: confirm TOTP and enable. Body: { token }. */
const verify2FA = async (req, res) => {
    try {
        if (!req.isAdmin) return res.status(403).json({ message: 'Admin only.' });
        const user = await User.findById(req.userId);
        if (!user || !user.totpSecret) return res.status(400).json({ message: 'Setup 2FA first.' });
        const valid = totpService.verifyToken(user.totpSecret, req.body.token);
        if (!valid) return res.status(400).json({ message: 'Invalid code. Try again.' });
        user.totpEnabled = true;
        await user.save();
        return res.status(200).json({ message: '2FA enabled successfully.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** 2FA disable. Body: { token }. */
const disable2FA = async (req, res) => {
    try {
        if (!req.isAdmin) return res.status(403).json({ message: 'Admin only.' });
        const user = await User.findById(req.userId);
        if (!user || !user.totpEnabled) return res.status(400).json({ message: '2FA is not enabled.' });
        const valid = totpService.verifyToken(user.totpSecret, req.body.token);
        if (!valid) return res.status(400).json({ message: 'Invalid code.' });
        user.totpEnabled = false;
        user.totpSecret = undefined;
        await user.save();
        return res.status(200).json({ message: '2FA disabled.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Complete admin login after 2FA. Body: { challengeToken, totp }. */
const adminLoginTotp = async (req, res) => {
    try {
        const { challengeToken, totp } = req.body;
        if (!challengeToken || !totp) {
            return res.status(400).json({ message: 'Challenge token and TOTP code are required.' });
        }
        let decoded;
        try {
            decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
            if (decoded.purpose !== 'totp_challenge') throw new Error('Invalid purpose');
        } catch {
            return res.status(401).json({ message: 'Invalid or expired challenge. Please log in again.' });
        }
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin' || !user.totpEnabled || !user.totpSecret) {
            return res.status(401).json({ message: 'Invalid session.' });
        }
        if (!totpService.verifyToken(user.totpSecret, totp)) {
            return res.status(401).json({ message: 'Invalid 2FA code.' });
        }
        audit.log('admin_login', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
        const { accessToken, refreshToken, expiresIn } = await tokenService.issueTokenPair(user._id, true);
        return res.status(200).json({
            token: accessToken,
            refreshToken,
            expiresIn,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

function generateReferralCode() {
    return 'REF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

const register = async (req, res) => {
    try {
        const { name, email, password, website, brandName, referralCode: refCode } = req.body;
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.status(400).json({ message: pwdCheck.message });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const now = new Date();
        let referredBy = null;
        if (refCode && typeof refCode === 'string') {
            const referrer = await User.findOne({ referralCode: refCode.trim().toUpperCase() }).select('_id').lean();
            if (referrer) referredBy = referrer._id;
        }
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            website,
            brandName: brandName || "ChatBot",
            isActive: true,
            isVerified: false,
            verificationOTP: otp,
            verificationOTPExpires: otpExpires,
            tosAcceptedAt: req.body.acceptTos ? now : undefined,
            privacyAcceptedAt: req.body.acceptPrivacy ? now : undefined,
            referredBy,
            referralCode: generateReferralCode()
        });

        await newUser.save();

        // Send Verification Email
        await emailService.sendVerificationEmail(email, name, otp);

        return res.status(201).json({
            message: 'Registration successful! Please check your email for the verification code.',
            requiresVerification: true,
            email: email
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, isVerified: false });
        if (!user) {
            return res.status(400).json({ message: 'User not found or already verified.' });
        }
        if (!user.verificationOTPExpires || user.verificationOTPExpires < new Date()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }
        const attempts = (user.verificationOTPAttempts || 0) + 1;
        if (user.verificationOTP !== otp) {
            user.verificationOTPAttempts = attempts;
            if (attempts >= MAX_OTP_ATTEMPTS) {
                const newOtp = generateOTP();
                user.verificationOTP = newOtp;
                user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
                user.verificationOTPAttempts = 0;
                await user.save();
                await emailService.sendVerificationEmail(user.email, user.name, newOtp);
                return res.status(400).json({ message: 'Too many wrong attempts. A new OTP has been sent to your email.' });
            }
            await user.save();
            return res.status(400).json({ message: 'Invalid OTP. ' + (MAX_OTP_ATTEMPTS - attempts) + ' attempts left.' });
        }
        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
        user.verificationOTPAttempts = 0;
        await user.save();
        return res.status(200).json({ message: 'Email verified successfully! You can now login.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const resendVerificationOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email, isVerified: false });
        if (!user) {
            return res.status(400).json({ message: 'User not found or already verified' });
        }
        const otp = generateOTP();
        user.verificationOTP = otp;
        user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.verificationOTPAttempts = 0;
        await user.save();
        await emailService.sendVerificationEmail(user.email, user.name, otp);
        return res.status(200).json({ message: 'New verification OTP sent to your email.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            audit.log('login_failed', { actorEmail: email, meta: { reason: 'user_not_found' }, ...audit.getReqMeta(req) });
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (await checkLock(user)) {
            return res.status(423).json({
                message: 'Account locked due to too many failed attempts. Try again in 15 minutes.'
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await recordFailedLogin(user);
            audit.log('login_failed', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (!user.isVerified) {
            return res.status(401).json({
                message: 'Please verify your email address before logging in.',
                requiresVerification: true,
                email: email
            });
        }
        if (!user.isApproved) {
            return res.status(403).json({ message: 'Your account is pending admin approval. Please wait for the administrator to approve your account.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lastActive = Date.now();
        await user.save();
        audit.log('login', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });

        const { accessToken, refreshToken, expiresIn } = await tokenService.issueTokenPair(user._id, false);
        return res.status(200).json({
            token: accessToken,
            refreshToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                website: user.website,
                isActive: user.isActive,
                isVerified: user.isVerified,
                isApproved: user.isApproved
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Account does not exist. You can create a new account with this email.' });
        }
        const otp = generateOTP();
        user.resetOTP = otp;
        user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.resetOTPAttempts = 0;
        await user.save();
        await emailService.sendPasswordResetEmail(email, user.name, otp);
        return res.status(200).json({ message: 'Password reset OTP sent to your email.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) {
            return res.status(400).json({ message: pwdCheck.message });
        }
        const user = await User.findOne({ email });
        if (!user || !user.resetOTPExpires || user.resetOTPExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset OTP. Request a new one.' });
        }
        const attempts = (user.resetOTPAttempts || 0) + 1;
        if (user.resetOTP !== otp) {
            user.resetOTPAttempts = attempts;
            if (attempts >= MAX_OTP_ATTEMPTS) {
                const newOtp = generateOTP();
                user.resetOTP = newOtp;
                user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
                user.resetOTPAttempts = 0;
                await user.save();
                await emailService.sendPasswordResetEmail(user.email, user.name, newOtp);
                return res.status(400).json({ message: 'Too many wrong attempts. A new reset OTP has been sent to your email.' });
            }
            await user.save();
            return res.status(400).json({ message: 'Invalid OTP. ' + (MAX_OTP_ATTEMPTS - attempts) + ' attempts left.' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        user.resetOTPAttempts = 0;
        user.isVerified = true;
        await user.save();
        return res.status(200).json({ message: 'Password updated successfully! You can now login.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** List active sessions (refresh tokens) for the current user. */
const listSessions = async (req, res) => {
    try {
        const sessions = await tokenService.listSessions(req.userId);
        return res.status(200).json({ sessions });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Revoke one session by id. */
const revokeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const revoked = await tokenService.revokeSessionById(req.userId, id);
        if (!revoked) return res.status(404).json({ message: 'Session not found.' });
        return res.status(200).json({ message: 'Session revoked.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Revoke all sessions (logout everywhere). */
const revokeAllSessions = async (req, res) => {
    try {
        await tokenService.revokeAllSessions(req.userId);
        return res.status(200).json({ message: 'All sessions revoked. Please log in again.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Refresh access token using refresh token (rotation: old one is invalidated). */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: rt } = req.body;
        if (!rt) {
            return res.status(400).json({ message: 'Refresh token is required.' });
        }
        const pair = await tokenService.rotateRefreshToken(rt);
        if (!pair) {
            return res.status(401).json({ message: 'Invalid or expired refresh token.' });
        }
        return res.status(200).json({
            token: pair.accessToken,
            refreshToken: pair.refreshToken,
            expiresIn: pair.expiresIn
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 5.8: Redirect to Google OAuth consent. */
const googleRedirect = async (req, res) => {
    try {
        const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/users/auth/google/callback`;
        const state = crypto.randomBytes(16).toString('hex');
        const url = googleAuth.getAuthUrl(callbackUrl, state);
        res.redirect(url);
    } catch (e) {
        console.error('Google auth URL error:', e.message);
        res.redirect(process.env.Web_url || '/');
    }
};

/** Phase 5.8: Google OAuth callback — exchange code, find or create user, issue tokens, redirect to frontend. */
const googleCallback = async (req, res) => {
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/users/auth/google/callback`;
    const frontendBase = (process.env.Web_url || '').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;

    try {
        const { code, error } = req.query;
        if (error) {
            return res.redirect(`${frontendBase}/login?error=access_denied`);
        }
        if (!code) {
            return res.redirect(`${frontendBase}/login?error=no_code`);
        }

        const profile = await googleAuth.getProfileFromCode(code, callbackUrl);
        if (!profile.email) {
            return res.redirect(`${frontendBase}/login?error=no_email`);
        }

        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.email });
            if (user) {
                user.googleId = profile.id;
                await user.save();
                audit.log('google_account_linked', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
            } else {
                const randomPassword = crypto.randomBytes(32).toString('hex');
                const salt = await bcrypt.genSalt(10);
                user = await User.create({
                    name: profile.name,
                    email: profile.email,
                    password: await bcrypt.hash(randomPassword, salt),
                    googleId: profile.id,
                    isVerified: true,
                    isActive: true,
                    isApproved: true,
                    referralCode: 'REF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()
                });
                audit.log('register_google', { actorId: user._id, actorEmail: user.email, ...audit.getReqMeta(req) });
            }
        }

        if (!user.isActive) {
            return res.redirect(`${frontendBase}/login?error=account_deactivated`);
        }
        if (!user.isApproved) {
            return res.redirect(`${frontendBase}/login?error=account_pending`);
        }

        user.lastActive = new Date();
        await user.save();
        audit.log('login', { actorId: user._id, actorEmail: user.email, meta: { provider: 'google' }, ...audit.getReqMeta(req) });

        const { accessToken, refreshToken } = await tokenService.issueTokenPair(user._id, user.role === 'admin');
        const redirectTo = user.role === 'admin' ? '/admin' : '/user';
        const isAdmin = user.role === 'admin' ? 'true' : 'false';
        const tokenUrl = `${frontendBase}/auth/callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&redirect=${encodeURIComponent(redirectTo)}&isAdmin=${isAdmin}`;
        res.redirect(tokenUrl);
    } catch (e) {
        console.error('Google callback error:', e.message);
        res.redirect(`${frontendBase}/login?error=server_error`);
    }
};

module.exports = {
    adminLogin,
    adminLoginTotp,
    get2FASetup,
    verify2FA,
    disable2FA,
    register,
    login,
    refreshToken,
    listSessions,
    revokeSession,
    revokeAllSessions,
    verifyOTP,
    resendVerificationOTP,
    forgotPassword,
    resetPassword,
    googleRedirect,
    googleCallback
};
