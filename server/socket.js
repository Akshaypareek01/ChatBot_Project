/**
 * Phase 5.1: Socket.io for live chat handoff — dashboard (agent) and widget (visitor).
 */

const jwt = require('jsonwebtoken');
const widgetTokenService = require('./services/widgetToken.service');
const Conversation = require('./models/Conversation');

function attachSocket(io) {
    io.use(async (socket, next) => {
        const auth = socket.handshake.auth;
        const token = auth?.token || auth?.widgetToken;
        if (!token) return next(new Error('auth required'));

        if (auth.widgetToken) {
            const userId = widgetTokenService.verifyWidgetToken(auth.widgetToken);
            if (!userId) return next(new Error('Invalid widget token'));
            const conversationId = auth.conversationId;
            if (!conversationId) return next(new Error('conversationId required for visitor'));
            const conv = await Conversation.findOne({ _id: conversationId, userId }).lean();
            if (!conv || conv.status !== 'escalated') return next(new Error('Conversation not found or not escalated'));
            socket.userId = userId;
            socket.conversationId = conversationId;
            socket.role = 'visitor';
        } else {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (!decoded.userId) return next(new Error('Invalid token'));
                socket.userId = decoded.userId;
                socket.role = 'agent';
            } catch {
                return next(new Error('Invalid token'));
            }
        }
        next();
    });

    io.on('connection', (socket) => {
        if (socket.role === 'agent') {
            socket.join(`user:${socket.userId}`);
        } else {
            socket.join(`conv:${socket.conversationId}`);
        }

        socket.on('agent_join', async (conversationId, cb) => {
            if (socket.role !== 'agent') return;
            const conv = await Conversation.findOne({ _id: conversationId, userId: socket.userId });
            if (!conv) return cb && cb({ error: 'Not found' });
            socket.join(`conv:${conversationId}`);
            conv.agentOnline = true;
            await conv.save();
            io.to(`conv:${conversationId}`).emit('agent_joined', { conversationId });
            cb && cb({ ok: true });
        });

        socket.on('agent_leave', async (conversationId, cb) => {
            if (socket.role !== 'agent') return;
            socket.leave(`conv:${conversationId}`);
            await Conversation.updateOne(
                { _id: conversationId, userId: socket.userId },
                { $set: { agentOnline: false } }
            );
            io.to(`conv:${conversationId}`).emit('agent_left', { conversationId });
            cb && cb({ ok: true });
        });

        socket.on('handoff_message', async (payload, cb) => {
            const { conversationId, content, role } = payload || {};
            if (!conversationId || !content || typeof content !== 'string') return cb && cb({ error: 'Invalid payload' });
            const isAgent = socket.role === 'agent';
            const roleVal = isAgent ? 'agent' : 'visitor';
            const conv = await Conversation.findOne({
                _id: conversationId,
                userId: socket.userId
            });
            if (!conv) return cb && cb({ error: 'Not found' });
            if (!conv.handoffMessages) conv.handoffMessages = [];
            conv.handoffMessages.push({
                role: roleVal,
                content: content.trim().slice(0, 4000),
                timestamp: new Date()
            });
            await conv.save();
            const msg = {
                conversationId,
                role: roleVal,
                content: content.trim(),
                timestamp: new Date()
            };
            io.to(`conv:${conversationId}`).emit('handoff_message', msg);
            cb && cb({ ok: true });
        });

        socket.on('disconnect', async () => {
            if (socket.role === 'agent') {
                const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('conv:'));
                for (const room of rooms) {
                    const cid = room.replace('conv:', '');
                    await Conversation.updateOne(
                        { _id: cid, userId: socket.userId },
                        { $set: { agentOnline: false } }
                    );
                    io.to(room).emit('agent_left', { conversationId: cid });
                }
            }
        });
    });
}

module.exports = { attachSocket };
