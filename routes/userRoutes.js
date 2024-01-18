const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const userModel = require('../models/useModel');
require('dotenv').config();
const { sendEmail } = require('../utils/emailServices');

const verifyAdminRole = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const isAdmin = await userModel.checkIfUserIsAdmin(decodedToken.userId);
        const isReadOperation = req.method === 'GET';

        if (isAdmin && isReadOperation) {
            // Permitir operaciones de lectura si es administrador
            next();
        } else {
            // Denegar todas las operaciones de escritura, independientemente del estado del minuto de gracia
            return res.status(403).json({ error: 'Acceso denegado para operaciones de escritura' });
        }
    } catch (error) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
};
const loginValidationRules = [
    body('usernameOrEmail').notEmpty().withMessage('El nombre de usuario o correo electrónico es obligatorio'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria')
];
const userValidationRules = [
    body('username').isLength({ min: 5 }).withMessage('El nombre de usuario debe tener al menos 5 caracteres'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('email').isEmail().withMessage('Debe ser un correo electrónico válido')
];
router.put('/assignRole/:userId', verifyAdminRole, async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    try {
        await userModel.assignRole(userId, role);
        res.json({ message: 'Rol asignado exitosamente' });
    } catch (error) {

        // Aquí verificamos el mensaje del error y respondemos adecuadamente
        if (error.message === "El usuario ya tiene este rol asignado") {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al asignar rol' });
        }
    }
});


// Asignar un servicio a un usuario (ayudante)
router.put('/assignService/:userId', verifyAdminRole, async (req, res) => {
    const { userId } = req.params;
    const { serviceId } = req.body;

    try {
        // Verificar si el usuario existe
        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(400).json({ error: 'El usuario no existe' });
        }

        // Asignar el servicio al usuario
        await userModel.assignService(userId, serviceId);
        res.json({ message: 'Servicio asignado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar servicio' });
    }
});
router.put('/revokeRole/:userId', verifyAdminRole, async (req, res) => {

    const { userId } = req.params;
    const { role } = req.body;
    try {
        await userModel.revokeRole(userId, role);
        res.json({ message: 'Rol revocado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al revocar el rol', details: error.message });
    }
});


router.get('/',  async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los usuarios" });
    }
});

router.post('/register', userValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    if (await userModel.doesEmailExist(email)) {
        return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
    }

    if (await userModel.doesUsernameExist(username)) {
        return res.status(400).json({ error: 'Este nombre de usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const userId = await userModel.createUser(username, hashedPassword, email);
        await userModel.assignUserRole(userId, "user");
        await userModel.assignTempAdminRole(userId, "admin", new Date());
        await userModel.assignTempHelperRole(userId, "ayudante", new Date());

        // Asignar el usuario a los servicios del 1 al 6
        await userModel.assignUserToServices(userId, [1, 2, 3, 4, 5, 6]);

        res.status(201).json({ userId });
    } catch (error) {
        console.error("Error al registrar al usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

/* backupFunction sin minuto de gracia otorgando admin */
/* router.post('/register', userValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    if (await userModel.doesEmailExist(email)) {
        return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
    }

    if (await userModel.doesUsernameExist(username)) {
        return res.status(400).json({ error: 'Este nombre de usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const userId = await userModel.createUser(username, hashedPassword, email);
        await userModel.assignUserRole(userId, "user");  // Asignamos el rol "user" al usuario recién creado.
        res.status(201).json({ userId });
    } catch (error) {
        console.error("Error al registrar al usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}); */
router.post('/login', loginValidationRules, async (req, res) => {
    // Comprobar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { usernameOrEmail, password } = req.body;

    try {
        // Buscar usuario por nombre de usuario o correo electrónico
        const user = await userModel.findUserByUsernameOrEmail(usernameOrEmail);
        if (!user) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Verificar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Crear el token JWT
        const payload = {
            usuario_id: user.id,
            username: user.username,
            roles: await userModel.getUserRoles(user.id)
        };

        const token = jwt.sign(payload, process.env.SECRET_KEY);

        // Enviar el token como respuesta
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.get('/role/ayudante', async (req, res) => {
    try {
        const helpers = await userModel.getAllHelpers();
        res.json(helpers);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los ayudantes" });
    }
});
router.get('/current', async (req, res) => {
    // Obtener el token del header
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ error: 'No estás autenticado. Por favor, inicia sesión.' });
    }

    try {
        // Decodificar el token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.usuario_id;

        // Obtener información del usuario
        const user = await userModel.getById(userId);

        // Obtener roles del usuario
        const roles = await userModel.getUserRoles(userId);

        // Agregar roles al objeto de usuario
        user.roles = roles;

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await userModel.findUserByEmail(email); 

    if (!user) {
        return res.status(404).send('Usuario no encontrado');
    }

    const token = jwt.sign({ id: user.id }, process.env.RESET_PASSWORD_KEY, { expiresIn: '20m' });

    const resetLink = `https://sofiaportafolio.online/reset-password/${token}`;
    const htmlContent = `<p>Por favor, haz clic en este <a href="${resetLink}">enlace</a> para restablecer tu contraseña.</p>`;

    sendEmail({
        to: email,
        subject: 'Restablecimiento de contraseña',
        html: htmlContent
    }).then(() => {
        res.send('Correo de restablecimiento enviado');
    }).catch(error => {
        res.status(500).send('Error al enviar el correo');
    });
});
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.RESET_PASSWORD_KEY);
        const user = await userModel.findUserById(decoded.id);

        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }

        await userModel.updateUserPassword(user.id, newPassword); // Actualiza la contraseña

        res.send('Contraseña actualizada con éxito');
    } catch (error) {
        res.status(400).send('Token inválido o expirado');
    }
});


module.exports = router;
