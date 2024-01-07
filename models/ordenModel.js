const mysql = require('mysql');
const util = require('util');
const { isValidDate } = require('../utils/validationUtils');

require('dotenv').config();

const db = require('../db/db');
const query = util.promisify(db.query).bind(db);

exports.getOrdersByStatus = async (status, sortByDate = 'desc') => {

    let statusPlaceholders = Array.isArray(status) ? status.map(() => '?').join(',') : '?';
    const sql = `
        SELECT * 
        FROM ordenes 
        WHERE estado IN (${statusPlaceholders}) 
        ORDER BY fecha ${sortByDate === 'asc' ? 'ASC' : 'DESC'}
    `;


    try {
        const results = await query(sql, Array.isArray(status) ? status : [status]);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes por estado:", error);
        throw new Error("Error al obtener las órdenes por estado");
    }
};


exports.getOrdersByStatusAndDateRange = async (status, sortByDate = 'desc', startDate, endDate) => {
    let statusPlaceholders = Array.isArray(status) ? status.map(() => '?').join(',') : '?';
    const sql = `
        SELECT * 
        FROM ordenes 
        WHERE estado IN (${statusPlaceholders}) AND fecha BETWEEN ? AND ?
        ORDER BY fecha ${sortByDate === 'asc' ? 'ASC' : 'DESC'}
    `;

    try {
        const params = Array.isArray(status) ? [...status, startDate, endDate] : [status, startDate, endDate];

        const results = await query(sql, params);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes por estado y rango de fechas:", error);
        throw new Error("Error al obtener las órdenes por estado y rango de fechas");
    }
};
exports.getAdminOrders = async () => {
    const sql = `
        SELECT ordenes.*, detalles_ordenes.*
        FROM ordenes
        LEFT JOIN detalles_ordenes ON ordenes.id = detalles_ordenes.orden_id
        WHERE ordenes.estado IN ('Pendiente', 'Activo', 'Aprobado')
    `;
    try {

        const results = await query(sql);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes para el administrador:", error);
        throw new Error("Error al obtener las órdenes para el administrador");
    }
};


exports.createOrderDetails = async (orderId, productoId, cantidad, precio) => {
    const sql = 'INSERT INTO detalles_ordenes (orden_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)';
    try {
        await query(sql, [orderId, productoId, cantidad, precio]);
    } catch (error) {
        console.error("Error al crear el detalle de la orden:", error);
        handleError("Error al crear el detalle de la orden", error);
    }
};

exports.getUserById = async (usuario_id) => {
    const sql = 'SELECT * FROM usuarios WHERE id = ?';
    try {
        const results = await query(sql, [usuario_id]);
        return results[0];
    } catch (error) {
        console.error("Error al obtener el usuario:", error);
        throw new Error("Error al obtener el usuario");
    }
};


exports.createOrder = async (usuario_id, total, nombre, email, telefono) => {
    const sql = 'INSERT INTO ordenes (usuario_id, fecha, total, nombre, email, telefono, estado) VALUES (?, NOW(), ?, ?, ?, ?, "Pendiente")';
    try {
        const result = await query(sql, [usuario_id, total, nombre, email, telefono]);

        const updateSql = 'UPDATE ordenes SET external_reference = ? WHERE id = ?';
        await query(updateSql, [result.insertId.toString(), result.insertId]);

        return result.insertId;
    } catch (error) {
        console.error("Error al crear la orden:", error);
        throw new Error("Error al crear la orden");
    }
};

exports.getOrderById = async (id) => {
    const sql = 'SELECT * FROM ordenes WHERE id = ?';
    try {
        const result = await query(sql, [id]);
        return result[0];
    } catch (error) {
        console.error("Error al obtener la orden:", error);
        throw new Error("Error al obtener la orden");
    }
};


exports.getOrdersByUserId = async (usuario_id) => {
    const sql = 'SELECT * FROM ordenes WHERE usuario_id = ?';
    try {
        const results = await query(sql, [usuario_id]);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes del usuario:", error);
        throw new Error("Error al obtener las órdenes del usuario");
    }
};

exports.updateOrderStatus = async (id, estado) => {
    const sql = 'UPDATE ordenes SET estado = ? WHERE id = ?';
    try {
        const result = await query(sql, [estado, id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error al actualizar el estado de la orden:", error);
        throw new Error("Error al actualizar el estado de la orden");
    }
};

exports.deleteOrderById = async (id) => {
    const sql = 'DELETE FROM ordenes WHERE id = ?';
    try {
        const result = await query(sql, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error al eliminar la orden:", error);
        throw new Error("Error al eliminar la orden");
    }
};
exports.updateUserData = async (usuario_id, nombre, direccion, telefono) => {
    const sql = 'UPDATE usuarios SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?';
    try {
        const result = await query(sql, [nombre, direccion, telefono, usuario_id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error al actualizar los datos del usuario:", error);
        throw new Error("Error al actualizar los datos del usuario");
    }
};

exports.getOrdersByDateRange = async (startDate, endDate) => {
    const sql = 'SELECT * FROM ordenes WHERE fecha BETWEEN ? AND ?';
    try {
        const results = await query(sql, [startDate, endDate]);
        return results;
    } catch (error) {
        console.error("Error al obtener órdenes por rango de fecha:", error);
        throw new Error("Error al obtener órdenes por rango de fecha");
    }
};

exports.getTotalSalesByDateRange = async (startDate, endDate) => {
    const sql = 'SELECT SUM(total) as totalSales FROM ordenes WHERE fecha BETWEEN ? AND ?';
    try {
        const results = await query(sql, [startDate, endDate]);
        return results[0].totalSales;
    } catch (error) {
        console.error("Error al obtener el total de ventas:", error);
        throw new Error("Error al obtener el total de ventas");
    }
};

exports.getOrderCountByDateRange = async (startDate, endDate) => {
    const sql = 'SELECT COUNT(id) as orderCount FROM ordenes WHERE fecha BETWEEN ? AND ?';
    try {
        const results = await query(sql, [startDate, endDate]);
        return results[0].orderCount;
    } catch (error) {
        console.error("Error al obtener la cantidad de órdenes:", error);
        throw new Error("Error al obtener la cantidad de órdenes");
    }
};

exports.updateOrderTotal = async (orden_id) => {
    const sql = `
        UPDATE ordenes
        SET total = (
            SELECT SUM(precio * cantidad) 
            FROM detalles_ordenes 
            WHERE orden_id = ?
        )
        WHERE id = ?;
    `;

    try {
        await query(sql, [orden_id, orden_id]);
    } catch (error) {
        console.error("Error al actualizar el total de la orden:", error);
        throw new Error("Error al actualizar el total de la orden");
    }
};
exports.getAllOrders = async () => {
    const sql = 'SELECT * FROM ordenes';
    try {
        const results = await query(sql);
        return results;
    } catch (error) {
        console.error("Error al obtener todas las órdenes:", error);
        throw new Error("Error al obtener todas las órdenes");
    }
};
exports.updateShippingInfo = async (orden_id, metodo_envio, direccion, ciudad, estado, codigo_postal, pais) => {
    const sql = 'UPDATE ordenes SET metodo_envio = ?, direccion = ?, ciudad = ?, estado = ?, codigo_postal = ?, pais = ?, estado = "Activo" WHERE id = ?';
    try {
        const result = await query(sql, [metodo_envio, direccion, ciudad, estado, codigo_postal, pais, orden_id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error al actualizar la información de envío:", error);
        throw new Error("Error al actualizar la información de envío");
    }
};

exports.getShippingInfoByOrderId = async (orden_id) => {
    const sql = `
        SELECT metodo_envio, direccion, ciudad, estado, codigo_postal, pais 
        FROM ordenes 
        WHERE id = ?
    `;

    try {
        const results = await query(sql, [orden_id]);
        if (results.length > 0) {
            return results[0];
        } else {
            throw new Error("No se encontró información de envío para la orden con ID: " + orden_id);
        }
    } catch (error) {
        console.error("Error al obtener la información de envío:", error);
        throw error;
    }
};
exports.updateOrderPaymentReceipt = async (orderId, receiptURL) => {
    const sql = 'UPDATE ordenes SET comprobante_pago = ?, estado = "Completado" WHERE id = ?';
    try {
        const result = await query(sql, [receiptURL, orderId]);
        if (result.affectedRows > 0) {
            return true;
        } else {
            console.warn('No se actualizó ninguna fila en la base de datos.');
            return false;
        }
    } catch (error) {
        console.error("Error al actualizar comprobante de pago de la orden:", error);
        throw error;
    }
};

exports.getOrdersByStatus = async (status, sortByDate = 'desc') => {
    const sql = `
        SELECT * 
        FROM ordenes 
        WHERE estado = ? 
        ORDER BY fecha ${sortByDate === 'asc' ? 'ASC' : 'DESC'}
    `;

    try {
        const results = await query(sql, [status]);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes por estado:", error);
        throw new Error("Error al obtener las órdenes por estado");
    }
};


exports.deleteOrder = async (orderId) => {
    const deleteOrderDetailsSql = 'DELETE FROM detalles_ordenes WHERE orden_id = ?';
    const deleteOrderSql = 'DELETE FROM ordenes WHERE id = ?';
    try {
        await query(deleteOrderDetailsSql, [orderId]);

        await query(deleteOrderSql, [orderId]);
    } catch (error) {
        
        console.error("Error al eliminar la orden:", error);
        throw new Error("Error al eliminar la orden");
    }
};
exports.getOrdersByStatusAndDateRange = async (status, sortByDate = 'desc', startDate, endDate) => {
    const sql = `
        SELECT * 
        FROM ordenes 
        WHERE estado = ? AND fecha BETWEEN ? AND ?
        ORDER BY fecha ${sortByDate === 'asc' ? 'ASC' : 'DESC'}
    `;

    try {
        const results = await query(sql, [status, startDate, endDate]);
        return results;
    } catch (error) {
        console.error("Error al obtener las órdenes por estado y rango de fechas:", error);
        throw new Error("Error al obtener las órdenes por estado y rango de fechas");
    }
};
exports.getOrderByReference = async (reference) => {
    const sql = 'SELECT * FROM ordenes WHERE external_reference = ?';
    try {
        const result = await query(sql, [reference]);
        return result[0];
    } catch (error) {
        console.error("Error al obtener la orden por referencia:", error);
        throw new Error("Error al obtener la orden por referencia");
    }
};