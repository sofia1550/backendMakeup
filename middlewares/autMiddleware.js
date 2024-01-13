const jwt = require('jsonwebtoken');
require('dotenv').config();
const { getUserRoles } = require('../models/useModel');

const protectRoute = (allowedRoles = []) => {
    return async (req, res, next) => {
        const token = req.header('x-auth-token');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            req.user = decoded;

            if (!decoded.usuario_id) {
                return res.status(400).json({ message: 'Token inválido: falta usuario_id' });
            }

            const userRoles = await getUserRoles(decoded.usuario_id);


            if (allowedRoles.length && !userRoles.some(role => allowedRoles.includes(role))) {
                return res.status(403).json({ message: 'Forbidden: Access is denied' });
            }

            next();
        } catch (err) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

module.exports = protectRoute;
