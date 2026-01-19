const Ticket = require('../models/Ticket');
const User = require('../models/User');

const createTicket = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        const ticketId = 'TKT-' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();

        const ticket = new Ticket({
            userId: req.userId,
            ticketId,
            title,
            description,
            messages: [{
                sender: 'user',
                message: description,
                timestamp: new Date()
            }]
        });

        await ticket.save();
        res.status(201).json({ success: true, ticket });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ message: 'Error creating ticket', error: error.message });
    }
};

const getUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.userId }).sort({ updatedAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

const getAdminTickets = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const tickets = await Ticket.find().populate('userId', 'name email').sort({ updatedAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

const addMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;
        const sender = req.isAdmin ? 'admin' : 'user';

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Safety check: User can only message their own tickets unless admin
        if (!req.isAdmin && ticket.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (ticket.status === 'closed' || ticket.status === 'resolved') {
            return res.status(400).json({ message: `Cannot add message to ${ticket.status} ticket` });
        }

        ticket.messages.push({
            sender,
            message,
            timestamp: new Date()
        });

        // Automatically set to in-progress if admin replies
        if (sender === 'admin' && ticket.status === 'open') {
            ticket.status = 'in-progress';
        }

        await ticket.save();
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ message: 'Error adding message', error: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { ticketId } = req.params;
        const { status } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        ticket.status = status;
        await ticket.save();
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

const getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('userId', 'name email');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Safety check: User can only access their own tickets unless admin
        if (!req.isAdmin && ticket.userId._id.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ticket', error: error.message });
    }
};

module.exports = {
    createTicket,
    getUserTickets,
    getAdminTickets,
    getTicketById,
    addMessage,
    updateStatus
};
