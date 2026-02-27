const Joi = require('joi');

module.exports = {
    chat: Joi.object({
        message: Joi.string().trim().min(1).max(1000).required(),
        visitorId: Joi.string().trim().max(256).optional(),
        conversationId: Joi.string().hex().length(24).optional(),
        botId: Joi.string().trim().max(64).optional()
    })
};
