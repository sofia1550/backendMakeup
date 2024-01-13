const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql');

const orderRoutes = require('../routes/orderRoutes');
const userModel = require('../models/useModel');
const userRoutes = require('../routes/userRoutes');
const productRoutes = require('../productRoutes/productRoutes');
const protectRoute = require('../middlewares/autMiddleware');
const fileUploadRoutes = require("../models/comprobantes/fileUpload");
const coursesRoutes = require("../routes/courseRoutes");
const { sendEmail } = require('../utils/emailServices'); 
const { body, validationResult } = require('express-validator');


const mercadoPagoRoutes = require('../routes/mercadoPagoRoutes');
const servicioRoutes = require('../models/serviceRoutes');
const path = require('path');

require('dotenv').config();

const app = express();
const port = 3002;
app.use(cors({
  origin: ['https://sofiaportafolio.online'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware de Express para parsear JSON
app.use(express.json());
app.post('/contact', async (req, res) => {
  const { email, name, message } = req.body;

  // Email para el SEO o destinatario
  const emailToSEO = {
    to: 'luciuknicolas15@gmail.com',
    subject: `Nuevo mensaje de contacto de ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center; color: #333;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #d783a6; margin-bottom: 20px;">Nuevo Contacto - Fabiana Gimenez</h2>
          <p style="color: #555; font-size: 16px;">Hola,</p>
          <p style="color: #555; font-size: 16px;">Has recibido un nuevo mensaje de contacto en la página web de Fabiana Gimenez.</p>
          <div style="text-align: left; background-color: #f9f9f9; padding: 15px; border-left: 5px solid #d783a6; margin: 20px 0;">
            <p><b>Nombre:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Mensaje:</b> ${message}</p>
          </div>
          <p style="color: #555; font-size: 16px;">Por favor, revisa este mensaje y responde a la brevedad posible.</p>
          <p style="margin-top: 30px; color: #555; font-size: 16px;">Saludos,</p>
          <p style="color: #d783a6; font-size: 16px;">Equipo de Fabiana Gimenez</p>
        </div>
      </div>
    `
  };

  // Email de agradecimiento al usuario
  const emailToUser = {
    to: email,
    subject: `Gracias por contactarnos, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center; color: #333;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #d783a6; margin-bottom: 20px;">Fabiana Gimenez</h2>
          <p style="color: #555; font-size: 16px;">¡Hola ${name}!</p>
          <p style="color: #555; font-size: 16px;">Queremos agradecerte por ponerte en contacto con nosotros. Tu mensaje es muy importante para nosotros y te responderemos a la brevedad.</p>
          <p style="color: #555; font-size: 16px;">Mientras tanto, te invitamos a seguir explorando nuestra página web y conocer más sobre lo que hacemos.</p>
          <a href="https://tu-sitio-web.com" style="display: inline-block; padding: 10px 20px; margin-top: 20px; border-radius: 5px; background-color: #d783a6; color: white; text-decoration: none; font-weight: bold;">Visita Nuestra Página</a>
          <p style="margin-top: 30px; color: #555; font-size: 16px;">Saludos cordiales,</p>
          <p style="color: #d783a6; font-size: 16px;">El equipo de Fabiana Gimenez</p>
        </div>
      </div>
    `
  };

  try {
    const responseSEO = await sendEmail(emailToSEO);
    if (!responseSEO.success) {
      throw new Error('Error al enviar correo al SEO');
    }

    const responseUser = await sendEmail(emailToUser);
    if (!responseUser.success) {
      throw new Error('Error al enviar correo al usuario');
    }

    res.json({ message: 'Mensaje enviado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
});


// Servir archivos estáticos de la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '../db/uploads')));
app.use('/image', express.static(path.join(__dirname, '../db/image')));

// Configuración adicional de Express (Helmet, etc.)
require('../config/configExpress')(app);

// Configuración de Socket.io
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: 'https://sofiaportafolio.online', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});
io.on('connection', (socket) => {
  socket.on('disconnect', () => { });
});
app.set('io', io); // Asignar io a la app para acceder desde otros lugares

// Rutas de API
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/mercadopago', mercadoPagoRoutes);
app.use('/api', fileUploadRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api', coursesRoutes);

setInterval(async () => {
  try {
      const revokedUserIds = await userModel.revokeExpiredAdminRoles();
      revokedUserIds.forEach(userId => {
          io.emit('roleRevoked', { userId: userId, roleName: 'admin' });
      });
  } catch (error) {
      console.error("Error al ejecutar la tarea de revocación de roles:", error);
  }
}, 60000); // Cada 60 segundos

app.get('/api/create-helper-user', async (req, res) => {
  const saltRounds = 10;
  const username = "SOFIAaa";
  const password = "123";
  const email = "nicolasluciuk@yahoo.com";

  try {
    // Verificar si el usuario ya existe
    const existingUser = await userModel.findUserByUsernameOrEmail(username);
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario "ayudante" ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await userModel.createUser(username, hashedPassword, email, "ayudante");
    res.json({ success: true, message: 'Usuario ayudante creado', userId: result });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el usuario ayudante' });
  }
});


require('dotenv').config();
const loginValidationRules = [
  body('usernameOrEmail').notEmpty().withMessage('El nombre de usuario o correo electrónico es obligatorio'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

app.post('/api/login', loginValidationRules, async (req, res) => {
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
    const userRoles = await userModel.getUserRoles(user.id);
    const payload = {
      usuario_id: user.id,
      username: user.username,
      roles: userRoles
    };

    const token = jwt.sign(payload, process.env.SECRET_KEY);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.use((err, req, res, next) => {
  res.status(500).send({ error: err.message });
});
app.post('/api/admin/products', protectRoute(['admin']), (req, res) => {
  res.json({ message: 'Producto creado', user: req.user });
});

app.get('/', (req, res) => {
  res.send('El servidor está funcionando');
});

app.use('/api/protected-route', protectRoute(), (req, res) => {
  res.send('Esta es una ruta protegida');
});

app.post('/api/validateToken', (req, res) => {

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    res.json({ isValid: true, userData: decodedToken });
  } catch (error) {
    res.json({ isValid: false });
  }
});
var connection;



app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Error interno del servidor' });
});

server.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});

module.exports.io = io;
