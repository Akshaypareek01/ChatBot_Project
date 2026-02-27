/**
 * Validate req.body against a Joi schema. On error, respond with 400 and validation details.
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            const message = error.details.map((d) => d.message).join('; ');
            return res.status(400).json({ message });
        }
        req.body = value;
        next();
    };
}

module.exports = validateRequest;
