const express = require('express');
const router = express.Router();
const productModel = require('../productModal/productModal');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/useModel');

require('dotenv').config();


const nlp = require('compromise');

const CATEGORIAS = ["Ojos", "Rostro", "Labios", "Uñas"];

router.post('/search', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'Consulta de búsqueda requerida.' });
    }

    try {
        const doc = nlp(query);
        let category = null;

        // Buscar coincidencias de categoría en la consulta
        CATEGORIAS.forEach(cat => {
            if (doc.has(cat)) {
                category = cat;
            }
        });

        // Si no se encuentra una categoría específica, extraer palabras clave
        const keywords = category ? [category] : doc.nouns().out('array');

        const products = await productModel.searchProducts(keywords.join(' '), category);

        if (products.length > 0) {
            res.json({
                message: 'Productos encontrados:',
                data: products.map(product => ({
                    id: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    marca: product.marca,
                    categoria: product.categoria,
                    imagen_url: product.imagen_url
                }))
            });
        } else {
            res.status(404).json({ message: 'No se encontraron productos que coincidan con la consulta.' });
        }
    } catch (error) {
        console.error('Error en la búsqueda de productos:', error);
        res.status(500).json({ message: 'Error interno al buscar productos.' });
    }
});





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

// Ruta para actualizar todos los precios por un porcentaje
router.put('/update-prices', verifyAdminRole, async (req, res) => {
    const { percentage } = req.body;
    try {
        await productModel.updateAllPrices(percentage);
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando los precios se actualizan
        res.status(200).json({ message: 'Precios actualizados exitosamente' });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar los precios" });
    }
});

// Ruta para revertir los precios al último porcentaje aplicado
router.put('/revert-last-percentage', verifyAdminRole, async (req, res) => {
    try {
        await productModel.revertLastPercentage();
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando los precios se revierten
        res.status(200).json({ message: 'Precios revertidos al último porcentaje aplicado' });
    } catch (error) {
        res.status(500).json({ message: "Error al revertir los precios" });
    }
});


// Ruta para ajustar los precios al porcentaje anterior
router.put('/adjust-prices', verifyAdminRole, async (req, res) => {
    const { previousPercentage } = req.body;
    try {
        await productModel.adjustPricesToPreviousPercentage(previousPercentage);
        res.status(200).json({ message: 'Precios ajustados al porcentaje anterior' });
    } catch (error) {
        res.status(500).json({ message: "Error al ajustar los precios" });
    }
});

// Ruta para revertir y aplicar un nuevo porcentaje
router.put('/revert-and-apply-percentage', verifyAdminRole, async (req, res) => {
    const { newPercentage } = req.body;
    try {
        await productModel.revertAndApplyNewPercentage(newPercentage);
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando se aplica el nuevo porcentaje
        res.status(200).json({ message: 'Precios revertidos y nuevo porcentaje aplicado' });
    } catch (error) {
        res.status(500).json({ message: "Error al revertir y aplicar el nuevo porcentaje" });
    }
});


// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../db/image/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ruta para obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await productModel.getAllProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los productos" });
    }
});

// Ruta para crear un nuevo producto
router.post('/', upload.single('imagen_url'), verifyAdminRole, async (req, res) => {
    const { nombre, descripcion, precio, stock, marca, color, categoria } = req.body;
    const imagenPath = '/image/' + req.file.filename;

    try {
        const newProductId = await productModel.createProduct(nombre, descripcion, precio, stock, imagenPath, marca, color, null, categoria);
        const io = req.app.get('io');
        io.emit('product-added', newProductId);
        res.status(201).json({ id: newProductId, message: 'Producto creado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el producto" });
    }
});

// Ruta para editar un producto existente
router.put('/:id', upload.single('imagen'), verifyAdminRole, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, marca, color, categoria } = req.body;

    // Se construye la ruta de la imagen de manera relativa, similar a la ruta POST.
    const imagenPath = req.file ? '/image/' + req.file.filename : undefined;

    try {
        await productModel.updateProduct(id, nombre, descripcion, precio, stock, imagenPath, marca, color, categoria);
        const updatedProduct = await productModel.getProductById(id);
        const io = req.app.get('io');
        io.emit('product-updated', updatedProduct);
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el producto" });
    }
});

router.put('/product-detail-update/:id', verifyAdminRole, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen_url, marca, color, categoria } = req.body;
    try {

        await productModel.updateProductDetail(id, nombre, descripcion, precio, stock, imagen_url, marca, color, categoria);
        const justUpdatedProduct = await productModel.getProductById(id);

        const updatedProductDetail = await productModel.getProductById(id);
        const io = req.app.get('io');

        io.emit('product-detail-updated', updatedProductDetail);  // Emitir evento de detalles del producto actualizado
        res.status(200).json(updatedProductDetail);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar los detalles del producto" });
    }
});

// Ruta para eliminar un producto existente
router.delete('/:id', verifyAdminRole, async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await productModel.deleteProduct(id);
        if (deleted) {
            const io = req.app.get('io');
            io.emit('product-deleted', id);  // Emitir evento de producto eliminado
            res.status(200).json({ message: 'Producto eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el producto" });
    }
});
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await productModel.getProductById(id);
        if (!product) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el producto" });
    }
});



module.exports = router;