const express = require('express');
const router = express.Router();

const orderModel = require('../models/ordenModel');
const orderDetailsModel = require('../models/detalleOrdenModel');
const productModel = require('../productModal/productModal');

const protectRoute = require('../middlewares/autMiddleware');
const multer = require('multer');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { sendEmail } = require('../utils/emailServices');

cloudinary.config({
    cloud_name: 'dgbexlh0a',
    api_key: '194661148772884',
    api_secret: 'EDzFB8FXFJ3IDow_1QMwNIzlcm8'
});

const storage = new CloudinaryStorage({
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

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024  // 10MB
    }
});

const OWNER_EMAIL = 'luciuknicolas15@gmail.com';

router.post('/upload-comprobante/:id', upload.single('comprobante'), async (req, res) => {
    const orderId = req.params.id;

    if (req.file) {
        const receiptURL = req.file.path;

        try {
            const updated = await orderModel.updateOrderPaymentReceipt(orderId, receiptURL);
            if (updated) {
                await orderModel.updateOrderStatus(orderId, 'Aprobado');

                // Actualizar stock y emitir evento
                const orderDetails = await orderDetailsModel.getOrderDetailsByOrderId(orderId);
                for (let detail of orderDetails) {
                    const product = await productModel.getProductById(detail.producto_id);
                    const newStock = product.stock - detail.cantidad;
                    await productModel.updateProductStock(detail.producto_id, newStock);

                    const io = req.app.get('io');
                    io.emit('stock-updated', { productId: detail.producto_id, newStock });
                }

                // Obtener detalles de la orden
                const order = await orderModel.getOrderById(orderId);

                if (order && order.email) {
                    // Preparar detalles de la orden para el correo
                    let orderDetailsHTML = orderDetails.map(detail => `
                        <tr>
                            <td style="padding: 15px;">
                                <img src="${detail.imagen_url}" alt="${detail.nombre}" style="max-width: 80px; border-radius: 5px; border: 1px solid #FFB6C1;">
                            </td>
                            <td style="padding: 15px; vertical-align: top;">
                                <strong style="color: #333; font-size: 18px;">${detail.nombre}</strong><br>
                                <span style="color: #888;">Cantidad: ${detail.cantidad}</span><br>
                                <span style="color: #888;">Precio: $${detail.precio}</span>
                            </td>
                        </tr>
                    `).join('');

                    // Preparar información de envío
                    let shippingInfoHTML;
                    if (order.direccion && order.ciudad && order.codigo_postal && order.pais) {
                        shippingInfoHTML = `
                            <div style="background-color: #FFF0F5; padding: 15px; border-radius: 8px; border-left: 5px solid #d783a6;">
                                <h3 style="color: #d783a6;">Información de Envío:</h3>
                                <p>Dirección: ${order.direccion}<br>
                                   Ciudad: ${order.ciudad}<br>
                                   Código Postal: ${order.codigo_postal}<br>
                                   País: ${order.pais}
                                </p>
                            </div>
                        `;
                    } else {
                        shippingInfoHTML = `
                            <div style="background-color: #FFF0F5; padding: 15px; border-radius: 8px; border-left: 5px solid #d783a6;">
                                <h3 style="color: #d783a6;">Recoger en Tienda:</h3>
                                <p>Por favor, recoge tu pedido en nuestra tienda.</p>
                                <p>Dirección: Thorne 1145<br>
                                    Horario: De Luenes a Viernes de 14hs a 20hs</p>
                            </div>
                        `;
                    }

                    // Preparar contenido del correo electrónico
                    let emailContentHTML = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                            <h2 style="color: #d783a6; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Confirmación de Pago - Fabiana Gimenez</h2>
                            <h3 style="color: #555;">¡Hola, ${order.nombre}!</h3>
                            <p>Tu pago ha sido aprobado. Aquí están los detalles de tu pedido:</p>
                            
                            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                                ${orderDetailsHTML}
                            </table>
                            
                            ${shippingInfoHTML}
                    
                            <p style="text-align: center; margin-top: 20px;">Gracias por tu compra. ¡Esperamos que disfrutes tus productos!</p>
                            <p style="text-align: center; color: #555;">Equipo de Fabiana Gimenez</p>
                        </div>
                    `;

                    // Enviar correo electrónico al cliente
                    sendEmail({
                        to: order.email,
                        subject: '✨ Tu pago ha sido aprobado en Fabiana Gimenez ✨',
                        html: emailContentHTML
                    });
                } else {
                    console.error('No se encontró la orden o la orden no tiene un email asociado.');
                }

                // Preparar y enviar correo electrónico al SEO
                let seoContentHTML = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #d783a6; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Notificación de Pago - Fabiana Gimenez</h2>
                        <p>Se ha recibido un nuevo comprobante de pago para la orden ${orderId}. Por favor, revisa el panel administrativo para más detalles.</p>
                        <p style="text-align: center; margin-top: 20px; color: #555;">Equipo de Fabiana Gimenez</p>
                    </div>
                `;

                sendEmail({
                    to: OWNER_EMAIL,
                    subject: 'Nuevo comprobante de pago recibido - Fabiana Gimenez',
                    html: seoContentHTML
                });

                res.json({
                    success: true,
                    message: 'Comprobante subido y actualizado con éxito',
                    filePath: receiptURL,
                    estado: 'Aprobado'
                });
            } else {
                console.error('No se pudo actualizar el comprobante en la base de datos.');
                res.status(500).json({ success: false, message: 'No se pudo actualizar el comprobante en la orden' });
            }
        } catch (error) {
            console.error("Error en la actualización del comprobante:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    } else {
        console.error('No se recibió ningún archivo.');
        res.status(400).json({ success: false, message: 'No se pudo subir el archivo' });
    }
},
    (err, req, res, next) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            console.error(`El archivo subido excede el tamaño máximo permitido (${err.limit} bytes)`);
            return res.status(400).json({ success: false, message: 'El archivo es demasiado grande. Por favor, sube un archivo que sea menor a 10MB.' });
        }
        next(err);
    });


router.post('/create', protectRoute(), async (req, res) => {


    try {

        const { total, nombre, email, telefono, productos } = req.body;
        const usuario_id = req.user.usuario_id;

        const orderId = await orderModel.createOrder(usuario_id, total, nombre, email, telefono);
        const newOrder = await orderModel.getOrderById(orderId);
        if (Array.isArray(productos)) {
            for (let producto of productos) {
                await orderDetailsModel.addOrderDetail(orderId, producto.id, producto.cantidad, producto.precio);
            }
        } else {
            return res.status(400).json({ error: "El campo 'productos' debe ser un array" });
        }

        res.status(201).json({ orderId });
    } catch (error) {
        console.error('Error detectado:', error);
        res.status(500).json({ error: "Error al crear la orden" });
    }
});


router.post('/create/shipping-info', protectRoute(), async (req, res) => {
    try {
        const { orden_id, metodo_envio, direccion, ciudad, estado, codigo_postal, pais } = req.body;

        if (!orden_id) {
            return res.status(400).json({ error: "orden_id es requerido" });
        }

        if (!metodo_envio) return res.status(400).json({ error: 'Por favor, selecciona un método de envío.' });

        if (metodo_envio === 'express') {
            // Validaciones para envío express
            if (!direccion) return res.status(400).json({ error: 'Por favor, ingresa una dirección.' });
            if (!ciudad) return res.status(400).json({ error: 'Por favor, ingresa una ciudad.' });
            if (!estado) return res.status(400).json({ error: 'Por favor, ingresa una Provincia.' });
            if (!codigo_postal) return res.status(400).json({ error: 'Por favor, ingresa un código postal.' });
            if (!pais) return res.status(400).json({ error: 'Por favor, ingresa un país.' });
        } else if (metodo_envio === 'recoger') {
            // Lógica para recoger en tienda (posiblemente no se requieran más campos)
        }

        const result = await orderModel.updateShippingInfo(orden_id, metodo_envio, direccion, ciudad, estado, codigo_postal, pais);

        if (result) {
            res.status(201).json({ success: true, message: "Información de envío actualizada con éxito" });
        } else {
            res.status(400).json({ success: false, message: "No se encontró una orden con el ID proporcionado o los datos ya están actualizados." });
        }
    } catch (error) {
        console.error('Error detectado al intentar actualizar datos de envío:', error);
        res.status(500).json({ error: error.message });
    }
});




router.get('/orders-by-status/:status', protectRoute(['admin']), async (req, res) => {
    try {
        const status = req.params.status;
        const sortByDate = req.query.sortByDate;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let orders;

        if (startDate && endDate) {
            orders = await orderModel.getOrdersByStatusAndDateRange(status, sortByDate, startDate, endDate);
        } else {
            orders = await orderModel.getOrdersByStatus(status, sortByDate);
        }

        for (let order of orders) {
            order.details = await orderDetailsModel.getOrderDetailsByOrderId(order.id);
        }


        res.json(orders);
    } catch (error) {
        console.error("Error detected in /orders-by-status/:status:", error);
        res.status(500).json({ error: "Error getting orders by status" });
    }
});

router.get('/user-orders', protectRoute(['user', 'admin']), async (req, res) => {

    try {
        const usuario_id = req.user.usuario_id;
        const rawOrders = await orderModel.getOrdersByUserId(usuario_id);


        const ordersWithDetails = [];

        for (let order of rawOrders) {
            const orderDetails = await orderDetailsModel.getOrderDetailsByOrderId(order.id);

            const orderWithDetails = {
                ...order,
                detalles: orderDetails,
                shippingInfo: {
                    direccion: order.direccion,
                    ciudad: order.ciudad,
                    estado: order.estado,
                    codigo_postal: order.codigo_postal,
                    pais: order.pais,
                }
            };

            ordersWithDetails.push(orderWithDetails);
        }

        const user = await orderModel.getUserById(usuario_id);

        res.json({ user, orders: ordersWithDetails });
    } catch (error) {
        console.error("Error detectado en /user-orders:", error);
        res.status(500).json({ error: "Error al obtener las órdenes del usuario" });
    }
});

router.get('/order-complete-info/:orderId', protectRoute(), async (req, res) => {
    try {
        const orden_id = req.params.orderId;
        const details = await orderDetailsModel.getOrderDetailsByOrderId(orden_id);
        const shippingInfo = await orderModel.getShippingInfoByOrderId(orden_id);

        res.json({ orderDetails: details, shippingInfo });
    } catch (error) {
        console.error("Error detectado en /order-complete-info/:orderId:", error);
        res.status(500).json({ error: "Error al obtener la información completa de la orden" });
    }
});



router.get('/shipping-info/:orderId', protectRoute(), async (req, res) => {
    try {
        const orden_id = req.params.orderId;
        const shippingInfo = await orderModel.getShippingInfoByOrderId(orden_id);
        res.json(shippingInfo);
    } catch (error) {
        console.error("Error detectado en /shipping-info/:orderId:", error);
        res.status(500).json({ error: "Error al obtener la información de envío" });
    }
});

router.get('/get-comprobante/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orderModel.getOrderById(orderId);
        if (order && order.comprobante_pago) {
            res.json({
                success: true,
                comprobante: order.comprobante_pago
            });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró comprobante para esta orden' });
        }
    } catch (error) {
        console.error("Error al recuperar el comprobante:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


router.delete("/order/:orderId", async (req, res) => {
    const orderId = req.params.orderId;
    const order = await orderModel.getOrderById(orderId);

    if (order.estado === "Activo" || order.estado === "Aprobado") {
        const orderDetails = await orderDetailsModel.getOrderDetailsByOrderId(orderId);
        for (const detail of orderDetails) {
            const product = await productModel.getProductById(detail.producto_id);
            const newStock = product.stock + detail.cantidad;
            await productModel.updateProductStock(detail.producto_id, newStock);
        }

        const io = req.app.get('io');
        io.emit('stock-updated');
    }

    await orderModel.deleteOrder(orderId);
    res.send({ message: "Orden eliminada correctamente." });
});
router.put('/update-status/:id', protectRoute(['admin']), async (req, res) => {
    const orderId = req.params.id;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ success: false, message: 'El estado es requerido.' });
    }

    try {
        const updated = await orderModel.updateOrderStatus(orderId, estado);
        if (updated) {
            const io = req.app.get('io');
            io.emit('order-status-updated', { orderId, estado });

            res.json({
                success: true,
                message: 'Estado de la orden actualizado con éxito',
                estado
            });
        } else {
            res.status(400).json({ success: false, message: 'No se pudo actualizar el estado de la orden.' });
        }
    } catch (error) {
        console.error("Error al actualizar el estado de la orden:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;
