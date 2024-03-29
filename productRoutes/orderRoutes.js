const express = require('express');
const router = express.Router();
const orderModel = require('../models/orderModel');
const protectRoute = require('../middlewares/autMiddleware');
const mercadopago = require('mercadopago');
const emailService = require('./emailServices');
const Joi = require('joi');
const userModel = require('../models/useModel');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyAdminRole = async (req, res, next) => {
    const token = req.headers['x-auth-token']; // Cambiado para usar 'x-auth-token'
    if (!token) {
        console.log('verifyAdminRole: No token provided');
        return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
        console.log('verifyAdminRole: Token decoded', decodedToken);

        const adminStatus = await usuarioModel.checkIfUserIsAdmin(decodedToken.usuario_id);
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
const orderSchema = Joi.object({
    usuario_id: Joi.number().required(),
    estado: Joi.string().valid('APPROVED', 'PENDING', 'REJECTED', 'REFUNDED').required(),
    detalles: Joi.string().required(),
    datos_envio: Joi.string().required()
});

const asyncHandler = fn => (req, res, next) => {
    return Promise
        .resolve(fn(req, res, next))
        .catch(next);
};

mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

router.post('/api/orders', protectRoute(['user', 'admin', "ayudante"]), asyncHandler(async (req, res) => {
    const { error } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { usuario_id, estado, detalles, datos_envio } = req.body;
    const orderId = await orderModel.createOrder(usuario_id, estado, detalles, datos_envio);
    res.status(201).json({ message: 'Orden creada con éxito', orderId });
}));

router.get('/api/orders', protectRoute(['admin']), asyncHandler(async (req, res) => {
    const orders = await orderModel.getAllOrders();
    res.json(orders);
}));

router.get('/api/orders/:id', protectRoute(), asyncHandler(async (req, res) => {
    const order = await orderModel.getOrderById(req.params.id);

    if (req.user.role !== 'admin' && req.user.id !== order.usuario_id) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json(order);
}));

router.put('/api/orders/:id', protectRoute(), verifyAdminRole, asyncHandler(async (req, res) => {
    const { estado } = req.body;
    const order = await orderModel.getOrderById(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (req.user.role !== 'admin' && req.user.id !== order.usuario_id) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await orderModel.updateOrderStatus(req.params.id, estado);
    if (!result) {
        return res.status(500).json({ error: 'Error al actualizar el estado de la orden' });
    }

    res.json({ message: 'Estado de la orden actualizado con éxito' });
}));

router.get('/api/orders/count', protectRoute(['admin']), asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin para calcular la cantidad de órdenes' });
    }

    const orderCount = await orderModel.getOrderCountByDateRange(startDate, endDate);
    res.json({ orderCount });
}));

router.delete('/api/orders/:id', protectRoute(['admin']), verifyAdminRole, asyncHandler(async (req, res) => {
    const result = await orderModel.deleteOrderById(req.params.id);

    if (!result) {
        return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json({ message: 'Orden eliminada con éxito' });
}));

router.get('/api/orders/filter-by-date', protectRoute(['admin']), asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin para el filtrado' });
    }

    const orders = await orderModel.getOrdersByDateRange(startDate, endDate);
    res.json(orders);
}));

router.get('/api/orders/total-sales', protectRoute(['admin']), asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin para calcular el total de ventas' });
    }

    const totalSales = await orderModel.getTotalSalesByDateRange(startDate, endDate);
    res.json({ totalSales });
}));


module.exports = router;

