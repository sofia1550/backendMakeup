const mysql = require('mysql');
const util = require('util');
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/db');

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
        throw new Error("Error al buscar el usuario por email");
    }
};

exports.updateUserPassword = async (userId, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
    try {
        await query(sql, [hashedPassword, userId]);
    } catch (error) {
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
        throw new Error("Error al revocar el rol al usuario");
    }
};

exports.createUser = async (username, hashedPassword, email) => {
    const sql = 'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)';
    try {
        const result = await query(sql, [username, hashedPassword, email]);
        return result.insertId;
    } catch (error) {
        throw new Error("Error al crear el usuario");
    }
};

exports.findUserByUsernameOrEmail = async (usernameOrEmail) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ? OR email = ?';
    try {
        const results = await query(sql, [usernameOrEmail, usernameOrEmail]);
        return results[0];
    } catch (error) {
        throw new Error("Error al buscar el usuario");
    }
};

exports.doesUsernameExist = async (username) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ?';
    try {
        const result = await query(sql, [username]);
        return result.length > 0;
    } catch (error) {
        throw new Error("Error al comprobar el nombre de usuario");
    }
};

exports.findUserByUsername = async (username) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ?';
    try {
        const result = await query(sql, [username]);
        return result[0];
    } catch (error) {
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
        throw new Error("Error al obtener ayudantes");
    }
};

exports.doesEmailExist = async (email) => {
    const sql = 'SELECT * FROM usuarios WHERE email = ?';
    try {
        const result = await query(sql, [email]);
        return result.length > 0;
    } catch (error) {
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
        throw new Error("Error al asignar rol al usuario");
    }
};

exports.findUserById = async (userId) => {
    const sql = 'SELECT * FROM usuarios WHERE id = ?';
    try {
        const result = await query(sql, [userId]);
        return result[0];
    } catch (error) {
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

    // Asigna el rol al usuario y marca como temporal
    const assignRoleSql = `
        INSERT INTO usuario_roles (usuario_id, role_id, assigned_at, is_temporary)
        VALUES (?, ?, ?, true)
    `;
    await query(assignRoleSql, [userId, roleId, assignedAt]);
};

exports.assignTempHelperRole = async (userId, roleName, assignedAt) => {
    const getRoleIdSql = 'SELECT id FROM roles WHERE name = ?';
    const roleResults = await query(getRoleIdSql, [roleName]);
    if (!roleResults.length) {
        throw new Error(`No se encontró el rol con el nombre: ${roleName}`);
    }
    const roleId = roleResults[0].id;

    const assignRoleSql = `
        INSERT INTO usuario_roles (usuario_id, role_id, assigned_at, is_temporary)
        VALUES (?, ?, ?, true)
    `;
    await query(assignRoleSql, [userId, roleId, assignedAt]);
};


exports.assignUserToServices = async (userId, serviceIds) => {
    const insertSql = `
        INSERT INTO usuario_servicios (usuario_id, service_id) 
        VALUES (?, ?)
    `;

    try {
        for (const serviceId of serviceIds) {
            await query(insertSql, [userId, serviceId]);
        }
    } catch (error) {
        throw new Error(`Error al asignar servicios al usuario: ${error.message}`);
    }
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
            revokedUserIds.push(user.usuario_id);
        }
        return revokedUserIds;
    } catch (error) {
        throw error; // Lanzar el error para manejarlo en la ruta
    }
};
exports.revokeExpiredHelperRoles = async () => {
    const ONE_MINUTE_IN_SECONDS = 60; // 1 minuto en segundos
    const now = new Date();
    const sql = `
        SELECT ur.usuario_id
        FROM usuario_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'ayudante' AND TIMESTAMPDIFF(SECOND, ur.assigned_at, ?) > ?
    `;

    try {
        const usersToRevoke = await query(sql, [now, ONE_MINUTE_IN_SECONDS]);

        const revokedUserIds = [];
        for (const user of usersToRevoke) {
            await exports.revokeRole(user.usuario_id, 'ayudante');
            revokedUserIds.push(user.usuario_id);
        }
        return revokedUserIds;
    } catch (error) {
        throw error;
    }
};

exports.revokeTempServices = async () => {
    const ONE_MINUTE_IN_SECONDS = 60; // 1 minuto en segundos
    const now = new Date();
    const sql = `
        SELECT DISTINCT usuario_id
        FROM usuario_roles
        WHERE is_temporary = true AND TIMESTAMPDIFF(SECOND, assigned_at, ?) > ?
    `;

    try {
        const usersToRevoke = await query(sql, [now, ONE_MINUTE_IN_SECONDS]);

        for (const user of usersToRevoke) {
            // Aquí asumimos que la asignación de servicios es temporal y vinculada al rol temporal.
            // Si esta suposición es incorrecta, necesitarás ajustar esta lógica.
            await exports.removeUserFromServices(user.usuario_id);
        }
    } catch (error) {
        throw error;
    }
};

exports.removeUserFromServices = async (userId) => {
    const removeSql = 'DELETE FROM usuario_servicios WHERE usuario_id = ?';
    await query(removeSql, [userId]);
};
exports.checkIfUserIsAdmin = async (userId) => {
    console.log("Verificando si el usuario es administrador, userID:", userId);
    if (!userId) {
        throw new Error("Se proporcionó un ID de usuario inválido");
    }

    const ONE_MINUTE_IN_SECONDS = 60; // 1 minuto en segundos
    const now = new Date();

    // Modificación de la consulta SQL
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM usuario_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.usuario_id = ? AND r2.name = 'admin') as isAdmin,
            ur.is_temporary, 
            (TIMESTAMPDIFF(SECOND, ur.assigned_at, ?) <= ?) as isWithinGracePeriod
        FROM usuario_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.usuario_id = ? AND r.name = 'admin'
        LIMIT 1;
    `;

    try {
        const result = await query(sql, [userId, now, ONE_MINUTE_IN_SECONDS, userId]);
        console.log("Resultado de la consulta SQL:", result);

        if (!result || result.length === 0) {
            throw new Error("Error al verificar el rol de administrador");
        }

        // Asegúrate de acceder a los campos correctamente, ya que ahora la estructura de result puede ser diferente
        const userIsAdmin = result[0].isAdmin > 0;
        const isTemporary = result[0].is_temporary;
        const withinGracePeriod = result[0].isWithinGracePeriod;
        
        return { isAdmin: userIsAdmin, isTemporary: isTemporary, isWithinGracePeriod: withinGracePeriod };
    } catch (error) {
        console.error("Error en checkIfUserIsAdmin:", error);
        throw new Error("Error al verificar si el usuario es administrador");
    }
};

exports.checkIfUserIsHelper = async (userId) => {
    console.log("Verificando si el usuario es ayudante, userID:", userId);
    if (!userId) {
        throw new Error("Se proporcionó un ID de usuario inválido");
    }

    const ONE_MINUTE_IN_SECONDS = 60; // 1 minuto en segundos
    const now = new Date();

    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM usuario_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.usuario_id = ? AND r2.name = 'ayudante') as isHelper,
            ur.is_temporary, 
            (TIMESTAMPDIFF(SECOND, ur.assigned_at, ?) <= ?) as isWithinGracePeriod
        FROM usuario_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.usuario_id = ? AND r.name = 'ayudante'
        LIMIT 1;
    `;

    try {
        const result = await query(sql, [userId, now, ONE_MINUTE_IN_SECONDS, userId]);
        console.log("Resultado de la consulta SQL:", result);

        if (!result || result.length === 0) {
            return { isHelper: false, isTemporary: false, isWithinGracePeriod: false };
        }

        const userIsHelper = result[0].isHelper > 0;
        const isTemporary = result[0].is_temporary;
        const withinGracePeriod = result[0].isWithinGracePeriod;
        
        return { isHelper: userIsHelper, isTemporary: isTemporary, isWithinGracePeriod: withinGracePeriod };
    } catch (error) {
        console.error("Error en checkIfUserIsHelper:", error);
        throw new Error("Error al verificar si el usuario es ayudante");
    }
};
