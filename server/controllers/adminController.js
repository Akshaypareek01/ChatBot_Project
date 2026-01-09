const User = require('../models/User');
const QA = require('../models/QA');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filter parameters
        const search = req.query.search || '';
        const isActive = req.query.isActive;
        const lowTokens = req.query.lowTokens === 'true';

        // Build query
        const query = { role: 'user' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (lowTokens) {
            query.tokenBalance = { $lt: 10000 };
        }

        // Get total count for pagination
        const total = await User.countDocuments(query);

        // Get paginated users
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get Q&As for each user
        const enhancedUsers = await Promise.all(users.map(async (user) => {
            const qaCount = await QA.countDocuments({ userId: user._id });
            const sourceCount = await require('../models/Source').countDocuments({ userId: user._id });

            return {
                ...user.toObject(),
                qaCount,
                sourceCount
            };
        }));

        return res.status(200).json({
            users: enhancedUsers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
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
const Source = require('../models/Source');
const Vector = require('../models/Vector');

const getAnalytics = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Parallel queries for performance
        const [
            totalUsers,
            activeUsers,
            totalTokensData,
            totalRevenueData,
            lowTokenUsers,
            recentTransactions,
            totalSources,
            totalVectors,
            usageByType
        ] = await Promise.all([
            // Total users (exclude admins)
            User.countDocuments({ role: 'user' }),

            // Active users (logged in last 30 days)
            User.countDocuments({
                role: 'user',
                lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }),

            // Total tokens across all users
            User.aggregate([
                { $match: { role: 'user' } },
                { $group: { _id: null, totalTokens: { $sum: "$tokenBalance" } } }
            ]),

            // Total revenue from successful transactions
            Transaction.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
            ]),

            // Users with low token balance (< 10,000)
            User.find({
                role: 'user',
                tokenBalance: { $lt: 10000 }
            })
                .select('name email tokenBalance lastActive')
                .sort({ tokenBalance: 1 })
                .limit(10),

            // Recent transactions (last 7 days)
            Transaction.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),

            // Total data sources
            Source.countDocuments(),

            // Total vectors (knowledge base size)
            Vector.countDocuments(),

            // Usage by source type
            Source.aggregate([
                {
                    $group: {
                        _id: "$type",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const totalTokens = totalTokensData.length > 0 ? totalTokensData[0].totalTokens : 0;
        const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].totalRevenue : 0;

        // Format usage by type
        const usageStats = {
            files: usageByType.find(u => u._id === 'file')?.count || 0,
            websites: usageByType.find(u => u._id === 'website')?.count || 0
        };

        return res.status(200).json({
            overview: {
                totalUsers,
                activeUsers,
                totalTokens,
                totalRevenue,
                recentTransactions,
                totalSources,
                totalVectors
            },
            alerts: {
                lowTokenUsers: lowTokenUsers.map(user => ({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    tokenBalance: user.tokenBalance,
                    lastActive: user.lastActive
                }))
            },
            usage: usageStats
        });

    } catch (error) {
        console.error('Analytics error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getTransactions = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filter parameters
        const status = req.query.status;
        const search = req.query.search || '';

        // Build query
        const query = {};

        if (status) {
            query.status = status;
        }

        // Get total count
        const total = await Transaction.countDocuments(query);

        // Get paginated transactions with user details
        const transactions = await Transaction.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // If search is provided, filter by user name/email
        let filteredTransactions = transactions;
        if (search) {
            filteredTransactions = transactions.filter(t =>
                t.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
                t.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
                t.orderId?.toLowerCase().includes(search.toLowerCase())
            );
        }

        return res.status(200).json({
            transactions: filteredTransactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAnalytics,
    getTransactions
};
