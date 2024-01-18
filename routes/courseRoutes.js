const express = require('express');
const router = express.Router();
const cursoModel = require('../models/courseModel');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/emailServices');
const jwt = require('jsonwebtoken');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const usuarioModel = require('../models/useModel');
const verifyAdminRole = async (req, res, next) => {
    const token = req.headers['x-auth-token']; // Cambiado para usar 'x-auth-token'
    if (!token) {
        console.log('verifyAdminRole: No token provided');
        return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        console.log('verifyAdminRole: Token decoded', decodedToken);

        const adminStatus = await usuarioModel.checkIfUserIsAdmin(decodedToken.userId);
        console.log('verifyAdminRole: Admin status', adminStatus);

        const isReadOperation = req.method === 'GET';
        console.log('verifyAdminRole: Is read operation', isReadOperation);

        if (adminStatus.isAdmin) {
            if (adminStatus.isTemporary && isReadOperation && adminStatus.isWithinGracePeriod) {
                console.log('verifyAdminRole: Temporary admin, read operation allowed');
                next();
            } else if (!adminStatus.isTemporary) {
                console.log('verifyAdminRole: Permanent admin, all operations allowed');
                next();
            } else {
                console.log('verifyAdminRole: Temporary admin, write operation denied');
                return res.status(403).json({ error: 'Acceso denegado para operaciones de escritura' });
            }
        } else {
            console.log('verifyAdminRole: Not an admin');
            return res.status(403).json({ error: 'Acceso denegado' });
        }
    } catch (error) {
        console.error("Error en verifyAdminRole:", error);
        return res.status(403).json({ error: 'Acceso denegado' });
    }
};


// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storagee = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'comprobantes',
        format: async (req, file) => {
            switch (file.mimetype) {
                case 'image/jpeg':
                    return 'jpg';
                case 'image/png':
                    return 'png';
                case 'application/pdf':
                    return 'pdf';
                default:
                    return 'jpg';
            }
        },
        public_id: (req, file) => Date.now() + '-' + file.originalname.replace(/\.[^/.]+$/, "")
    },
});

const uploadd = multer({ storage: storagee });
// Ruta para eliminar una disponibilidad de un curso
router.put('/cursos/:cursoId/disponibilidades/:disponibilidadId', verifyAdminRole, async (req, res) => {
    const { cursoId, disponibilidadId } = req.params;
    const { nuevoEstado } = req.body; // Por ejemplo: "inactiva" o "finalizada"

    try {
        await cursoModel.actualizarEstadoDisponibilidad(cursoId, disponibilidadId, nuevoEstado);
        res.json({ message: 'Estado de la disponibilidad actualizado con éxito' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/cursos/:cursoId/disponibilidades', async (req, res) => {
    const { cursoId } = req.params;
    const { estado, limite } = req.query; // Parámetros opcionales para filtrar por estado y limitar el número de resultados

    try {
        const disponibilidades = await cursoModel.obtenerDisponibilidades(cursoId, estado, limite);
        res.json(disponibilidades);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/reservas/:id/comprobante', uploadd.single('comprobante'), async (req, res) => {
    const reservaId = req.params.id;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se pudo subir el comprobante' });
    }

    const comprobanteURL = req.file.path;

    try {
        await cursoModel.actualizarRutaComprobante(reservaId, comprobanteURL);
        res.json({
            success: true,
            message: 'Comprobante subido con éxito',
            comprobanteURL
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/reservas/verificar/:disponibilidadId', async (req, res) => {
    try {
        const disponibilidadId = req.params.disponibilidadId;
        const reservasActuales = await cursoModel.getReservasActuales(disponibilidadId);
        res.json({ reservasActuales });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
router.get('/reservas/todas', async (req, res) => {
    try {
        const reservas = await cursoModel.obtenerTodasLasReservas();
        res.json(reservas);
    } catch (error) {
        res.status(500).send(error.message);
    }
});
router.delete('/reservas/cursos/:id', verifyAdminRole, async (req, res) => {
    const { id } = req.params;

    try {
        await cursoModel.eliminarReserva(id);
        res.json({ message: "Reserva eliminada" });
    } catch (error) {
        res.status(500).send(`Error interno del servidor: ${error.message}`);
    }
});
router.put('/reservas/cursos/:id/estado', verifyAdminRole, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await cursoModel.actualizarEstadoReserva(id, estado);
        res.json({ message: "Estado de reserva actualizado" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
router.put('/cursos/:id/precio', verifyAdminRole, async (req, res) => {
    try {
        const cursoId = req.params.id;
        const { precio } = req.body;

        if (!precio) {
            return res.status(400).send("Falta el nuevo precio del curso");
        }

        await cursoModel.actualizarPrecioCurso(cursoId, precio);
        res.json({ message: 'Precio del curso actualizado con éxito' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
// Ruta para agregar una disponibilidad a un curso
router.post('/cursos/:id/disponibilidades', verifyAdminRole, async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, max_reservas } = req.body;

        const nuevaDisponibilidad = await cursoModel.agregarDisponibilidad(req.params.id, fecha_inicio, fecha_fin, max_reservas);

        const io = req.app.get('io');
        io.emit('disponibilidadAgregada', { cursoId: req.params.id, ...nuevaDisponibilidad });

        res.json(nuevaDisponibilidad); // Devuelve el objeto de la nueva disponibilidad incluyendo el ID
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Ruta para obtener las disponibilidades de un curso
router.get('/cursos/:id/disponibilidades', async (req, res) => {
    const cursoId = req.params.id;
    try {
        const disponibilidades = await cursoModel.getDisponibilidadesByCursoId(cursoId);
        res.json(disponibilidades);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


// Ruta para agregar una reserva a una disponibilidad
const formatearHorarios = (horarios) => {
    return horarios.map(horario =>
        `Día: ${horario.dia_semana}, de ${horario.hora_inicio}hs a ${horario.hora_fin}hs`
    ).join('<br>');
};
router.post('/reservas', async (req, res) => {
    const { disponibilidad_id, usuario_id, estado, nombre_usuario, correo_usuario, telefono_usuario, horarios } = req.body;

    if (!disponibilidad_id || !usuario_id || !estado || !horarios || !nombre_usuario || !correo_usuario || !telefono_usuario) {
        return res.status(400).send("Faltan datos necesarios para la reserva");
    }

    try {
        const resultado = await cursoModel.agregarReservaConDatos(disponibilidad_id, usuario_id, estado, nombre_usuario, correo_usuario, telefono_usuario, horarios);

        // Envío de correo al usuario
        const emailUsuario = {
            to: correo_usuario,
            subject: 'Confirmación de Reserva de Curso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #d783a6; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Confirmación de Reserva</h2>
                    <h3 style="color: #555;">¡Hola, ${nombre_usuario}!</h3>
                    <p>Tu reserva para el curso ha sido confirmada. Aquí están los detalles:</p>
                    <p><strong>Horarios y dia/s de la semana:</strong><br>${formatearHorarios(horarios)}</p>
                </div>
            `
        };
        await sendEmail(emailUsuario);

        // Envío de correo al administrador o SEO
        const emailAdmin = {
            to: 'luciuknicolas15@gmail.com',
            subject: 'Nueva Reserva de Curso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #d783a6; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Nueva Reserva Realizada</h2>
                    <p>El usuario ${nombre_usuario} ha realizado una reserva. Aquí están los detalles:</p>
                    <ul>
                        <li>Usuario: ${nombre_usuario}</li>
                        <li>Correo: ${correo_usuario}</li>
                        <li>Teléfono: ${telefono_usuario}</li>
                        <li>Horarios:<br>${formatearHorarios(horarios)}</li>
                    </ul>
                </div>
            `
        };
        await sendEmail(emailAdmin);

        res.json(resultado);
    } catch (error) {
        if (error.message === "Límite de reservas alcanzado para esta disponibilidad.") {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).send(error.message);
    }
});
router.get('/cursos/:cursoId/reservas/admin', async (req, res) => {
    try {
        const { cursoId } = req.params;

        const reservas = await cursoModel.obtenerReservasAdminPorCurso(cursoId);
        res.json(reservas);
    } catch (error) {
        res.status(500).send(error.message);
    }
});
router.get('/cursos/usuarios/:usuarioId/reservas', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const reservas = await cursoModel.obtenerReservasPorUsuario(usuarioId);
        res.json(reservas);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Ruta para agregar horarios a una disponibilidad específica
router.post('/disponibilidades/:id/horarios', verifyAdminRole, async (req, res) => {
    try {
        const disponibilidadId = req.params.id;
        const horarios = req.body.horarios;



        await cursoModel.agregarHorarioDisponibilidad(disponibilidadId, horarios);



        res.json({ message: 'Horarios agregados con éxito' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});




// Ruta para obtener los horarios de una disponibilidad específica
router.get('/disponibilidades/:id/horarios', async (req, res) => {
    try {
        const disponibilidadId = req.params.id;
        const horarios = await cursoModel.obtenerHorariosPorDisponibilidad(disponibilidadId);
        res.json(horarios);
    } catch (error) {
        res.status(500).send(error.message);
    }
});







// Configuración de Multer para almacenar archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const courseId = req.params.id;
        const dest = path.join(__dirname, '../db/image/cursos/curso_' + courseId);
        fs.mkdirSync(dest, { recursive: true }); // Crea la carpeta si no existe
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Mantiene el nombre original del archivo
    }
});

const upload = multer({ storage: storage });
// Ruta para obtener todos los cursos
router.get('/cursos', async (req, res) => {
    try {
        const cursos = await cursoModel.getAllCursos();
        res.json(cursos);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Ruta para obtener un curso por ID
router.get('/cursos/:id/completo', async (req, res) => {
    try {
        const courseId = req.params.id;
        const cursoCompleto = await cursoModel.getCursoCompletoById(courseId);
        res.json(cursoCompleto);
    } catch (error) {
        console.error("Error al obtener datos del curso", error);
        res.status(500).send(error.message);
    }
});


// Ruta para obtener las clases de un curso específico
router.get('/cursos/:id/clases', async (req, res) => {
    try {
        const courseId = req.params.id;
        const clases = await cursoModel.getClasesByCursoId(courseId);
        res.json(clases);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// En tu archivo de rutas (ejemplo: courseRoutes.js)

router.delete('/cursos/:cursoId/imagenes/:imagenId', async (req, res) => {
    try {
        const { imagenId } = req.params;
        await cursoModel.eliminarImagenCurso(imagenId);
        res.json({ message: 'Imagen eliminada con éxito' });
    } catch (error) {
        console.error("Error al eliminar imagen", error);
        res.status(500).send(error.message);
    }
});


router.post('/cursos/:id/imagenes', upload.single('imagen'), async (req, res) => {
    try {
        console.log("Solicitud de subida de imagen recibida", req.params, req.file); // Log de la solicitud

        const courseId = req.params.id;
        const uploadPath = req.file.path;
        const relativeImagePath = path.relative(path.join(__dirname, '../db/image/cursos'), uploadPath).replace(/\\/g, "/");

        if (!relativeImagePath) {
            throw new Error('No se pudo obtener la ruta relativa de la imagen.');
        }

        await cursoModel.agregarImagenCurso(courseId, relativeImagePath);

        res.json({ message: 'Imagen subida con éxito', path: relativeImagePath });
        console.log("Respuesta de subida de imagen enviada", { path: relativeImagePath }); // Log de la respuesta

    } catch (error) {
        console.error("Error al subir imagen", error);

        res.status(500).send(error.message);
    }
});


module.exports = router;
