const mysql = require('mysql');
const util = require('util');
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/db'); // Asegúrate de que la ruta sea correcta

// Convierte pool.query en una función que devuelve promesas
const query = util.promisify(pool.query).bind(pool);

exports.getById = (userId) => {
    const queryStr = 'SELECT * FROM usuarios WHERE id = ?';
    return query(queryStr, [userId]);
};

exports.findUserByEmail = async (email) => {
    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    try {
        const result = await query(sql, [email]);
        return result[0];
    } catch (error) {
        console.error("Error al buscar el usuario por email:", error);
        throw new Error("Error al buscar el usuario por email");
    }
};

exports.updateUserPassword = async (userId, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
    try {
        await query(sql, [hashedPassword, userId]);
    } catch (error) {
        console.error("Error al actualizar la contraseña del usuario:", error);
        throw new Error("Error al actualizar la contraseña del usuario");
    }
};

exports.getAssignedServices = async (userId) => {
    const queryStr = `
      SELECT s.id, s.title 
      FROM servicios s
      JOIN usuario_servicios us ON s.id = us.service_id
      WHERE us.usuario_id = ?
    `;
    try {
        const services = await query(queryStr, [userId]);
        return services;
    } catch (error) {
        console.error("Error al obtener los servicios asignados al usuario:", error);
        throw new Error("Error al obtener los servicios asignados al usuario");
    }
};

exports.getAllUsers = async () => {
    const sql = `
        SELECT * FROM usuarios 
        WHERE id NOT IN (
            SELECT ur.usuario_id 
            FROM usuario_roles ur 
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = "ayudante"
        )
    `;
    try {
        const users = await query(sql);
        return users;
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        throw new Error("Error al obtener los usuarios");
    }
};

exports.revokeRole = async (userId, roleName) => {
    const getRoleIdSql = 'SELECT id FROM roles WHERE name = ?';
    try {
        const roleResults = await query(getRoleIdSql, [roleName]);
        if (!roleResults.length) {
            throw new Error(`No se encontró el rol con el nombre: ${roleName}`);
        }
        const roleId = roleResults[0].id;
        const deleteRoleSql = 'DELETE FROM usuario_roles WHERE usuario_id = ? AND role_id = ?';
        await query(deleteRoleSql, [userId, roleId]);
    } catch (error) {
        console.error("Error al revocar el rol al usuario:", error);
        throw new Error("Error al revocar el rol al usuario");
    }
};

exports.createUser = async (username, hashedPassword, email) => {
    const sql = 'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)';
    try {
        const result = await query(sql, [username, hashedPassword, email]);
        return result.insertId;
    } catch (error) {
        console.error("Error al crear el usuario:", error);
        throw new Error("Error al crear el usuario");
    }
};

exports.findUserByUsernameOrEmail = async (usernameOrEmail) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ? OR email = ?';
    try {
        const results = await query(sql, [usernameOrEmail, usernameOrEmail]);
        return results[0];
    } catch (error) {
        console.error("Error al buscar el usuario:", error);
        throw new Error("Error al buscar el usuario");
    }
};

exports.doesUsernameExist = async (username) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ?';
    try {
        const result = await query(sql, [username]);
        return result.length > 0;
    } catch (error) {
        console.error("Error al comprobar el nombre de usuario:", error);
        throw new Error("Error al comprobar el nombre de usuario");
    }
};

exports.findUserByUsername = async (username) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ?';
    try {
        const result = await query(sql, [username]);
        return result[0];
    } catch (error) {
        console.error("Error al buscar el usuario:", error);
        throw new Error("Error al buscar el usuario");
    }
};

exports.getAllHelpers = async () => {
    const sql = `
      SELECT u.* 
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = "ayudante"
    `;
    try {
        const helpers = await query(sql);
        return helpers;
    } catch (error) {
        console.error("Error al obtener ayudantes:", error);
        throw new Error("Error al obtener ayudantes");
    }
};

exports.doesEmailExist = async (email) => {
    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    try {
        const result = await query(sql, [email]);
        return result.length > 0;
    } catch (error) {
        console.error("Error al comprobar el correo electrónico:", error);
        throw new Error("Error al comprobar el correo electrónico");
    }
};

exports.assignRole = async (userId, roleName) => {
    const checkSql = `
      SELECT * FROM usuario_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.usuario_id = ? AND r.name = ?
    `;
    try {
        const existingRole = await query(checkSql, [userId, roleName]);
        if (existingRole.length > 0) {
            throw new Error("El usuario ya tiene este rol asignado");
        }
        const sql = `
          INSERT INTO usuario_roles (usuario_id, role_id)
          SELECT ?, id 
          FROM roles 
          WHERE name = ?
        `;
        await query(sql, [userId, roleName]);
    } catch (error) {
        console.error("Error al asignar rol al usuario:", error);
        throw new Error("Error al asignar rol al usuario");
    }
};

exports.findUserById = async (userId) => {
    const sql = 'SELECT * FROM usuarios WHERE id = ?';
    try {
        const result = await query(sql, [userId]);
        return result[0];
    } catch (error) {
        console.error("Error al buscar el usuario por ID:", error);
        throw new Error("Error al buscar el usuario por ID");
    }
};

exports.getUserRoles = async (userId) => {
    const sql = `
      SELECT r.name 
      FROM usuario_roles ur 
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.usuario_id = ?
    `;
    try {
        const roles = await query(sql, [userId]);
        return roles.map(roleObj => roleObj.name); // Convertir a un array de nombres de roles
    } catch (error) {
        console.error("Error al obtener roles del usuario:", error);
        throw new Error("Error al obtener roles del usuario");
    }
};

exports.assignUserRole = async (userId, roleName) => {
    const sql = `
      INSERT INTO usuario_roles (usuario_id, role_id)
      SELECT ?, id 
      FROM roles 
      WHERE name = ?
    `;
    try {
        await query(sql, [userId, roleName]);
    } catch (error) {
        console.error("Error al asignar rol al usuario:", error);
        throw new Error("Error al asignar rol al usuario");
    }
};
exports.assignTempAdminRole = async (userId, roleName, assignedAt) => {
    // Encuentra el ID del rol de administrador
    const getRoleIdSql = 'SELECT id FROM roles WHERE name = ?';
    const roleResults = await query(getRoleIdSql, [roleName]);
    if (!roleResults.length) {
        throw new Error(`No se encontró el rol con el nombre: ${roleName}`);
    }
    const roleId = roleResults[0].id;

    // Asigna el rol al usuario
    const assignRoleSql = `
        INSERT INTO usuario_roles (usuario_id, role_id, assigned_at)
        VALUES (?, ?, ?)
    `;
    await query(assignRoleSql, [userId, roleId, assignedAt]);
};
// userModel.js
// En userModel.js
exports.revokeExpiredAdminRoles = async () => {
    const ONE_MINUTE_IN_SECONDS = 60; // 1 minuto en segundos
    const now = new Date();
    const sql = `
        SELECT ur.usuario_id
        FROM usuario_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'admin' AND TIMESTAMPDIFF(SECOND, ur.assigned_at, ?) > ?
    `;

    try {
        const usersToRevoke = await query(sql, [now, ONE_MINUTE_IN_SECONDS]);

        const revokedUserIds = [];
        for (const user of usersToRevoke) {
            await exports.revokeRole(user.usuario_id, 'admin');
            console.log(`Rol de administrador revocado para el usuario con ID: ${user.usuario_id}`);
            revokedUserIds.push(user.usuario_id);
        }
        return revokedUserIds;
    } catch (error) {
        console.error("Error al revocar roles expirados:", error);
        throw error; // Lanzar el error para manejarlo en la ruta
    }
};


exports.checkIfUserIsAdmin = async (userId) => {
    // Comprueba si el userId es válido y no nulo
    if (!userId) {
        throw new Error("Se proporcionó un ID de usuario inválido");
    }

    const sql = `
        SELECT COUNT(*) as isAdmin
        FROM usuario_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.usuario_id = ? AND r.name = 'admin'
    `;
    
    try {
        const result = await query(sql, [userId]);

        // Comprueba si el resultado de la consulta es válido
        if (!result || result.length === 0) {
            throw new Error("Error al verificar el rol de administrador");
        }

        // Devuelve true si el usuario es administrador, de lo contrario false
        return result[0].isAdmin > 0;
    } catch (error) {
        console.error("Error al verificar si el usuario es administrador:", error);

        // Lanza un error específico para que el middleware pueda manejarlo adecuadamente
        throw new Error("Error al verificar si el usuario es administrador");
    }
};
