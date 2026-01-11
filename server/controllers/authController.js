const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const emailService = require('../services/email.service');

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || user.role !== 'admin') {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { name, email, password, website, brandName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            website,
            brandName: brandName || "ChatBot",
            isActive: true,
            isVerified: false,
            verificationOTP: otp,
            verificationOTPExpires: otpExpires
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

        const user = await User.findOne({
            email,
            verificationOTP: otp,
            verificationOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
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
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(401).json({
                message: 'Please verify your email address before logging in.',
                requiresVerification: true,
                email: email
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }

        // Update last active timestamp
        user.lastActive = Date.now();
        await user.save();

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                website: user.website,
                isActive: user.isActive,
                isVerified: user.isVerified
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
        user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
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

        const user = await User.findOne({
            email,
            resetOTP: otp,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        // Automatically verify if they reset password
        user.isVerified = true;

        await user.save();

        return res.status(200).json({ message: 'Password updated successfully! You can now login.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    adminLogin,
    register,
    login,
    verifyOTP,
    resendVerificationOTP,
    forgotPassword,
    resetPassword
};
