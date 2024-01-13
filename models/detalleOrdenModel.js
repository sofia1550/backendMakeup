const mysql = require('mysql');
const util = require('util');
const ordenModel = require('./ordenModel');
const { validateNumber } = require('../utils/validationUtils');
const db = require('../db/db');
const query = util.promisify(db.query).bind(db);

exports.addOrderDetail = async (orden_id, producto_id, cantidad, precio) => {
    validateNumber(cantidad, "Cantidad");
    validateNumber(precio, "Precio");

    const sql = 'INSERT INTO detalles_ordenes (orden_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)';
    try {
        const result = await query(sql, [orden_id, producto_id, cantidad, precio]);
        await ordenModel.updateOrderTotal(orden_id);
        return result.insertId;
    } catch (error) {
        throw new Error("Error al agregar detalle de orden. Por favor, verifica los datos ingresados.");
    }
};

exports.getOrderDetailsByOrderId = async (orden_id) => {

    const sql = `
    SELECT do.*, p.imagen_url, p.nombre 
    FROM detalles_ordenes as do
    LEFT JOIN productos as p ON do.producto_id = p.id
    WHERE do.orden_id = ?
`;

    try {
        return await query(sql, [orden_id]);
    } catch (error) {
        throw new Error("Error al obtener detalles de orden");
    }
};

exports.updateOrderDetail = async (id, cantidad, precio) => {
    validateNumber(cantidad, "Cantidad");
    validateNumber(precio, "Precio");

    const sql = 'UPDATE detalles_ordenes SET cantidad = ?, precio = ? WHERE id = ?';
    try {
        const result = await query(sql, [cantidad, precio, id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error("Error al actualizar detalle de orden. Por favor, verifica los datos ingresados.");
    }
};

exports.deleteOrderDetailById = async (id) => {
    const sql = 'DELETE FROM detalles_ordenes WHERE id = ?';
    try {
        const result = await query(sql, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error("Error al eliminar detalle de orden");
    }
};

exports.getProductDetailInOrder = async (orden_id, producto_id) => {
    const sql = 'SELECT * FROM detalles_ordenes WHERE orden_id = ? AND producto_id = ?';
    try {
        const results = await query(sql, [orden_id, producto_id]);
        return results[0];
    } catch (error) {
        throw new Error("Error al obtener detalles del producto en la orden");
    }
};

exports.getTotalSpentOnProduct = async (producto_id) => {
    const sql = `SELECT SUM(precio * cantidad) as totalSpent 
                 FROM detalles_ordenes 
                 WHERE producto_id = ?`;
    try {
        const results = await query(sql, [producto_id]);
        return results[0].totalSpent;
    } catch (error) {
        throw new Error("Error al obtener el total gastado en el producto");
    }
};
