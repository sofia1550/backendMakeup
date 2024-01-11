const express = require('express');
const router = express.Router();
const cursoModel = require('./courseModel');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/emailServices'); // Asegúrate de que la ruta sea correcta

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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
router.put('/cursos/:cursoId/disponibilidades/:disponibilidadId', async (req, res) => {
    const { cursoId, disponibilidadId } = req.params;
    const { nuevoEstado } = req.body; // Por ejemplo: "inactiva" o "finalizada"

    try {
        await cursoModel.actualizarEstadoDisponibilidad(cursoId, disponibilidadId, nuevoEstado);
        res.json({ message: 'Estado de la disponibilidad actualizado con éxito' });
    } catch (error) {
        console.error("Error al actualizar el estado de la disponibilidad:", error);
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
        console.error("Error al obtener disponibilidades:", error);
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
        console.error("Error al verificar las reservas:", error);
        res.status(500).send(error.message);
    }
});
router.get('/reservas/todas', async (req, res) => {
    try {
        const reservas = await cursoModel.obtenerTodasLasReservas();
        res.json(reservas);
    } catch (error) {
        console.error("Error al obtener todas las reservas:", error);
        res.status(500).send(error.message);
    }
});
router.delete('/reservas/cursos/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Intentando eliminar la reserva con ID: ${id}`); // Log para ver el ID de la reserva que se intenta eliminar

    try {
        console.log(`Ejecutando consulta para eliminar reserva...`);
        await cursoModel.eliminarReserva(id);
        console.log(`Reserva ${id} eliminada con éxito`);
        res.json({ message: "Reserva eliminada" });
    } catch (error) {
        console.error(`Error al eliminar la reserva: ${error.message}`);
        console.error(error); // Log completo del error
        res.status(500).send(`Error interno del servidor: ${error.message}`);
    }
});
router.put('/reservas/cursos/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await cursoModel.actualizarEstadoReserva(id, estado);
        res.json({ message: "Estado de reserva actualizado" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});
router.put('/cursos/:id/precio', async (req, res) => {
    try {
        const cursoId = req.params.id;
        const { precio } = req.body;

        if (!precio) {
            return res.status(400).send("Falta el nuevo precio del curso");
        }

        await cursoModel.actualizarPrecioCurso(cursoId, precio);
        res.json({ message: 'Precio del curso actualizado con éxito' });
    } catch (error) {
        console.error("Error al actualizar el precio del curso:", error);
        res.status(500).send(error.message);
    }
});
// Ruta para agregar una disponibilidad a un curso
// Ruta para agregar una disponibilidad a un curso
router.post('/cursos/:id/disponibilidades', async (req, res) => {
    console.log("Solicitud recibida para agregar disponibilidad. Curso ID:", req.params.id, "Cuerpo de la solicitud:", req.body);
    try {
        const { fecha_inicio, fecha_fin, max_reservas } = req.body;
        console.log("Intentando agregar disponibilidad:", { fecha_inicio, fecha_fin, max_reservas });

        const nuevaDisponibilidad = await cursoModel.agregarDisponibilidad(req.params.id, fecha_inicio, fecha_fin, max_reservas);
        console.log("Disponibilidad agregada con éxito. Detalles:", nuevaDisponibilidad);

        const io = req.app.get('io');
        io.emit('disponibilidadAgregada', { cursoId: req.params.id, ...nuevaDisponibilidad });
        console.log("Disponibilidad agregada con éxito:", nuevaDisponibilidad);

        res.json(nuevaDisponibilidad); // Devuelve el objeto de la nueva disponibilidad incluyendo el ID
    } catch (error) {
        console.error("Error al agregar disponibilidad:", error);
        res.status(500).send(error.message);
    }
});

// Ruta para obtener las disponibilidades de un curso
// Ruta para obtener las disponibilidades de un curso
router.get('/cursos/:id/disponibilidades', async (req, res) => {
    const cursoId = req.params.id;
    console.log("Solicitud para obtener disponibilidades del curso ID:", cursoId);
    try {
        const disponibilidades = await cursoModel.getDisponibilidadesByCursoId(cursoId);
        console.log("Disponibilidades recuperadas para curso ID", cursoId, ":", disponibilidades);
        res.json(disponibilidades);
    } catch (error) {
        console.error("Error al obtener disponibilidades para curso ID", cursoId, ":", error);
        res.status(500).send(error.message);
    }
});


// Ruta para agregar una reserva a una disponibilidad
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
        console.error("Error al agregar reserva:", error);
        res.status(500).send(error.message);
    }
});
router.get('/cursos/:cursoId/reservas/admin', async (req, res) => {
    try {
        const { cursoId } = req.params;

        const reservas = await cursoModel.obtenerReservasAdminPorCurso(cursoId);
        res.json(reservas);
    } catch (error) {
        console.error("Error al obtener reservas para admin:", error);
        res.status(500).send(error.message);
    }
});
router.get('/cursos/usuarios/:usuarioId/reservas', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const reservas = await cursoModel.obtenerReservasPorUsuario(usuarioId);
        res.json(reservas);
    } catch (error) {
        console.error("Error al obtener reservas para el usuario:", error);
        res.status(500).send(error.message);
    }
});

// Ruta para agregar horarios a una disponibilidad específica
router.post('/disponibilidades/:id/horarios', async (req, res) => {
    try {
        const disponibilidadId = req.params.id;
        const horarios = req.body.horarios;
        console.log("Recibido para agregar horarios:", horarios, "a disponibilidad ID:", disponibilidadId);

        // Log antes de insertar
        console.log("Preparando para agregar horarios:", horarios);

        await cursoModel.agregarHorarioDisponibilidad(disponibilidadId, horarios);

        // Log después de insertar
        console.log("Horarios agregados:", horarios);

        res.json({ message: 'Horarios agregados con éxito' });
    } catch (error) {
        console.error("Error en la ruta al agregar horarios:", error);
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
