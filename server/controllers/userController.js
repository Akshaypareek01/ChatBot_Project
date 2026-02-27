const User = require('../models/User');
const Usage = require('../models/Usage');
const AuditLog = require('../models/AuditLog');
const Source = require('../models/Source');
const WidgetConfig = require('../models/WidgetConfig');
const Conversation = require('../models/Conversation');
const bcrypt = require('bcrypt');
const audit = require('../services/audit.service');
const tokenService = require('../services/token.service');

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

/** GDPR: Export all data we hold for the current user. */
const exportMyData = async (req, res) => {
    try {
        const userId = req.userId;
        const [user, usage, sources, auditLogs] = await Promise.all([
            User.findById(userId).select('-password -totpSecret -verificationOTP -resetOTP').lean(),
            Usage.find({ userId }).sort({ createdAt: -1 }).lean(),
            Source.find({ userId }).select('type fileName url status createdAt').lean(),
            AuditLog.find({ $or: [{ actorId: userId }, { targetId: userId }] }).sort({ createdAt: -1 }).limit(500).lean()
        ]);
        if (!user) return res.status(404).json({ message: 'User not found' });
        audit.log('gdpr_export', { actorId: userId, ...audit.getReqMeta(req) });
        return res.status(200).json({
            exportedAt: new Date().toISOString(),
            user,
            usage,
            sources,
            auditLogs
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** GDPR: Delete account and related data (anonymize user, delete tokens, keep audit trail anonymized). */
const deleteMyData = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await tokenService.revokeAllSessions(userId);
        user.name = 'Deleted User';
        user.email = `deleted-${userId}@deleted.local`;
        user.password = await bcrypt.hash(require('crypto').randomBytes(16).toString('hex'), 10);
        user.website = '';
        user.brandName = '';
        user.isActive = false;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        user.totpSecret = undefined;
        user.totpEnabled = false;
        user.allowedDomains = [];
        await user.save();
        audit.log('gdpr_delete', { actorId: userId, targetId: userId, targetType: 'User', ...audit.getReqMeta(req) });
        return res.status(200).json({ message: 'Account and personal data have been deleted.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** List conversations for the current user (paginated). */
const getConversations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const q = { userId: req.userId };
        if (status) q.status = status;
        const [list, total] = await Promise.all([
            Conversation.find(q).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
            Conversation.countDocuments(q)
        ]);
        return res.json({ conversations: list, total, page, limit });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get a single conversation by id (must belong to user). */
const getConversationById = async (req, res) => {
    try {
        const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId }).lean();
        if (!conv) return res.status(404).json({ message: 'Conversation not found' });
        return res.json(conv);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Export conversations as CSV. */
const exportConversations = async (req, res) => {
    try {
        const convs = await Conversation.find({ userId: req.userId }).sort({ startedAt: -1 }).limit(1000).lean();
        const header = 'Conversation ID,Visitor ID,Started,Status,Messages\n';
        const rows = convs.map((c) => {
            const msgCount = (c.messages && c.messages.length) || 0;
            const started = c.startedAt ? new Date(c.startedAt).toISOString() : '';
            const id = String(c._id);
            const visitor = (c.visitorId || '').replace(/"/g, '""');
            return `"${id}","${visitor}","${started}","${c.status || ''}",${msgCount}`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');
        return res.send(header + rows.join('\n'));
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get widget customization config for the current user. */
const getWidgetConfig = async (req, res) => {
    try {
        let config = await WidgetConfig.findOne({ userId: req.userId }).lean();
        if (!config) {
            config = await WidgetConfig.create({
                userId: req.userId,
                primaryColor: '#2563EB',
                accentColor: '#22D3EE',
                position: 'bottom-right',
                size: 'standard',
                showPoweredBy: true
            });
            config = config.toObject();
        }
        const { userId, __v, ...rest } = config;
        return res.json(rest);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Update widget customization config. */
const updateWidgetConfig = async (req, res) => {
    try {
        const allowed = [
            'primaryColor', 'accentColor', 'botAvatarUrl', 'position', 'welcomeMessage',
            'botName', 'size', 'autoOpenDelay', 'customCss', 'showPoweredBy'
        ];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (updates.position && !['bottom-left', 'bottom-right'].includes(updates.position)) delete updates.position;
        if (updates.size && !['compact', 'standard', 'large'].includes(updates.size)) delete updates.size;
        updates.updatedAt = new Date();

        const config = await WidgetConfig.findOneAndUpdate(
            { userId: req.userId },
            { $set: updates },
            { new: true, upsert: true, runValidators: true }
        ).lean();
        const { userId, __v, ...rest } = config;
        return res.json(rest);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updatePassword,
    updateAllowedDomains,
    getUsageHistory,
    exportMyData,
    deleteMyData,
    getConversations,
    getConversationById,
    exportConversations,
    getWidgetConfig,
    updateWidgetConfig
};
