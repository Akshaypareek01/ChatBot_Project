const QA = require('../models/QA');

// User QA Operations
const getUserQAs = async (req, res) => {
    try {
        const qas = await QA.find({ userId: req.userId });
        return res.status(200).json(qas);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createUserQA = async (req, res) => {
    try {
        const { question, answer, category } = req.body;

        const newQA = new QA({
            userId: req.userId,
            question,
            answer,
            category: category || 'General',
            frequency: 0,
        });

        await newQA.save();
        return res.status(201).json(newQA);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateUserQA = async (req, res) => {
    try {
        const { question, answer, category } = req.body;

        const qa = await QA.findById(req.params.id);

        if (!qa) {
            return res.status(404).json({ message: 'QA not found' });
        }

        if (qa.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to update this QA' });
        }

        qa.question = question;
        qa.answer = answer;
        qa.category = category || 'General';
        qa.updatedAt = Date.now();

        await qa.save();
        return res.status(200).json(qa);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteUserQA = async (req, res) => {
    try {
        const qa = await QA.findById(req.params.id);
        if (!qa) {
            return res.status(404).json({ message: 'QA not found' });
        }
        if (qa.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this QA' });
        }
        await QA.deleteOne({ _id: req.params.id });
        return res.status(200).json({ message: 'QA deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin QA Operations
const getQAsByUserId = async (req, res) => {
    try {
        // Note: server.js had /api/qa/:userId without authMiddleware in one place?
        // But logically it should be protected or public. Assuming public or protected by wherever it's used.
        // server.js line 717: app.get('/api/qa/:userId', ...) NO middleware.
        // So it's public.
        const { userId } = req.params;
        const qas = await QA.find({ userId });
        return res.status(200).json(qas);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const adminCreateQA = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { userId, question, answer, category } = req.body;

        const newQA = new QA({
            userId,
            question,
            answer,
            category: category || 'General',
            frequency: 0
        });

        await newQA.save();
        return res.status(201).json(newQA);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const adminUpdateQA = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { question, answer, category } = req.body;

        const updatedQA = await QA.findByIdAndUpdate(
            req.params.id,
            {
                question,
                answer,
                category: category || 'General',
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!updatedQA) {
            return res.status(404).json({ message: 'QA not found' });
        }
        return res.status(200).json(updatedQA);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const adminDeleteQA = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const deletedQA = await QA.findByIdAndDelete(req.params.id);
        if (!deletedQA) {
            return res.status(404).json({ message: 'QA not found' });
        }
        return res.status(200).json({ message: 'QA deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getUserQAs,
    createUserQA,
    updateUserQA,
    deleteUserQA,
    getQAsByUserId,
    adminCreateQA,
    adminUpdateQA,
    adminDeleteQA
};
