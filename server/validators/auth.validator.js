const Joi = require('joi');

const passwordSchema = Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).pattern(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/).required().messages({
    'string.pattern.base': 'Password must include uppercase, number, and special character.'
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {
    login: loginSchema,
    register: Joi.object({
        name: Joi.string().trim().min(1).max(200).required(),
        email: Joi.string().email().lowercase().required(),
        password: passwordSchema,
        website: Joi.string().trim().max(500).allow('').optional(),
        brandName: Joi.string().trim().max(100).optional(),
        acceptTos: Joi.boolean().valid(true).required().messages({ 'any.only': 'You must accept the Terms of Service.' }),
        acceptPrivacy: Joi.boolean().valid(true).required().messages({ 'any.only': 'You must accept the Privacy Policy.' })
    }),
    verifyOTP: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).pattern(/^\d+$/).required()
    }),
    resendOTP: Joi.object({
        email: Joi.string().email().required()
    }),
    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),
    resetPassword: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).pattern(/^\d+$/).required(),
        newPassword: passwordSchema
    }),
    refreshToken: Joi.object({
        refreshToken: Joi.string().required()
    }),
    adminLoginTotp: Joi.object({
        challengeToken: Joi.string().required(),
        totp: Joi.string().length(6).pattern(/^\d+$/).required()
    })
};
