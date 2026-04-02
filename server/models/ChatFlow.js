/**
 * Phase 5.6: Chat Flows / Decision Trees
 * A lightweight flow model: nodes + transitions, executed per Conversation.flowState.
 */

const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // stable id within node
    label: { type: String, required: true },
    nextNodeId: { type: String, default: null } // node.id in same flow
}, { _id: false });

const conditionSchema = new mongoose.Schema({
    match: { type: String, enum: ['contains', 'equals', 'regex', 'intent'], required: true },
    value: { type: String, required: true },
    nextNodeId: { type: String, required: true }
}, { _id: false });

const nodeSchema = new mongoose.Schema({
    id: { type: String, required: true }, // unique within flow
    type: { type: String, enum: ['message', 'question', 'ai', 'end'], required: true },
    title: { type: String, default: '' },
    text: { type: String, default: '' }, // for message/question
    aiInstructions: { type: String, default: '' }, // for ai
    options: { type: [optionSchema], default: [] }, // button-based transitions
    conditions: { type: [conditionSchema], default: [] }, // free-text routing (question)
    fallbackNextNodeId: { type: String, default: null }
}, { _id: false });

const chatFlowSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', default: null, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: false },
    startNodeId: { type: String, required: true },
    nodes: { type: [nodeSchema], default: [] },
    version: { type: Number, default: 1 }
}, { timestamps: true });

chatFlowSchema.index({ userId: 1, botId: 1, isActive: 1 });

module.exports = mongoose.model('ChatFlow', chatFlowSchema);

