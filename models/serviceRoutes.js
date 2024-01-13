const express = require('express');
const router = express.Router();
const servicioModel = require('./serviceModel');
const protectRoute = require('../middlewares/autMiddleware');
const usuarioModel = require('./useModel');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/emailServices');
const jwt = require('jsonwebtoken');

/* const verifyAdminRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const isAdmin = await usuarioModel.checkIfUserIsAdmin(decodedToken.userId);
    const isReadOperation = req.method === 'GET';

    if (isAdmin && isReadOperation) {
      // Permitir operaciones de lectura si es administrador
      next();
    } else {
      // Denegar todas las operaciones de escritura, independientemente del estado del minuto de gracia
      return res.status(403).json({ error: 'Acceso denegado para operaciones de escritura' });
    }
  } catch (error) {
    console.error("Error en verifyAdminRole:", error);
    return res.status(403).json({ error: 'Acceso denegado' });
  } 
}; */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../db/uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
router.get('/:serviceId/images', async (req, res) => {
  try {

    const serviceId = req.params.serviceId;
    const images = await servicioModel.getServiceImages(serviceId);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las imágenes' });
  }
});
router.post('/', upload.single('serviceImage'),  (req, res) => {
  const { icon_name, title, description, facebook_url, whatsapp_url, instagram_url } = req.body;
  const imagePath = req.file.path;
  servicioModel.create({
    icon_name,
    title,
    description,
    image_path: imagePath,
    facebook_url,
    whatsapp_url,
    instagram_url
  }, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: results.insertId, icon_name, title, description });
  });
});
// Obtener todas las opciones de un servicio
router.get('/:serviceId/options', async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const options = await servicioModel.getOpcionesServicio(serviceId);
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las opciones del servicio' });
  }
});

// Agregar una nueva opción a un servicio
router.post('/:serviceId/options', protectRoute(['ayudante', 'admin']),  async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const { nombre, precio } = req.body;
    await servicioModel.addOpcionServicio(serviceId, nombre, precio);
    res.json({ success: true, message: 'Opción agregada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar la opción' });
  }
});

// Editar una opción existente
// Editar una opción existente
router.put('/options/:optionId', protectRoute(['ayudante', 'admin']),  async (req, res) => {
  try {
    const optionId = req.params.optionId;
    const dataToUpdate = {
      nombre: req.body.nombre,
      precio: req.body.precio
    };

    // Editamos la opción usando el modelo
    await servicioModel.editServiceOption(optionId, dataToUpdate);

    // Obtenemos el serviceId de la opción que acabamos de editar
    const serviceId = await servicioModel.getServiceIdByOptionId(optionId);

    // Respondemos al frontend con el serviceId y el mensaje de éxito
    res.json({ success: true, message: 'Opción editada con éxito.', serviceId: serviceId });

  } catch (error) {
    res.status(500).json({ error: 'Error al editar la opción' });
  }
});



// Eliminar una opción
router.delete('/options/:optionId', protectRoute(['ayudante', 'admin']),  async (req, res) => {
  try {
    const optionId = req.params.optionId;
    await servicioModel.deleteServiceOption(optionId);
    res.json({ success: true, message: 'Opción eliminada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la opción' });
  }
});

// Agregar opciones seleccionadas a una disponibilidad
router.post('/:serviceId/availabilities/:availabilityId/options', protectRoute(['user', 'ayudante', 'admin']),  async (req, res) => {
  try {
    const availabilityId = req.params.availabilityId;
    const selectedOptions = req.body.selectedOptions; // Esto es un array de objetos con {opcionId, precio}

    for (let option of selectedOptions) {
      await servicioModel.addDisponibilidadOpcion(availabilityId, option.opcionId, option.precio);
    }

    res.json({ success: true, message: 'Opciones agregadas a la disponibilidad con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar opciones a la disponibilidad' });
  }
});

// Obtener opciones seleccionadas para una disponibilidad
router.get('/:serviceId/availabilities/:availabilityId/options', async (req, res) => {
  try {
    const availabilityId = req.params.availabilityId;
    const options = await servicioModel.getOpcionesForDisponibilidad(availabilityId);
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener opciones de la disponibilidad' });
  }
});

// Eliminar una opción seleccionada de una disponibilidad
router.delete('/:serviceId/availabilities/:availabilityId/options/:optionId', protectRoute(['user', 'ayudante', 'admin']),  async (req, res) => {
  try {
    const availabilityId = req.params.availabilityId;
    const optionId = req.params.optionId;
    await servicioModel.removeOpcionFromDisponibilidad(availabilityId, optionId);
    res.json({ success: true, message: 'Opción eliminada de la disponibilidad con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar opción de la disponibilidad' });
  }
});

router.delete('/:serviceId/deleteImage',  async (req, res) => {
  try {

    const serviceId = req.params.serviceId;
    const { imagePath } = req.body;

    await servicioModel.deleteServiceImage(serviceId, imagePath);

    const absolutePath = path.join(__dirname, '..', 'db', 'uploads', path.basename(imagePath));
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    const io = req.app.get('io');

    io.emit('serviceImagesChanged', { serviceId: req.params.serviceId });

    res.json({ success: true, message: 'Imagen eliminada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la imagen' });
  }
});

router.post('/:serviceId/uploadImages', upload.array('images', 5),  async (req, res) => {
  try {

    const serviceId = req.params.serviceId;
    const imagePaths = req.files.map(file => file.path);

    for (let path of imagePaths) {
      await servicioModel.addImagePath(serviceId, path);
    }

    const io = req.app.get('io');

    io.emit('serviceImagesChanged', { serviceId: req.params.serviceId });

    // Modificar la respuesta para incluir las rutas de las imágenes
    res.json({ success: true, message: 'Imágenes subidas con éxito.', imagePaths: imagePaths });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir las imágenes' });
  }
});


router.put('/:serviceId/socialLinks', protectRoute(['ayudante']),  async (req, res) => {
  const { serviceId } = req.params;
  const { facebook_url, whatsapp_url, instagram_url } = req.body;
  const userId = req.user.usuario_id;

  // Verifica si el usuario (ayudante) está asignado al servicio
  const isAssigned = await servicioModel.isUserAssignedToService(userId, serviceId);
  if (!isAssigned) {
    return res.status(403).json({ message: 'No tienes permiso para actualizar este servicio.' });
  }

  // Actualiza las URLs de redes sociales en la base de datos
  try {
    await servicioModel.updateSocialLinks(serviceId, { facebook_url, whatsapp_url, instagram_url });
    res.json({ success: true, message: 'URLs de redes sociales actualizadas con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar las URLs de redes sociales' });
  }
});




router.get('/', (req, res) => {
  servicioModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
router.delete('/:id',  (req, res) => {
  const { id } = req.params;
  servicioModel.delete(id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Servicio con id=${id} eliminado correctamente.` });
  });
});
router.put('/:id', upload.single('serviceImage'),  (req, res) => {
  const { id } = req.params;

  let updateData = {};

  if (req.file && req.file.path) {
    updateData.image_path = req.file.path;
  }
  if (req.body.facebook_url) {
    updateData.facebook_url = req.body.facebook_url;
  }
  if (req.body.whatsapp_url) {
    updateData.whatsapp_url = req.body.whatsapp_url;
  }
  if (req.body.instagram_url) {
    updateData.instagram_url = req.body.instagram_url;
  }
  if (req.body.modal_description) {
    updateData.modal_description = req.body.modal_description;
  }

  servicioModel.update(id, updateData, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Emitir el evento de WebSocket
    const io = req.app.get('io');
    io.emit('serviceDescriptionChanged', { serviceId: id, newDescription: updateData.modal_description });

    res.json({ message: `Servicio con id=${id} actualizado correctamente.` });
  });
});



// Aquí es donde se protege el endpoint para que sólo los administradores puedan acceder
router.put('/:serviceId/assign', protectRoute(['admin']),  (req, res) => {

  const serviceId = req.params.serviceId;
  const { assistantId } = req.body;

  servicioModel.assignAssistant(serviceId, assistantId, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Emitir el evento de WebSocket
    const io = req.app.get('io');

    io.emit('assistantAssigned', { serviceId, assistantId });

    res.json({ success: true, message: "Ayudante asignado correctamente." });
  });
});
router.put('/:serviceId/toggleColor', protectRoute(['ayudante', 'admin']),  async (req, res) => {
  const serviceId = req.params.serviceId;
  const userId = req.user.usuario_id;



  try {
    const assignedServices = await usuarioModel.getAssignedServices(userId);
    const isAssignedToService = assignedServices.some(service => service.id === parseInt(serviceId));

    if (!isAssignedToService) {
      return res.status(403).json({ message: 'No tienes permiso para hacer esto.' });
    }

    const service = await servicioModel.getById(serviceId);

    const newColor = service.color === 'green' ? 'red' : 'green';
    await servicioModel.updateColor(serviceId, newColor);

    res.json({ success: true, color: newColor });

  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar el color' });
  }
});



router.put('/:serviceId/removeAssistant', protectRoute(['admin']),  (req, res) => {
  const serviceId = req.params.serviceId;
  const { assistantId } = req.body;

  servicioModel.removeAssistant(serviceId, assistantId, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Emitir el evento de WebSocket
    const io = req.app.get('io');
    io.emit('assistantRemoved', { serviceId, assistantId });

    res.json({ success: true, message: "Ayudante desasignado correctamente." });
  });
});

router.get('/:serviceId/assignedHelpers', protectRoute(['admin']), (req, res) => {
  const serviceId = req.params.serviceId;

  servicioModel.getAssignedHelpers(serviceId, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
router.put('/revokeRole/:userId',  async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  try {
    await userModel.revokeRole(userId, role);
    res.json({ message: 'Rol revocado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar el rol' });
  }
});



router.post('/:serviceId/addAvailability', protectRoute(['ayudante']),  async (req, res) => {
  const serviceId = req.params.serviceId;
  const userId = req.user.usuario_id;
  const { fechaInicio, fechaFin, estado } = req.body;

  // Convertir las fechas al formato adecuado
  const formattedFechaInicio = moment(fechaInicio).format('YYYY-MM-DD HH:mm:ss');
  const formattedFechaFin = moment(fechaFin).format('YYYY-MM-DD HH:mm:ss');



  try {
    const assignedServices = await usuarioModel.getAssignedServices(userId);

    const isAssignedToService = assignedServices.some(service => service.id === parseInt(serviceId));

    if (!isAssignedToService) {
      return res.status(403).json({ message: 'No tienes permiso para agregar disponibilidades para este servicio.' });
    }

    servicioModel.addAvailability(userId, serviceId, formattedFechaInicio, formattedFechaFin, estado, (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: "Disponibilidad agregada correctamente." });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar disponibilidad' });
  }
});


router.get('/:serviceId/availabilities', protectRoute(['ayudante', 'user']), async (req, res) => {
  const serviceId = req.params.serviceId;

  try {
    const availabilities = await servicioModel.getAvailabilitiesForService(serviceId);
    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las disponibilidades' });
  }
});



router.get('/:serviceId/isUserAssigned', protectRoute(['ayudante', 'user']), async (req, res) => {
  const serviceId = req.params.serviceId;
  const userId = req.user.usuario_id;

  try {
    const isAssigned = await servicioModel.isUserAssignedToService(userId, serviceId);
    res.json({ isAssigned });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar la asignación' });
  }
});

router.delete('/availability/:availabilityId', protectRoute(['ayudante', 'admin']),  (req, res) => {
  const availabilityId = req.params.availabilityId;

  servicioModel.deleteAvailability(availabilityId, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Disponibilidad eliminada correctamente." });
  });
});
/* reservas */
router.post('/:serviceId/reserve/:availabilityId', protectRoute(['user', 'admin', 'ayudante']), async (req, res) => {
  const serviceId = req.params.serviceId;
  const disponibilidadId = req.params.availabilityId;
  const userId = req.user.usuario_id;

  try {
    const availabilities = await servicioModel.getAvailabilitiesForService(serviceId);
    const isAvailabilityInService = availabilities.some(avail => avail.id === parseInt(disponibilidadId));

    if (!isAvailabilityInService) {
      return res.status(403).json({ message: 'La disponibilidad no pertenece a este servicio.' });
    }

    // Verifica si la disponibilidad puede ser reservada
    const canReserve = await servicioModel.canReserve(disponibilidadId);
    if (!canReserve) {
      return res.status(400).json({ message: 'Esta disponibilidad ya ha sido reservada.' });
    }

    await servicioModel.reserveAvailability(userId, disponibilidadId);
    res.json({ success: true, message: "Disponibilidad reservada con éxito. Esperando confirmación." });

  } catch (error) {
    res.status(500).json({ error: 'Error al reservar la disponibilidad' });
  }
});

router.post('/reservations/:reservaId/complete', protectRoute(['user', 'admin', 'ayudante']), async (req, res) => {
  try {
    await servicioModel.completeReservation(req.params.reservaId);
    res.json({ success: true, message: 'Reserva completada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al completar la reserva' });
  }
});
// Obtener las reservas por ayudante y servicio
router.get('/:serviceId/reservasPorAyudante/:ayudanteId', async (req, res) => {
  try {
    const { serviceId, ayudanteId } = req.params;
    const reservas = await servicioModel.getReservasPorAyudanteYServicio(serviceId, ayudanteId);
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las reservas por ayudante y servicio' });
  }
});
// Actualizar el estado de una reserva a completado
router.put('/reservas/:id/completar',  async (req, res) => {
  try {
    const { id } = req.params;
    await servicioModel.marcarReservaComoCompletada(id);
    res.status(200).send({ message: 'Reserva completada con éxito.' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
router.put('/reservas/:id/pendiente',  async (req, res) => {
  try {
    const { id } = req.params;
    await servicioModel.marcarReservaComoPendiente(id);
    res.status(200).send({ message: 'Reserva marcada como pendiente con éxito.' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.delete('/reservas/:id',  async (req, res) => {
  try {
    const { id } = req.params;
    const response = await servicioModel.deleteReservationById(id);
    res.status(200).send(response);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
// Endpoint para subir el comprobante
router.post('/:serviceId/availabilities/:disponibilidadId/uploadProof', protectRoute(['user', 'admin', 'ayudante']), upload.single('comprobante'), async (req, res) => {

  try {

    const { usuario_id } = req.user;
    const disponibilidadId = req.params.disponibilidadId;
    const comprobantePath = req.file.path;

    // Recibimos el precio y los nombres de las opciones del cuerpo de la solicitud
    const { precio, selectedOptionNames } = req.body;

    if (!precio) {
      return res.status(400).json({ error: 'El precio es requerido.' });
    }

    // Convertimos el precio a número
    const precioNumerico = parseFloat(precio);

    // Convertir la cadena de texto de selectedOptionNames en un array
    const parsedOptionNames = JSON.parse(selectedOptionNames);

    // Verificar si el precio es un número válido
    if (isNaN(precioNumerico)) {
      return res.status(400).json({ error: 'El precio proporcionado no es válido.' });
    }

    await servicioModel.uploadProof(usuario_id, disponibilidadId, comprobantePath, precioNumerico, parsedOptionNames);

    const usuario = await usuarioModel.findUserById(usuario_id);
    if (usuario && usuario.email) {
      const emailContentHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #d783a6; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Confirmación de Reserva - Fabiana Gimenez</h2>
                <h3 style="color: #555;">¡Hola, ${usuario.username}!</h3>
                <p>Hemos recibido tu comprobante de reserva. Pronto estaremos confirmándola.</p>
                <p style="text-align: center; margin-top: 20px;">Gracias por confiar en Fabiana Gimenez. ¡Esperamos que disfrutes del servicio!</p>
                <p style="text-align: center; color: #555;">Equipo de Fabiana Gimenez</p>
            </div>
        `;

      sendEmail({
        to: usuario.email,
        subject: '✨ Confirmación de Reserva en Fabiana Gimenez ✨',
        html: emailContentHTML
      });
    }
    const helpers = await servicioModel.getHelpersForService(req.params.serviceId);
    for (const helper of helpers) {
      const emailToHelper = `
          <div style="font-family: Arial, sans-serif; ...">
              <h2>Notificación de Nueva Reserva - Fabiana Gimenez</h2>
              <p>Hola ${helper.username},</p>
              <p>Un usuario ha realizado una nueva reserva en un servicio al que estás asignado.</p>
              <p>Revisa el sistema para más detalles.</p>
              <p>Equipo de Fabiana Gimenez</p>
          </div>
      `;

      sendEmail({
        to: helper.email,
        subject: 'Nueva Reserva en un Servicio Asignado',
        html: emailToHelper
      });
    }
    // Emitir el evento de WebSocket
    const io = req.app.get('io');
    io.emit('availabilityChanged', { availabilityId: disponibilidadId, newStatus: 'reservado' });

    res.json({ success: true, message: 'Comprobante subido con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir el comprobante' });
  }
});

router.get('/reservasPorUsuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const reservas = await servicioModel.getReservasPorUsuario(usuarioId);
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las reservas por usuario' });
  }
});
router.get('/reservas/cierreCaja', protectRoute(['admin']), async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;

  // Validar que las fechas son correctas
  if (!fechaInicio || !fechaFin || !moment(fechaInicio, 'YYYY-MM-DD', true).isValid() || !moment(fechaFin, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ error: 'Fechas de inicio y fin son requeridas y deben estar en formato YYYY-MM-DD.' });
  }

  // Formatear las fechas
  const formattedFechaInicio = moment(fechaInicio).startOf('day').format('YYYY-MM-DD HH:mm:ss');
  const formattedFechaFin = moment(fechaFin).endOf('day').format('YYYY-MM-DD HH:mm:ss');

  try {
    const resumen = await servicioModel.getResumenReservas(formattedFechaInicio, formattedFechaFin);
    // Enviar la respuesta
    res.json({
      totalIngresos: resumen.totalIngresos,
      totalReservasCompletadas: resumen.totalReservasCompletadas,
      totalIngresosPendientes: resumen.totalIngresosPendientes,
      totalReservasPendientes: resumen.totalReservasPendientes,
      detallesCompletadas: resumen.detallesCompletadas,
      detallesPendientes: resumen.detallesPendientes
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al realizar el cierre de caja' });
  }
});

module.exports = router;
