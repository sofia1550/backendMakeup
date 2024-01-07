const Joi = require('@hapi/joi');

exports.validateUserData = (userData) => {
    const schema = Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(30)
            .required(),

        password: Joi.string()
            .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
            .required(),

        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org'] } })
            .required()
    });

    const { error } = schema.validate(userData);
    if (error) {
        return error.details[0].message;
    }

    return null; 
};
