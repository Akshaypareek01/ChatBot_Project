const User = require('../models/User');
const Usage = require('../models/Usage');
const bcrypt = require('bcrypt');

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, website, brandName } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name;
        user.website = website;
        user.brandName = brandName;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                website: user.website,
                brandName: user.brandName,
                allowedDomains: user.allowedDomains
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateAllowedDomains = async (req, res) => {
    try {
        const { allowedDomains } = req.body;
        if (!Array.isArray(allowedDomains)) {
            return res.status(400).json({ message: "Allowed domains must be an array" });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { allowedDomains },
            { new: true }
        ).select('allowedDomains');

        return res.json({ message: "Domains updated", allowedDomains: user.allowedDomains });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUsageHistory = async (req, res) => {
    try {
        const history = await Usage.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
        return res.json(history);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getProfile, updateProfile, updatePassword, updateAllowedDomains, getUsageHistory };
