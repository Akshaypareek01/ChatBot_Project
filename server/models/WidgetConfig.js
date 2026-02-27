const mongoose = require('mongoose');

const preChatFieldSchema = new mongoose.Schema({
    key: { type: String, enum: ['name', 'email', 'phone'], required: true },
    label: { type: String, default: '' },
    required: { type: Boolean, default: false }
}, { _id: false });

const widgetConfigSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', default: null },
    primaryColor: { type: String, default: '#2563EB' },
    accentColor: { type: String, default: '#22D3EE' },
    botAvatarUrl: { type: String, default: '' },
    position: { type: String, enum: ['bottom-left', 'bottom-right'], default: 'bottom-right' },
    welcomeMessage: { type: String, default: '' },
    botName: { type: String, default: '' },
    size: { type: String, enum: ['compact', 'standard', 'large'], default: 'standard' },
    autoOpenDelay: { type: Number, default: 0 },
    customCss: { type: String, default: '' },
    showPoweredBy: { type: Boolean, default: true },
    preChatForm: {
        enabled: { type: Boolean, default: false },
        welcomeMessage: { type: String, default: '' },
        fields: [preChatFieldSchema]
    },
    suggestedQuestions: { type: [String], default: [] },
    leadCaptureWebhookUrl: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

widgetConfigSchema.index({ userId: 1, botId: 1 }, { unique: true });

module.exports = mongoose.model('WidgetConfig', widgetConfigSchema);
