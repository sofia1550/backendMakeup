const jwt = require('jsonwebtoken');
require('dotenv').config();
const { getUserRoles } = require('../models/useModel'); // Asegúrate de que esta ruta sea correcta

const protectRoute = (allowedRoles = []) => {
    return async (req, res, next) => {
        const token = req.header('x-auth-token');
        console.log("Token recibido:", token);

        if (!token) {
            console.log("Error: Token no proporcionado");
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            console.log("Token decodificado:", decoded);
            req.user = decoded;

            if (!decoded.usuario_id) {
                console.log("Error: El token decodificado no tiene un usuario_id");
                return res.status(400).json({ message: 'Token inválido: falta usuario_id' });
            }

            const userRoles = await getUserRoles(decoded.usuario_id); // Aquí cambiamos la línea
            console.log("Roles permitidos:", allowedRoles);
            console.log("Roles del usuario:", userRoles);

            if (allowedRoles.length && !userRoles.some(role => allowedRoles.includes(role))) {
                console.log("Error: El usuario no tiene los roles permitidos");
                return res.status(403).json({ message: 'Forbidden: Access is denied' });
            }

            next();
        } catch (err) {
            console.log("Error al verificar el token:", err.message);
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

module.exports = protectRoute;
