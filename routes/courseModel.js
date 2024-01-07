const util = require('util');
const db = require('../db/db');
const query = util.promisify(db.query).bind(db);
exports.actualizarEstadoDisponibilidad = async (cursoId, disponibilidadId, nuevoEstado) => {
    try {
        const sqlUpdateDisponibilidad = 'UPDATE disponibilidades_cursos SET estado = ? WHERE curso_id = ? AND id = ?';
        await query(sqlUpdateDisponibilidad, [nuevoEstado, cursoId, disponibilidadId]);
    } catch (error) {
        console.error("Error al actualizar el estado de la disponibilidad:", error);
        throw new Error("Error al actualizar el estado de la disponibilidad");
    }
};



exports.agregarReservaConDatos = async (disponibilidadId, usuarioId, estado, nombreUsuario, correoUsuario, telefonoUsuario, horarios) => {
    try {
        // Verificar si se ha alcanzado el límite máximo de reservas
        const sqlCheck = 'SELECT COUNT(*) as totalReservas FROM reservas_cursos WHERE disponibilidad_id = ?';
        const [reservasActuales] = await query(sqlCheck, [disponibilidadId]);

        // Obtener el límite máximo de reservas para la disponibilidad
        const sqlMaxReservas = 'SELECT max_reservas FROM disponibilidades_cursos WHERE id = ?';
        const [disponibilidad] = await query(sqlMaxReservas, [disponibilidadId]);

        if (reservasActuales.totalReservas >= disponibilidad.max_reservas) {
            throw new Error("Límite de reservas alcanzado para esta disponibilidad.");
        }

        // Insertar la reserva principal
        const sqlReserva = 'INSERT INTO reservas_cursos (disponibilidad_id, usuario_id, estado, nombre_usuario, correo_usuario, telefono_usuario) VALUES (?, ?, ?, ?, ?, ?)';
        const result = await query(sqlReserva, [disponibilidadId, usuarioId, estado, nombreUsuario, correoUsuario, telefonoUsuario]);
        const reservaId = result.insertId;

        // Insertar cada horario asociado a la reserva en la tabla 'horarios_reservas'
        const sqlHorario = 'INSERT INTO horarios_reservas (reserva_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)';
        for (let horario of horarios) {
            const { dia_semana, hora_inicio, hora_fin } = horario;
            await query(sqlHorario, [reservaId, dia_semana, hora_inicio, hora_fin]);
        }

        return { message: 'Reserva agregada con éxito', id: reservaId };
    } catch (error) {
        console.error("Error al agregar reserva:", error);
        throw new Error(error.message);
    }
};
exports.getReservasActuales = async (disponibilidadId) => {
    try {
        const sql = 'SELECT COUNT(*) as total FROM reservas_cursos WHERE disponibilidad_id = ?';
        const [result] = await query(sql, [disponibilidadId]);
        return result.total;
    } catch (error) {
        console.error("Error al obtener reservas actuales:", error);
        throw new Error("Error al obtener reservas actuales");
    }
};

exports.actualizarRutaComprobante = async (reservaId, rutaComprobante) => {
    try {
        const sql = 'UPDATE reservas_cursos SET url_comprobante = ? WHERE id = ?';
        await query(sql, [rutaComprobante, reservaId]);
    } catch (error) {
        console.error("Error al actualizar la ruta del comprobante:", error);
        throw new Error("Error al actualizar la ruta del comprobante");
    }
};

exports.obtenerTodasLasReservas = async () => {
    try {
        const sqlReservas = `
            SELECT rc.*, c.nombre as curso_nombre, u.username as usuario_nombre, 
                   dc.fecha_inicio, dc.fecha_fin,
                   rc.nombre_usuario, rc.correo_usuario, rc.telefono_usuario, rc.url_comprobante
            FROM reservas_cursos rc
            JOIN disponibilidades_cursos dc ON dc.id = rc.disponibilidad_id
            JOIN cursos c ON c.id = dc.curso_id
            JOIN usuarios u ON u.id = rc.usuario_id`;
        const reservas = await query(sqlReservas);

        for (let reserva of reservas) {
            const sqlHorarios = `SELECT * FROM horarios_disponibilidades WHERE disponibilidad_id = ?`;
            let horarios = await query(sqlHorarios, [reserva.disponibilidad_id]);
            reserva.horarios = horarios;
        }

        return reservas;
    } catch (error) {
        console.error("Error al obtener todas las reservas:", error);
        throw new Error("Error al obtener todas las reservas");
    }
};


exports.actualizarEstadoReserva = async (reservaId, nuevoEstado) => {
    try {
        const sql = 'UPDATE reservas_cursos SET estado = ? WHERE id = ?';
        await query(sql, [nuevoEstado, reservaId]);
    } catch (error) {
        throw new Error("Error al actualizar el estado de la reserva");
    }
};

exports.eliminarReserva = async (reservaId) => {
    try {
        const sql = 'DELETE FROM reservas_cursos WHERE id = ?';
        await query(sql, [reservaId]);
    } catch (error) {
        throw new Error("Error al eliminar la reserva");
    }
};

exports.obtenerReservasAdminPorCurso = async (cursoId) => {
    try {
        const sqlReservas = `
            SELECT rc.*, c.nombre as curso_nombre, dc.fecha_inicio, dc.fecha_fin,
                   rc.nombre_usuario, rc.correo_usuario, rc.telefono_usuario, rc.url_comprobante
            FROM reservas_cursos rc
            JOIN disponibilidades_cursos dc ON rc.disponibilidad_id = dc.id
            JOIN cursos c ON c.id = dc.curso_id
            WHERE dc.curso_id = ?`;
        const reservas = await query(sqlReservas, [cursoId]);

        for (let reserva of reservas) {
            const sqlHorarios = `SELECT * FROM horarios_disponibilidades WHERE disponibilidad_id = ?`;
            let horarios = await query(sqlHorarios, [reserva.disponibilidad_id]);
            reserva.horarios = horarios;
        }

        return reservas;
    } catch (error) {
        console.error("Error al obtener reservas para admin:", error);
        throw new Error("Error al obtener reservas para admin");
    }
};



exports.obtenerReservasPorUsuario = async (usuarioId) => {
    try {
        const sqlReservas = `
        SELECT rc.*, c.nombre as curso_nombre, dc.fecha_inicio, dc.fecha_fin,
               rc.nombre_usuario, rc.correo_usuario, rc.telefono_usuario, rc.url_comprobante
        FROM reservas_cursos rc
        JOIN disponibilidades_cursos dc ON dc.id = rc.disponibilidad_id
        JOIN cursos c ON c.id = dc.curso_id
        WHERE rc.usuario_id = ?`;
        const reservas = await query(sqlReservas, [usuarioId]);

        for (let reserva of reservas) {
            const sqlHorarios = `SELECT * FROM horarios_disponibilidades WHERE disponibilidad_id = ?`;
            let horarios = await query(sqlHorarios, [reserva.disponibilidad_id]);
            reserva.horarios = horarios;
        }

        return reservas;
    } catch (error) {
        console.error("Error al obtener reservas para el usuario:", error);
        throw new Error("Error al obtener reservas para el usuario");
    }
};



exports.agregarHorarioDisponibilidad = async (disponibilidadId, horarios) => {
    try {
        console.log("Agregando horarios para disponibilidad ID:", disponibilidadId, "Horarios:", horarios);

        for (let horario of horarios) {
            // Ajusta los nombres de las propiedades aquí
            const { dia_semana, hora_inicio, hora_fin } = horario;
            console.log("Valores a insertar:", dia_semana, hora_inicio, hora_fin);

            const sql = 'INSERT INTO horarios_disponibilidades (disponibilidad_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)';
            await query(sql, [disponibilidadId, dia_semana, hora_inicio, hora_fin]);
        }
        console.log("Horarios agregados con éxito para disponibilidad ID:", disponibilidadId);

        console.log("Horarios agregados con éxito");
        return { message: 'Horarios agregados con éxito' };
    } catch (error) {
        console.error("Error al agregar horarios:", error);
        throw new Error("Error al agregar horarios");
    }
};



// Agregar disponibilidad a un curso
// Agregar disponibilidad a un curso
// En tu modelo (courseModel.js o similar)
exports.agregarDisponibilidad = async (cursoId, fechaInicio, fechaFin, maxReservas) => {
    console.log("Intentando agregar disponibilidad en la base de datos:", { cursoId, fechaInicio, fechaFin, maxReservas }); // Nuevo log

    try {
        const sql = 'INSERT INTO disponibilidades_cursos (curso_id, fecha_inicio, fecha_fin, max_reservas) VALUES (?, ?, ?, ?)';
        const result = await query(sql, [cursoId, fechaInicio, fechaFin, maxReservas]);
        const nuevaDisponibilidadId = result.insertId;
        console.log("Disponibilidad agregada con éxito, ID:", nuevaDisponibilidadId); // Nuevo log

        return { id: nuevaDisponibilidadId, curso_id: cursoId, fecha_inicio: fechaInicio, fecha_fin: fechaFin, max_reservas: maxReservas };
    } catch (error) {
        console.error("Error al agregar disponibilidad en la base de datos:", error); // Nuevo log
        throw new Error("Error al agregar disponibilidad");
    }
};


// Obtener disponibilidades de un curso
exports.getDisponibilidadesByCursoId = async (cursoId) => {
    console.log("Obteniendo disponibilidades para el curso ID:", cursoId);

    try {
        const sqlDisponibilidades = 'SELECT * FROM disponibilidades_cursos WHERE curso_id = ?';
        let disponibilidades = await query(sqlDisponibilidades, [cursoId]);
        disponibilidades = JSON.parse(JSON.stringify(disponibilidades));

        for (const disponibilidad of disponibilidades) {
            const sqlHorarios = 'SELECT * FROM horarios_disponibilidades WHERE disponibilidad_id = ?';
            let horarios = await query(sqlHorarios, [disponibilidad.id]);
            horarios = JSON.parse(JSON.stringify(horarios));

            disponibilidad.horarios = horarios;
        }

        return disponibilidades;
    } catch (error) {
        console.error("Error al obtener disponibilidades:", error);
        throw new Error("Error al obtener disponibilidades");
    }
};



// Agregar reserva a una disponibilidad
exports.agregarReserva = async (disponibilidadId, usuarioId, estado, horarios) => {
    try {
        // Verificar si la disponibilidad existe
        const verificacionSql = 'SELECT id FROM disponibilidades_cursos WHERE id = ?';
        const resultadoVerificacion = await query(verificacionSql, [disponibilidadId]);

        if (resultadoVerificacion.length === 0) {
            throw new Error("La disponibilidad no existe en los cursos");
        }

        // Iterar sobre cada horario y agregar una entrada en la base de datos para cada uno
        for (let horario of horarios) {
            const { dia_semana, hora_inicio, hora_fin } = horario;
            const sql = 'INSERT INTO reservas_cursos (disponibilidad_id, usuario_id, estado, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?, ?)';
            await query(sql, [disponibilidadId, usuarioId, estado, dia_semana, hora_inicio, hora_fin]);
        }

        return { message: 'Reservas agregadas con éxito' };
    } catch (error) {
        console.error("Error al agregar reservas:", error);
        throw new Error("Error al agregar reservas");
    }
};










exports.getAllCursos = async () => {
    try {
        const sql = 'SELECT * FROM cursos';
        const cursos = await query(sql);
        return cursos;
    } catch (error) {
        console.error("Error al obtener todos los cursos:", error);
        throw new Error("Error al obtener todos los cursos");
    }
};

exports.getCursoById = async (cursoId) => {
    try {
        const sql = 'SELECT * FROM cursos WHERE id = ?';
        const curso = await query(sql, [cursoId]);
        return curso[0]; // Retorna el primer curso encontrado
    } catch (error) {
        console.error("Error al obtener el curso por ID:", error);
        throw new Error("Error al obtener el curso por ID");
    }
};
exports.getClasesByCursoId = async (cursoId) => {
    try {
        const sql = 'SELECT * FROM clases WHERE curso_id = ? ORDER BY orden';
        const clases = await query(sql, [cursoId]);
        return clases;
    } catch (error) {
        console.error("Error al obtener clases por ID de curso:", error);
        throw new Error("Error al obtener clases por ID de curso");
    }
};
exports.getImagenesByCursoId = async (cursoId) => {
    try {
        const sql = 'SELECT * FROM imagenes_curso WHERE curso_id = ?';
        const imagenes = await query(sql, [cursoId]);
        return imagenes;
    } catch (error) {
        console.error("Error al obtener imágenes por ID de curso:", error);
        throw new Error("Error al obtener imágenes por ID de curso");
    }
};
exports.getCursoCompletoById = async (cursoId) => {
    try {
        // Convertir cursoId a número
        const cursoIdNum = parseInt(cursoId, 10);
        if (isNaN(cursoIdNum)) {
            throw new Error('ID de curso inválido');
        }

        // Obtener detalles del curso
        const cursoSql = 'SELECT * FROM cursos WHERE id = ?';
        const curso = await query(cursoSql, [cursoIdNum]);

        if (!curso.length) {
            throw new Error('Curso no encontrado');
        }
        const detallesCurso = curso[0];

        // Obtener clases del curso
        const clasesSql = 'SELECT * FROM clases WHERE curso_id = ? ORDER BY orden';
        const clases = await query(clasesSql, [cursoIdNum]);

        // Obtener imágenes del curso
        const imagenesSql = 'SELECT * FROM imagenes_curso WHERE curso_id = ?';
        const imagenes = await query(imagenesSql, [cursoIdNum]);

        // Combinar todo en un solo objeto
        return {
            ...detallesCurso,
            clases: clases,
            imagenes: imagenes
        };
    } catch (error) {
        console.error("Error al obtener información completa del curso:", error);
        throw new Error("Error al obtener información completa del curso");
    }
};
exports.eliminarImagenCurso = async (imagenId) => {
    try {
        const sql = 'DELETE FROM imagenes_curso WHERE id = ?';
        await query(sql, [imagenId]);
    } catch (error) {
        console.error("Error al eliminar imagen del curso:", error);
        throw new Error("Error al eliminar imagen del curso");
    }
};
exports.agregarImagenCurso = async (cursoId, imagenPath) => {
    try {
        const sql = 'INSERT INTO imagenes_curso (curso_id, url_imagen) VALUES (?, ?)';
        await query(sql, [cursoId, imagenPath]);
        return { message: 'Imagen agregada con éxito' };
    } catch (error) {
        console.error("Error al agregar imagen al curso:", error);
        throw new Error("Error al agregar imagen al curso");
    }
};
exports.getImagenesByCursoId = async (cursoId) => {
    try {
        const sql = 'SELECT * FROM imagenes_curso WHERE curso_id = ?';
        const imagenes = await query(sql, [cursoId]);
        return imagenes;
    } catch (error) {
        console.error("Error al obtener imágenes por ID de curso:", error);
        throw new Error("Error al obtener imágenes por ID de curso");
    }
};
exports.actualizarPrecioCurso = async (cursoId, nuevoPrecio) => {
    try {
        const sql = 'UPDATE cursos SET precio = ? WHERE id = ?';
        await query(sql, [nuevoPrecio, cursoId]);
        return { message: 'Precio actualizado con éxito' };
    } catch (error) {
        console.error("Error al actualizar el precio del curso:", error);
        throw new Error("Error al actualizar el precio del curso");
    }
};