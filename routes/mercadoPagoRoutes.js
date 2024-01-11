const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailServices');
const mercadopago = require('../config/configMercadoPago');
const orderModel = require('../models/ordenModel');
const orderDetailsModel = require('../models/detalleOrdenModel');
const productModel = require('../productModal/productModal');

router.get("/", (req, res) => {
    res.send("El servidor de MercadoPago funciona!");
});
const updateInventoryAfterApproval = async (orderId, req) => {
    const orderDetails = await orderDetailsModel.getOrderDetailsByOrderId(orderId);

    for (let detail of orderDetails) {
        const product = await productModel.getProductById(detail.producto_id);
        const newStock = product.stock - detail.cantidad;
        await productModel.updateProductStock(detail.producto_id, newStock);
    }
};


router.post('/create_preference', async (req, res) => {
    console.log("Datos recibidos para crear preferencia:", req.body);

    const { orden_id, total, datosUsuario, datosEnvio, productos } = req.body;

    if (!orden_id) {
        return res.status(400).json({ error: "No se proporcionó el ID de la orden." });
    }

    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron productos." });
    }

    if (!total || typeof total !== 'number') {
        return res.status(400).json({ error: "Total no proporcionado o no es un número." });
    }

    if (!datosUsuario || typeof datosUsuario !== 'object') {
        return res.status(400).json({ error: "Datos del usuario no proporcionados o no son válidos." });
    }

    if (!datosEnvio || typeof datosEnvio !== 'object') {
        return res.status(400).json({ error: "Datos de envío no proporcionados o no son válidos." });
    }

    try {
        const items = productos.map(producto => ({
            title: producto.nombre,
            unit_price: producto.precio,
            quantity: producto.cantidad,
            picture_url: producto.imagen_url

        }));

        const preference = {
            items,
            back_urls: {
                success: 'https://sofiaportafolio.online',
                failure: 'https://sofiaportafolio.online',
                pending: 'https://sofiaportafolio.online',
            },
            auto_return: 'approved',
            external_reference: String(orden_id)
        };
        console.log("Preferencia a enviar a MercadoPago:", preference);

        const response = await mercadopago.preferences.create(preference);
        console.log("Respuesta de MercadoPago:", response.body);

        res.json({ id: response.body.id, init_point: response.body.init_point });
    } catch (error) {
        console.error('Error:', error);
        console.error('Error al crear preferencia en MercadoPago:', error);
        res.status(400).json({ error: 'Error procesando la solicitud' });
    }
});
const OWNER_EMAIL = 'luciuknicolas15@gmail.com';

router.post("/notifications", async (req, res) => {



    const { type, data } = req.body;
    const id = data.id;

    try {
        if (type === "payment") {

            const paymentInfo = await mercadopago.payment.get(id);
            const externalReference = paymentInfo.body.external_reference;



            const order = await orderModel.getOrderByReference(externalReference);

            if (!order || !order.email) {
                console.error(`No se encontró una orden con el ID: ${paymentInfo.body.order.id} o la orden no tiene email asociado`);
                return res.status(400).send("Orden no encontrada o no tiene email asociado");
            }

            const userEmail = order.email;

            switch (paymentInfo.body.status) {
                case "approved":
                    await orderModel.updateOrderStatus(externalReference, "Aprobado");

                    const orderDetails = await orderDetailsModel.getOrderDetailsByOrderId(order.id);

                    let productDetailsHTML = orderDetails.map(detail => {
                        return `
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
                        `;
                    }).join('');

                    let emailContentHTML = `
                        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                            <h2 style="color: #FF69B4; text-align: center; border-bottom: 3px dotted #FFB6C1; padding-bottom: 15px;">Fabiana Gimenez</h2>
                            <h3 style="color: #FF69B4;">¡Hola, ${order.nombre}!</h3>
                            <p style="color: #555;">Estamos emocionados de informarte que tu pago ha sido aprobado. Aquí están los detalles de tu orden:</p>
                            
                            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                                ${productDetailsHTML}
                            </table>
                            
                            <div style="background-color: #FFF0F5; padding: 15px; border-radius: 8px; border-left: 5px solid #FF69B4;">
                                <h3 style="color: #FF69B4;">Información de envío:</h3>
                                <p style="color: #555;">
                                    Dirección: ${order.direccion}<br>
                                    Ciudad: ${order.ciudad}<br>
                                    Código Postal: ${order.codigo_postal}<br>
                                    País: ${order.pais}
                                </p>
                            </div>
                
                            <p style="color: #555; text-align: center; margin-top: 20px;">¡Gracias por elegir Fabiana Gimenez! Esperamos verte pronto.</p>
                        </div>
                    `;

                    sendEmail({
                        to: userEmail,
                        subject: '✨ Tu pago ha sido aprobado en Fabiana Gimenez ✨',
                        html: emailContentHTML
                    });

                    sendEmail({
                        to: OWNER_EMAIL,
                        subject: '🎉 Un pago se ha concretado en Fabiana Gimenez 🎉',
                        html: emailContentHTML
                    });

                    await updateInventoryAfterApproval(externalReference, req);
                    break;



                case "pending":
                    await orderModel.updateOrderStatus(paymentInfo.body.order.id, "PENDING");

                    let emailContentPending = `
                            <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                                <h2 style="color: #FFD700; text-align: center; border-bottom: 3px dotted #FFE4B5; padding-bottom: 15px;">Fabiana Gimenez</h2>
                                <h3 style="color: #FFD700;">¡Hola, ${order.nombre}!</h3>
                                <p style="color: #555;">Hemos recibido tu solicitud de pago, pero aún está pendiente. Te notificaremos una vez que se procese.</p>
                                <p style="color: #555; text-align: center; margin-top: 20px;">Gracias por tu paciencia y confianza en Fabiana Gimenez.</p>
                            </div>
                        `;

                    sendEmail({
                        to: userEmail,
                        subject: '🔸 Tu pago está pendiente en Fabiana Gimenez 🔸',
                        html: emailContentPending
                    });
                    break;

                case "rejected":
                    await orderModel.updateOrderStatus(paymentInfo.body.order.id, "REJECTED");

                    let emailContentRejected = `
                            <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
                                <h2 style="color: #FF6347; text-align: center; border-bottom: 3px dotted #FFA07A; padding-bottom: 15px;">Fabiana Gimenez</h2>
                                <h3 style="color: #FF6347;">¡Hola, ${order.nombre}!</h3>
                                <p style="color: #555;">Lamentamos informarte que tu pago ha sido rechazado. Por favor, verifica tus datos y reintenta. Si el problema persiste, ponte en contacto con tu banco o entidad financiera.</p>
                                <p style="color: #555; text-align: center; margin-top: 20px;">Agradecemos tu comprensión y estamos aquí para ayudarte. ¡No dudes en contactarnos!</p>
                            </div>
                        `;

                    sendEmail({
                        to: userEmail,
                        subject: '❌ Tu pago ha sido rechazado en Fabiana Gimenez ❌',
                        html: emailContentRejected
                    });
                    break;

                default:
                    console.warn(`Estado de pago no manejado: ${paymentInfo.body.status}`);
            }
        } else {
            console.warn(`[notifications] Tipo de notificación no manejado: ${type}`);
        }

        res.status(200).send();
    } catch (error) {
        console.error("Error al procesar la notificación:", error);
        res.status(500).send("Error interno del servidor");
    }
});

module.exports = router;
