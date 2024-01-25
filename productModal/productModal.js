const db = require('../db/db');

const fs = require('fs').promises;
const CATEGORIAS = ["Ojos", "Rostro", "Labios", "Uñas"];

exports.searchProducts = async (keywords) => {
    let sql = 'SELECT * FROM productos WHERE ';
    const sqlConditions = [];
    const sqlParams = [];

    // Manejar múltiples palabras clave y categorías
    keywords.forEach(keyword => {
        if (CATEGORIAS.includes(keyword)) {
            // Agregar condición para categoría
            sqlConditions.push('LOWER(categoria) = ?');
            sqlParams.push(keyword.toLowerCase());
        } else {
            // Agregar condiciones para palabras clave
            sqlConditions.push(`(LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?)`);
            sqlParams.push(`%${keyword.toLowerCase()}%`, `%${keyword.toLowerCase()}%`);
        }
    });

    // Unir todas las condiciones con OR para una búsqueda más inclusiva
    sql += sqlConditions.join(' OR ');

    return new Promise((resolve, reject) => {
        db.query(sql, sqlParams, (err, products) => {
            if (err) {
                reject(new Error("Error al buscar productos: " + err.message));
            } else {
                resolve(products);
            }
        });
    });
};






exports.updateProductStock = async (id, newStock) => {
    const sql = 'UPDATE productos SET stock = ? WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.query(sql, [newStock, id], (err, result) => {
            if (err) {
                return reject(new Error("Error al actualizar el stock del producto"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};

exports.updateAllPrices = async (percentage) => {
    const updatePricesSql = 'UPDATE productos SET precio_anterior = precio, precio = precio * (1 + ? / 100), ultimo_porcentaje = ?';
    return new Promise((resolve, reject) => {
        db.query(updatePricesSql, [percentage, percentage], (err, result) => {
            if (err) {
                return reject(new Error("Error al actualizar los precios"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};

exports.revertLastPercentage = async () => {
    const revertSql = 'UPDATE productos SET precio = precio / (1 + ultimo_porcentaje / 100)';
    return new Promise((resolve, reject) => {
        db.query(revertSql, (err, result) => {
            if (err) {
                return reject(new Error("Error al revertir los precios"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};

exports.adjustPricesToPreviousPercentage = async (previousPercentage) => {
    const adjustSql = 'UPDATE productos SET precio = precio / (1 + ultimo_porcentaje / 100) * (1 + ? / 100), ultimo_porcentaje = ?';
    return new Promise((resolve, reject) => {
        db.query(adjustSql, [previousPercentage, previousPercentage], (err, result) => {
            if (err) {
                return reject(new Error("Error al ajustar los precios"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};

exports.revertAndApplyNewPercentage = async (newPercentage) => {
    // Primero, revertir al precio antes del último cambio de porcentaje
    const revertSql = 'UPDATE productos SET precio = precio_anterior';

    // Luego, aplicar el nuevo porcentaje
    const applyNewPercentageSql = 'UPDATE productos SET precio = precio * (1 + ? / 100), ultimo_porcentaje = ?';

    return new Promise((resolve, reject) => {
        // Primero revertimos los precios
        db.query(revertSql, async (err, revertResult) => {
            if (err) {
                return reject(new Error("Error al revertir los precios"));
            }

            // Luego aplicamos el nuevo porcentaje
            db.query(applyNewPercentageSql, [newPercentage, newPercentage], (err, applyResult) => {
                if (err) {
                    return reject(new Error("Error al aplicar el nuevo porcentaje"));
                }
                resolve(applyResult.affectedRows > 0);
            });
        });
    });
};

exports.createProduct = async (nombre, descripcion, precio, stock, imagenPath, marca, color, color_stock, categoria) => {

    const sql = 'INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, marca, color, color_stock, categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    return new Promise((resolve, reject) => {
        db.query(sql, [nombre, descripcion, precio, stock, imagenPath, marca, color, JSON.stringify(color_stock), categoria], (err, result) => {
            if (err) {
                return reject(new Error("Error al crear el producto"));
            }
            resolve(result.insertId);
        });
    });
};

exports.getAllProducts = async () => {
    const sql = 'SELECT * FROM productos';
    return new Promise((resolve, reject) => {
        db.query(sql, (err, products) => {
            if (err) {
                return reject(new Error("Error al obtener los productos"));
            }
            resolve(products);
        });
    });
};

exports.getProductById = async (id) => {
    const sql = 'SELECT * FROM productos WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.query(sql, [id], (err, product) => {
            if (err) {
                return reject(new Error("Error al obtener el producto"));
            }
            resolve(product[0]);
        });
    });
};

exports.updateProduct = async (id, nombre, descripcion, precio, stock, imagenPath, marca, color, categoria) => {
    const sql = imagenPath
        ? 'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen_url = ?, marca = ?, color = ?, categoria = ? WHERE id = ?'
        : 'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, marca = ?, color = ?, categoria = ? WHERE id = ?';

    const values = imagenPath
        ? [nombre, descripcion, precio, stock, imagenPath, marca, color, categoria, id]
        : [nombre, descripcion, precio, stock, marca, color, categoria, id];

    return new Promise((resolve, reject) => {
        db.query(sql, values, async (err, result) => {
            if (err) {
                return reject(new Error("Error al actualizar el producto"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};


// Asumo que tienes una función getProductById, si no la tienes, puedes usar el que proporcionaste anteriormente.
exports.updateProductDetail = async (id, nombre, descripcion, precio, stock, imagen_url, marca, color, categoria) => {

    const sql = 'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen_url = ?, marca = ?, color = ?, categoria = ? WHERE id = ?';



    return new Promise((resolve, reject) => {
        db.query(sql, [nombre, descripcion, precio, stock, imagen_url, marca, color, categoria, id], async (err, result) => {
            if (err) {
                return reject(new Error("Error al actualizar los detalles del producto"));
            }

            // Log después de actualizar
            const updatedProductDetail = await exports.getProductById(id);

            resolve(result.affectedRows > 0);
        });
    });
};


exports.deleteProduct = async (id) => {
    const sql = 'DELETE FROM productos WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.query(sql, [id], (err, result) => {
            if (err) {
                return reject(new Error("Error al eliminar el producto"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};




exports.updateProductStock = async (id, newStock) => {
    const sql = 'UPDATE productos SET stock = ? WHERE id = ?';
    return new Promise((resolve, reject) => {
        db.query(sql, [newStock, id], (err, result) => {
            if (err) {
                return reject(new Error("Error al actualizar el stock del producto"));
            }
            resolve(result.affectedRows > 0);
        });
    });
};


