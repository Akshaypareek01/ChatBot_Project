const User = require('../models/User');
const QA = require('../models/QA');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const users = await User.find().select('-password');

        // Get Q&As for each user
        const enhancedUsers = await Promise.all(users.map(async (user) => {
            const qas = await QA.find({ userId: user._id });
            return {
                ...user.toObject(),
                qaCount: qas.length
                // tokenBalance is part of user object now
            };
        }));

        return res.status(200).json(enhancedUsers);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { name, email, password, website, tokenBalance } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            website,
            isActive: true,
            tokenBalance: tokenBalance || 50000 // Default or Admin Provided
        });

        await newUser.save();

        return res.status(201).json({
            user: {
                id: newUser._id,
                name,
                email,
                website,
                isActive: true,
                tokenBalance: newUser.tokenBalance
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { name, email, website, isActive, tokenBalance } = req.body;

        const updateData = { name, email, website, isActive };
        if (tokenBalance !== undefined) {
            updateData.tokenBalance = tokenBalance;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await QA.deleteMany({ userId: req.params.id });

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const Transaction = require('../models/Transaction');

const getAnalytics = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const stats = await Promise.all([
            User.countDocuments({ role: 'user' }), // Total Users (exclude admins)
            User.aggregate([
                { $group: { _id: null, totalTokens: { $sum: "$tokenBalance" } } }
            ]),
            Transaction.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
            ])
        ]);

        const totalUsers = stats[0];
        const totalTokens = stats[1].length > 0 ? stats[1][0].totalTokens : 0;
        const totalRevenue = stats[2].length > 0 ? stats[2][0].totalRevenue : 0;

        return res.status(200).json({
            totalUsers,
            totalTokens,
            totalRevenue
        });

    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAnalytics
};
