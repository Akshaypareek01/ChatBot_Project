const mongoose = require('mongoose');

const widgetConfigSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
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
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

widgetConfigSchema.index({ userId: 1 });

module.exports = mongoose.model('WidgetConfig', widgetConfigSchema);
