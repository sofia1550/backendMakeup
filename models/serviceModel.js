const mysql = require('mysql');
const util = require('util');
require('dotenv').config();
const db = require('../db/db');
const query = util.promisify(db.query).bind(db);
exports.getAll = (callback) => {
    const queryStr = 'SELECT * FROM servicios';
    db.query(queryStr, callback);
};
exports.update = (id, data, callback) => {
    const queryStr = 'UPDATE servicios SET ? WHERE id = ?';
    db.query(queryStr, [data, id], callback);
    console.log("Executing query:", queryStr);
    console.log("With values:", [data, id]);
};
exports.removeOpcionFromDisponibilidad = async (disponibilidadId, opcionId) => {
    const queryStr = 'DELETE FROM disponibilidades_opciones WHERE disponibilidad_id = ? AND opcion_id = ?';
    await query(queryStr, [disponibilidadId, opcionId]);
};
// Para agregar una nueva opción de servicio (por ejemplo, una opción de depilación)
exports.addOpcionServicio = async (serviceId, nombre, precio) => {
    const queryStr = 'INSERT INTO opciones_servicios (service_id, nombre, precio) VALUES (?, ?, ?)';
    await query(queryStr, [serviceId, nombre, precio]);
};
// Para obtener todas las opciones de servicio para un servicio específico
exports.getOpcionesServicio = async (serviceId) => {
    const queryStr = 'SELECT * FROM opciones_servicios WHERE service_id = ?';
    return await query(queryStr, [serviceId]);
};
// Para registrar las selecciones de opciones de servicio de un usuario al crear una disponibilidad
exports.addDisponibilidadOpcion = async (disponibilidadId, opcionId, precio) => {
    const queryStr = 'INSERT INTO disponibilidades_opciones (disponibilidad_id, opcion_id, precio) VALUES (?, ?, ?)';
    await query(queryStr, [disponibilidadId, opcionId, precio]);
};
exports.deleteServiceOption = async (optionId) => {
    const queryStr = 'DELETE FROM opciones_servicios WHERE id = ?';
    await query(queryStr, [optionId]);
};

exports.editServiceOption = async (optionId, data) => {
    const queryStr = 'UPDATE opciones_servicios SET ? WHERE id = ?';
    await query(queryStr, [data, optionId]);
};
exports.getServiceIdByOptionId = async (optionId) => {
    const queryStr = 'SELECT service_id FROM opciones_servicios WHERE id = ?';
    const result = await query(queryStr, [optionId]);
    return result[0].service_id; // Devuelve el service_id de la primera fila.
};

// Para obtener todas las opciones de servicio seleccionadas para una disponibilidad específica
exports.getOpcionesForDisponibilidad = async (disponibilidadId) => {
    const queryStr = `
      SELECT os.nombre, os.precio 
      FROM disponibilidades_opciones do
      JOIN opciones_servicios os ON do.opcion_id = os.id
      WHERE do.disponibilidad_id = ?
    `;
    return await query(queryStr, [disponibilidadId]);
};
exports.deleteServiceImage = async (serviceId, imagePath) => {
    console.log("Model - deleteServiceImage llamado con:", serviceId, imagePath);
    const queryStr = 'DELETE FROM service_images WHERE service_id = ? AND image_path = ?';
    await query(queryStr, [serviceId, imagePath]);
};
exports.addImagePath = async (serviceId, imagePath) => {
    console.log("Model - addImagePath llamado con:", serviceId, imagePath);
    const queryStr = 'INSERT INTO service_images (service_id, image_path) VALUES (?, ?)';
    await query(queryStr, [serviceId, imagePath]);
};
exports.getServiceImages = async (serviceId) => {
    console.log("Model - getServiceImages llamado con:", serviceId);
    const queryStr = 'SELECT image_path FROM service_images WHERE service_id = ?';
    const results = await query(queryStr, [serviceId]);
    return results.map(row => row.image_path);
};
exports.updateSocialLinks = async (serviceId, socialLinks) => {
    const queryStr = 'UPDATE servicios SET ? WHERE id = ?';
    await query(queryStr, [socialLinks, serviceId]);
};
exports.delete = (id, callback) => {
    const queryStr = 'DELETE FROM servicios WHERE id = ?';
    db.query(queryStr, [id], callback);
};
exports.create = (data, callback) => {
    const queryStr = 'INSERT INTO servicios SET ?';
    db.query(queryStr, data, callback);
};
exports.assignAssistant = (serviceId, assistantId, callback) => {
    // Asignar un ayudante a un servicio insertando en la tabla usuario_servicios
    const queryStr = 'INSERT INTO usuario_servicios (usuario_id, service_id) VALUES (?, ?)';
    db.query(queryStr, [assistantId, serviceId], callback);
};
exports.getById = (serviceId) => {
    const queryStr = 'SELECT * FROM servicios WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.query(queryStr, [serviceId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results[0]);
            }
        });
    });
};
exports.updateColor = (serviceId, color, callback) => {
    const queryStr = 'UPDATE servicios SET color = ? WHERE id = ?';
    db.query(queryStr, [color, serviceId], callback);
};
exports.removeAssistant = (serviceId, assistantId, callback) => {
    // Desasignar un ayudante de un servicio eliminando de la tabla usuario_servicios
    const queryStr = 'DELETE FROM usuario_servicios WHERE usuario_id = ? AND service_id = ?';
    db.query(queryStr, [assistantId, serviceId], callback);
};
exports.getAssignedHelpers = (serviceId, callback) => {
    // Obtener todos los ayudantes asignados a un servicio específico
    const queryStr = `
      SELECT u.id, u.username 
      FROM usuarios u
      JOIN usuario_servicios us ON u.id = us.usuario_id
      WHERE us.service_id = ?
    `;
    db.query(queryStr, [serviceId], callback);
};
exports.addAvailability = (userId, serviceId, fechaInicio, fechaFin, estado, callback) => {
    const queryStr = 'INSERT INTO disponibilidades (usuario_id, service_id, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?)';

    console.log("Executing query:", queryStr);
    console.log("With values:", [userId, serviceId, fechaInicio, fechaFin, estado]);

    db.query(queryStr, [userId, serviceId, fechaInicio, fechaFin, estado], (err, results) => {
        if (err) {
            console.error("Error in DB query:", err.message);
        }
        callback(err, results);
    });
};
exports.getAvailabilitiesForServiceAndUser = (userId, serviceId) => {
    return new Promise((resolve, reject) => {
        const queryStr = 'SELECT * FROM disponibilidades WHERE usuario_id = ? AND service_id = ?';
        db.query(queryStr, [userId, serviceId], (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
};
exports.getAvailabilitiesForService = (serviceId) => {
    return new Promise((resolve, reject) => {
        const queryStr = 'SELECT * FROM disponibilidades WHERE service_id = ?';
        db.query(queryStr, [serviceId], (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
};
exports.isUserAssignedToService = (userId, serviceId) => {
    return new Promise((resolve, reject) => {
        const queryStr = 'SELECT * FROM usuario_servicios WHERE usuario_id = ? AND service_id = ?';
        db.query(queryStr, [userId, serviceId], (err, results) => {
            if (err) reject(err);
            // Si hay resultados, significa que el usuario está asignado al servicio.
            resolve(results.length > 0);
        });
    });
};
exports.deleteAvailability = (availabilityId, callback) => {
    const queryStr = 'DELETE FROM disponibilidades WHERE id = ?';
    db.query(queryStr, [availabilityId], callback);
};
/* reservas */
exports.reserveAvailability = async (userId, disponibilidadId, precio) => {
    // Crea una nueva entrada en la tabla de reservas en estado 'pendiente' con el precio dado
    const queryStr = 'INSERT INTO reservas (usuario_id, disponibilidad_id, estado, precio) VALUES (?, ?, "pendiente", ?)';
    await query(queryStr, [userId, disponibilidadId, precio]);
};
exports.completeReservation = async (reservaId) => {
    // Cambia el estado de la reserva a 'completado'
    const updateReservationStr = 'UPDATE reservas SET estado = "completado" WHERE id = ?';
    await query(updateReservationStr, [reservaId]);
    // Encuentra la disponibilidad asociada y cambia su estado a 'reservado'
    const availabilityStr = 'SELECT disponibilidad_id FROM reservas WHERE id = ?';
    const result = await query(availabilityStr, [reservaId]);

    if (result && result[0]) {
        const disponibilidadId = result[0].disponibilidad_id;
        const updateAvailabilityStr = 'UPDATE disponibilidades SET estado = "reservado" WHERE id = ?';
        await query(updateAvailabilityStr, [disponibilidadId]);
    }
};
exports.uploadProof = async (usuarioId, disponibilidadId, comprobantePath, precio, parsedOptionNames) => {
    console.log("parsedOptionNames en función:", parsedOptionNames); // <-- Añade este log
    try {
        // Verificamos si la disponibilidad puede ser reservada
        const canBeReserved = await exports.canReserve(disponibilidadId);
        console.log("Valor de canBeReserved:", canBeReserved);
        if (!canBeReserved) {
            console.warn("La disponibilidad ya ha sido reservada o no se encontró.");
            throw new Error("La disponibilidad ya ha sido reservada o no se encontró.");
        }

        // Obtener fechas de inicio y fin de la disponibilidad
        const availabilityQueryStr = 'SELECT fecha_inicio, fecha_fin FROM disponibilidades WHERE id = ?';
        const availabilityResult = await query(availabilityQueryStr, [disponibilidadId]);
        if (!availabilityResult || !availabilityResult[0]) {
            throw new Error("No se encontró la disponibilidad con ID:", disponibilidadId);
        }
        const { fecha_inicio, fecha_fin } = availabilityResult[0];

        // Creamos una nueva reserva con el precio, las fechas y las opciones seleccionadas
        const createReservationStr = 'INSERT INTO reservas (usuario_id, disponibilidad_id, estado, comprobante_path, precio, fecha_inicio_reserva, fecha_fin_reserva, opciones_seleccionadas) VALUES (?, ?, "pendiente", ?, ?, ?, ?, ?)';
        await query(createReservationStr, [usuarioId, disponibilidadId, comprobantePath, precio, fecha_inicio, fecha_fin, JSON.stringify(parsedOptionNames)]);

        // Actualizamos el estado de la disponibilidad a "reservado"
        const updateAvailabilityStr = 'UPDATE disponibilidades SET estado = "reservado" WHERE id = ?';
        await query(updateAvailabilityStr, [disponibilidadId]);
    } catch (error) {
        throw error;
    }
};



exports.canReserve = async (disponibilidadId) => {
    const queryStr = 'SELECT estado FROM disponibilidades WHERE id = ?';
    const results = await query(queryStr, [disponibilidadId]);
    console.log("Resultado completo de la consulta:", results);
    if (!results || !results[0]) {
        console.warn("No se encontró la disponibilidad con ID:", disponibilidadId);
        return false;
    }
    const estadoActual = results[0].estado.trim();
    console.log("Estado de la disponibilidad (sin espacios):", estadoActual);

    // Asegúrate de que el estado no sea "reservado"
    return estadoActual !== 'reservado';
};
exports.getReservasPorAyudanteYServicio = async (serviceId, ayudanteId) => {
    const queryStr = `
        SELECT r.*, u.username AS usuario_nombre
        FROM reservas r
        JOIN disponibilidades d ON r.disponibilidad_id = d.id
        JOIN servicios s ON d.service_id = s.id
        JOIN usuario_servicios us ON s.id = us.service_id
        JOIN usuarios u ON r.usuario_id = u.id
        WHERE us.usuario_id = ? AND s.id = ?;
    `;
    const reservas = await query(queryStr, [ayudanteId, serviceId]);
    return reservas;
};

exports.obtenerReservasPorAyudante = async (req, res) => {
    try {
        const { ayudanteId } = req.params;
        const reservas = await serviceModel.getReservasPorAyudante(ayudanteId);
        res.json(reservas);
    } catch (error) {
        console.error("Error al obtener el historial de reservas:", error);
        res.status(500).json({ error: 'Error al obtener el historial de reservas' });
    }
};
exports.getReservasPorUsuario = async (usuarioId) => {
    const queryStr = `
    SELECT r.*, s.title as serviceTitle
    FROM RESERVAS r
    JOIN DISPONIBILIDADES d ON r.disponibilidad_id = d.id
    JOIN SERVICIOS s ON d.service_id = s.id
    WHERE r.usuario_id = ?;
    
    `;
    const reservas = await query(queryStr, [usuarioId]);
    console.log("Reservas obtenidas de la DB para usuarioId", usuarioId, ":", reservas);
    return reservas;
};
exports.marcarReservaComoCompletada = async (reservaId) => {
    const queryStr = `UPDATE reservas SET estado='completado' WHERE id=?`;
    await query(queryStr, [reservaId]);
};
exports.marcarReservaComoPendiente = async (reservaId) => {
    const queryStr = `UPDATE reservas SET estado='pendiente' WHERE id=?`;
    await query(queryStr, [reservaId]);
};

exports.deleteReservationById = async (reservationId) => {
    try {
        await query('DELETE FROM reservas WHERE id=?', [reservationId]);
        return { message: 'Reserva eliminada con éxito.' };
    } catch (error) {
        throw new Error(error.message);
    }
};
exports.getResumenReservas = async (fechaInicio, fechaFin) => {
    const detallesReservas = `
        SELECT r.id, r.usuario_id, r.fecha_reserva, r.estado, r.comprobante_path, r.precio,
               r.fecha_inicio_reserva, r.fecha_fin_reserva, r.opciones_seleccionadas,
               u.username AS usuario_nombre, s.title AS servicio_nombre
        FROM reservas r
        JOIN usuarios u ON r.usuario_id = u.id
        JOIN disponibilidades d ON r.disponibilidad_id = d.id
        JOIN servicios s ON d.service_id = s.id
        WHERE r.fecha_reserva BETWEEN ? AND ?;
    `;

    const detalles = await query(detallesReservas, [fechaInicio, fechaFin]);

    // Ajustar la ruta del comprobante para cada reserva
    const detallesAjustados = detalles.map(reserva => {
        let comprobantePath = reserva.comprobante_path;
        if (comprobantePath) {
            // Solo reemplaza barras invertidas con barras normales
            comprobantePath = comprobantePath.replace(/\\/g, '/');
            comprobantePath = `http://localhost:3002/${comprobantePath}`;
        }
        return {
            ...reserva,
            comprobante_path: comprobantePath
        };
    });

    // Logs para verificar las URLs
    console.log("URL original del comprobante de la primera reserva:", detalles[0]?.comprobante_path);
    console.log("URL corregida del comprobante de la primera reserva:", detallesAjustados[0]?.comprobante_path);

    // Agrupar las reservas por estado para contar y sumar los precios
    const resumen = detallesAjustados.reduce((acc, reserva) => {
        if (reserva.estado === 'completado') {
            acc.totalIngresos += parseFloat(reserva.precio);
            acc.totalReservasCompletadas++;
            acc.detallesCompletadas.push(reserva);
        } else if (reserva.estado === 'pendiente') {
            acc.totalIngresosPendientes += parseFloat(reserva.precio);
            acc.totalReservasPendientes++;
            acc.detallesPendientes.push(reserva);
        }
        return acc;
    }, {
        totalIngresos: 0,
        totalReservasCompletadas: 0,
        detallesCompletadas: [],
        totalIngresosPendientes: 0,
        totalReservasPendientes: 0,
        detallesPendientes: []
    });

    return resumen;
};
exports.getHelpersForService = async (serviceId) => {
    const queryStr = `
      SELECT u.email, u.username 
      FROM usuario_servicios us
      JOIN usuarios u ON us.usuario_id = u.id
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.role_id = r.id
      WHERE us.service_id = ? AND r.name = 'ayudante';
    `;
    return await query(queryStr, [serviceId]);
};
